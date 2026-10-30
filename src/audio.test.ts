import { describe, expect, it } from 'vitest'
import { findSilences, loudnessDb, encodeWav } from './audio'
import { parseSrt, srtTime, toSrt } from './captions/srt'
import { tighten } from './captions/transcribe'
import { wrapCaption } from './fx/templates'
import { volumeAt } from './fx/anim'
import { addClip, clipDur, clipEnd, removeRanges } from './timeline/ops'
import type { Asset, Clip, Project } from './types'

/** Tạo "âm thanh giả": 1 giây có tiếng, 1 giây lặng, 1 giây có tiếng (tần số mẫu 1000). */
const fakeBuf = (): AudioBuffer => {
  const sr = 1000
  const data = new Float32Array(sr * 3)
  for (let i = 0; i < data.length; i++) data[i] = i >= sr && i < 2 * sr ? 0 : Math.sin(i / 3) * 0.5
  return { sampleRate: sr, length: data.length, getChannelData: () => data } as unknown as AudioBuffer
}

describe('âm thanh', () => {
  it('tìm đúng đoạn lặng ở giữa', () => {
    const s = findSilences(fakeBuf(), 0, 3, -40, 0.5)
    expect(s).toHaveLength(1)
    expect(s[0][0]).toBeCloseTo(1, 1)
    expect(s[0][1]).toBeCloseTo(2, 1)
  })
  it('bỏ qua đoạn lặng ngắn hơn mức tối thiểu', () => {
    expect(findSilences(fakeBuf(), 0, 3, -40, 1.5)).toEqual([])
  })
  it('đo độ to chỉ tính phần có tiếng', () => {
    const db = loudnessDb(fakeBuf(), 0, 3)
    expect(db).toBeGreaterThan(-12)
    expect(db).toBeLessThan(-6)
  })
  it('file WAV có đúng phần đầu và độ dài', async () => {
    const blob = encodeWav([new Float32Array(100)], 44100)
    expect(blob.size).toBe(44 + 200)
    const head = new TextDecoder().decode(await blob.slice(0, 4).arrayBuffer())
    expect(head).toBe('RIFF')
  })
})

describe('cắt khoảng lặng (removeRanges)', () => {
  const video: Asset = { id: 'av', name: 'v', kind: 'video', duration: 10, width: 1, height: 1 }
  const base = (): Project => ({
    name: 't', ratio: '16:9', assets: [video],
    tracks: [{ id: 'v1', kind: 'video', name: 'V1', muted: false, hidden: false }],
    clips: [],
  })
  let n = 0
  const id = () => `n${++n}`

  it('nối liền các đoạn còn lại và kéo lùi clip phía sau', () => {
    let p = addClip(base(), video, 'v1', 0, 'a')!
    p = addClip(p, video, 'v1', 10, 'b')!
    const r = removeRanges(p, 'a', [[2, 4], [6, 7]], id)!
    const parts = r.clips.filter((c) => c.trackId === 'v1' && c.id !== 'b').sort((x, y) => x.start - y.start)
    expect(parts).toHaveLength(3) // 0-2, 4-6, 7-10
    expect(parts.map((c) => [c.inPoint, c.outPoint])).toEqual([[0, 2], [4, 6], [7, 10]])
    expect(parts[1].start).toBeCloseTo(2)
    expect(parts[2].start).toBeCloseTo(4)
    expect(clipEnd(parts[2])).toBeCloseTo(7)
    expect(r.clips.find((c) => c.id === 'b')!.start).toBeCloseTo(7) // kéo lùi 3 giây
  })
  it('không có đoạn nào hợp lệ thì trả null', () => {
    const p = addClip(base(), video, 'v1', 0, 'a')!
    expect(removeRanges(p, 'a', [], id)).toBeNull()
  })
  it('bỏ cả clip nếu cắt hết', () => {
    const p = addClip(base(), video, 'v1', 0, 'a')!
    expect(removeRanges(p, 'a', [[0, 10]], id)!.clips).toHaveLength(0)
  })
  it('tính đúng khi clip đang đổi tốc độ', () => {
    let p = addClip(base(), video, 'v1', 0, 'a')!
    p = { ...p, clips: p.clips.map((c) => ({ ...c, speed: 2 })) }
    const r = removeRanges(p, 'a', [[4, 6]], id)!
    expect(r.clips.reduce((s, c) => s + clipDur(c), 0)).toBeCloseTo(4) // (10-2)/2
  })
})

describe('căn lại thời gian phụ đề', () => {
  it('đẩy mốc bắt đầu tới lúc thực sự có tiếng', () => {
    const sr = 16000
    const a = new Float32Array(sr * 6) // 3 giây lặng rồi 2 giây có tiếng
    for (let i = sr * 3; i < sr * 5; i++) a[i] = Math.sin(i / 5) * 0.4
    const r = tighten({ start: 0, end: 6, text: 'x' }, a, 6)
    expect(r.start).toBeGreaterThan(2.8)
    expect(r.start).toBeLessThan(3.1)
    expect(r.end).toBeGreaterThan(5)
    expect(r.end).toBeLessThan(5.4)
  })
  it('giữ nguyên nếu không có tiếng', () => {
    const it = { start: 1, end: 2, text: 'x' }
    expect(tighten(it, new Float32Array(16000 * 3), 3)).toEqual(it)
  })
})

describe('mờ dần âm lượng', () => {
  const c: Clip = { id: 'c', assetId: 'x', trackId: 't', start: 0, inPoint: 0, outPoint: 10, speed: 1, volume: 0.8, muted: false, fadeIn: 2, fadeOut: 2 }
  it('nhỏ ở hai đầu, đủ ở giữa', () => {
    expect(volumeAt(c, 0)).toBe(0)
    expect(volumeAt(c, 1)).toBeCloseTo(0.4)
    expect(volumeAt(c, 5)).toBeCloseTo(0.8)
    expect(volumeAt(c, 9)).toBeCloseTo(0.4)
    expect(volumeAt(c, 10)).toBeCloseTo(0)
  })
})

describe('phụ đề .srt', () => {
  const sample = '1\n00:00:01,000 --> 00:00:03,500\nXin chào\nCác bạn\n\n2\n00:01:05,250 --> 00:01:07,000\n<i>Tạm biệt</i>\n'
  it('đọc file srt', () => {
    const items = parseSrt(sample)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ start: 1, end: 3.5, text: 'Xin chào\nCác bạn' })
    expect(items[1].start).toBeCloseTo(65.25)
    expect(items[1].text).toBe('Tạm biệt')
  })
  it('đọc được file có BOM và xuống dòng kiểu Windows', () => {
    expect(parseSrt('﻿' + sample.replace(/\n/g, '\r\n'))).toHaveLength(2)
  })
  it('bỏ qua rác, không báo lỗi', () => {
    expect(parseSrt('hello world')).toEqual([])
  })
  it('định dạng thời gian', () => {
    expect(srtTime(3725.5)).toBe('01:02:05,500')
  })
  it('xuất rồi nhập lại ra cùng nội dung', () => {
    const clips: Clip[] = parseSrt(sample).map((it, i) => ({
      id: String(i), assetId: '', trackId: 'cap', start: it.start, inPoint: 0, outPoint: it.end - it.start, speed: 1, volume: 1, muted: true, cap: true,
      text: { text: it.text, font: 'x', size: 1, color: '', bold: false, italic: false, align: 'center', strokeColor: '', strokeW: 0, shadow: null, bg: null },
    }))
    const back = parseSrt(toSrt(clips))
    expect(back.map((b) => b.text)).toEqual(['Xin chào\nCác bạn', 'Tạm biệt'])
    expect(back[1].end).toBeCloseTo(67)
  })
  it('ngắt dòng phụ đề dài', () => {
    const w = wrapCaption('một hai ba bốn năm sáu bảy tám chín mười mười một mười hai', 20)
    expect(w.split('\n').every((l) => l.length <= 20)).toBe(true)
    expect(w.replace(/\n/g, ' ')).toBe('một hai ba bốn năm sáu bảy tám chín mười mười một mười hai')
  })
})
