import { describe, expect, it } from 'vitest'
import { addClip, addTextClip, clipDur, setSpeed, splitClip, trimEnd, trimStart } from '../timeline/ops'
import { pickClips, transitionDur, visibleClips } from '../timeline/pick'
import type { Asset, Clip, Project } from '../types'
import { animDelta, fxOf, hasKfAt, loopDelta, resolveClip, upsertKf, valueAt, withProp } from './anim'
import { DEFAULT_TEXT } from './catalog'

const video: Asset = { id: 'av', name: 'v.mp4', kind: 'video', duration: 10, width: 1920, height: 1080 }
const base = (): Project => ({
  name: 't', ratio: '16:9', assets: [video],
  tracks: [
    { id: 't1', kind: 'text', name: 'T', muted: false, hidden: false },
    { id: 'v1', kind: 'video', name: 'V1', muted: false, hidden: false },
  ],
  clips: [],
})
const withClip = () => addClip(base(), video, 'v1', 0, 'c1')!
const clipOf = (p: Project, id: string) => p.clips.find((c) => c.id === id) as Clip

describe('keyframe', () => {
  const kfs = [{ t: 0, v: 0 }, { t: 2, v: 10 }, { t: 4, v: 0 }]
  it('nội suy giữa hai khung chính', () => {
    expect(valueAt(kfs, 1, 99)).toBe(5)
    expect(valueAt(kfs, 3, 99)).toBe(5)
  })
  it('giữ giá trị đầu/cuối khi ở ngoài khoảng', () => {
    expect(valueAt(kfs, -5, 99)).toBe(0)
    expect(valueAt(kfs, 9, 99)).toBe(0)
  })
  it('không có khung chính thì dùng giá trị gốc', () => {
    expect(valueAt(undefined, 1, 7)).toBe(7)
    expect(valueAt([], 1, 7)).toBe(7)
  })
  it('thêm khung chính giữ thứ tự và ghi đè khi trùng', () => {
    const l = upsertKf(kfs, 1, 3)
    expect(l.map((k) => k.t)).toEqual([0, 1, 2, 4])
    expect(upsertKf(l, 1.01, 8)[1].v).toBe(8)
    expect(hasKfAt(l, 1.02)).toBe(true)
  })
  it('withProp: không có keyframe thì sửa giá trị gốc, có thì thêm keyframe', () => {
    let p = withProp(withClip(), 'c1', 'x', 0.3, 1)
    expect(fxOf(clipOf(p, 'c1')).x).toBe(0.3)
    p = { ...p, clips: p.clips.map((c) => ({ ...c, kfs: { x: [{ t: 0, v: 0 }] } })) }
    p = withProp(p, 'c1', 'x', 0.5, 2)
    expect(clipOf(p, 'c1').kfs!.x).toEqual([{ t: 0, v: 0 }, { t: 2, v: 0.5 }])
  })
  it('tách clip giữ giá trị keyframe hai bên chỗ cắt', () => {
    let p = withClip()
    p = { ...p, clips: p.clips.map((c) => ({ ...c, kfs: { scale: [{ t: 0, v: 1 }, { t: 10, v: 2 }] } })) }
    p = splitClip(p, 'c1', 5, 'c2')!
    const left = clipOf(p, 'c1')
    const right = clipOf(p, 'c2')
    expect(valueAt(left.kfs!.scale, 5, 0)).toBeCloseTo(1.5)
    expect(valueAt(right.kfs!.scale, 0, 0)).toBeCloseTo(1.5)
    expect(valueAt(right.kfs!.scale, 5, 0)).toBeCloseTo(2)
  })
  it('cắt đầu clip dịch keyframe theo', () => {
    let p = withClip()
    p = { ...p, clips: p.clips.map((c) => ({ ...c, kfs: { x: [{ t: 4, v: 1 }] } })) }
    p = trimStart(p, 'c1', 3)
    expect(clipOf(p, 'c1').kfs!.x![0].t).toBe(1)
  })
})

describe('hoạt ảnh', () => {
  it('vào: bắt đầu ẩn, kết thúc hiện đủ', () => {
    for (const id of ['fade', 'zoomIn', 'pop', 'spin', 'slideL']) {
      expect(animDelta(id, 0).aMul).toBeLessThanOrEqual(0.01)
      const end = animDelta(id, 1)
      expect(end.aMul).toBeCloseTo(1)
      expect(end.sMul).toBeCloseTo(1)
      expect(end.dx).toBeCloseTo(0)
      expect(end.dr).toBeCloseTo(0)
    }
  })
  it('hoạt ảnh lặp dao động quanh vị trí gốc', () => {
    expect(loopDelta('float', 0).dy).toBeCloseTo(0)
    expect(loopDelta('pulse', 0.1).sMul).not.toBe(1)
  })
  it('resolveClip áp hoạt ảnh vào ở đầu clip và ra ở cuối clip', () => {
    let p = withClip()
    p = { ...p, clips: p.clips.map((c) => ({ ...c, fx: { animIn: { id: 'fade', dur: 1 }, animOut: { id: 'fade', dur: 1 } } })) }
    const c = clipOf(p, 'c1')
    expect(resolveClip(c, 0).aMul).toBeLessThan(0.01)
    expect(resolveClip(c, 5).aMul).toBe(1)
    expect(resolveClip(c, 10).aMul).toBeLessThan(0.01)
  })
  it('tách clip: hoạt ảnh vào ở nửa đầu, ra ở nửa sau', () => {
    let p = withClip()
    p = { ...p, clips: p.clips.map((c) => ({ ...c, fx: { animIn: { id: 'fade', dur: 1 }, animOut: { id: 'fade', dur: 1 } } })) }
    p = splitClip(p, 'c1', 5, 'c2')!
    expect(fxOf(clipOf(p, 'c1')).animOut).toBeNull()
    expect(fxOf(clipOf(p, 'c1')).animIn).not.toBeNull()
    expect(fxOf(clipOf(p, 'c2')).animIn).toBeNull()
    expect(fxOf(clipOf(p, 'c2')).animOut).not.toBeNull()
  })
})

describe('clip chữ', () => {
  it('chỉ đặt được vào dòng chữ', () => {
    expect(addTextClip(base(), 'v1', 0, 'x', DEFAULT_TEXT)).toBeNull()
    const p = addTextClip(base(), 't1', 1, 'x', DEFAULT_TEXT)!
    expect(clipDur(clipOf(p, 'x'))).toBe(3)
    expect(clipOf(p, 'x').start).toBe(1)
  })
  it('kéo dài mép phải được (không có file gốc giới hạn)', () => {
    let p = addTextClip(base(), 't1', 0, 'x', DEFAULT_TEXT)!
    p = trimEnd(p, 'x', 30)
    expect(clipDur(clipOf(p, 'x'))).toBe(30)
  })
  it('tách clip chữ vẫn giữ nội dung', () => {
    const p = splitClip(addTextClip(base(), 't1', 0, 'x', DEFAULT_TEXT)!, 'x', 1, 'y')!
    expect(clipOf(p, 'y').text?.text).toBe(DEFAULT_TEXT.text)
  })
})

describe('chuyển cảnh', () => {
  const twoClips = () => {
    let p = addClip(base(), video, 'v1', 0, 'a')!
    p = trimEnd(p, 'a', 4)
    p = addClip(p, video, 'v1', 4, 'b')!
    p = { ...p, clips: p.clips.map((c) => (c.id === 'b' ? { ...c, fx: { transition: { id: 'fade', dur: 1 } } } : c)) }
    return p
  }
  it('vùng chuyển cảnh nằm hai bên chỗ nối', () => {
    const p = twoClips()
    const k = pickClips(p, 'v1', 3.8)!
    expect(k.a?.id).toBe('a')
    expect(k.b.id).toBe('b')
    expect(k.prog).toBeCloseTo(0.3)
    expect(pickClips(p, 'v1', 4.2)!.a?.id).toBe('a')
  })
  it('ngoài vùng chuyển cảnh thì chỉ một clip', () => {
    const p = twoClips()
    expect(pickClips(p, 'v1', 2)!.a).toBeUndefined()
    expect(pickClips(p, 'v1', 2)!.b.id).toBe('a')
    expect(pickClips(p, 'v1', 6)!.b.id).toBe('b')
  })
  it('trong vùng chuyển cảnh cả hai clip đều cần có hình', () => {
    expect(visibleClips(twoClips(), 4.1).map((c) => c.id).sort()).toEqual(['a', 'b'])
  })
  it('không có chuyển cảnh nếu hai clip không sát nhau', () => {
    let p = twoClips()
    p = { ...p, clips: p.clips.map((c) => (c.id === 'b' ? { ...c, start: 6 } : c)) }
    expect(pickClips(p, 'v1', 4)).toBeNull()
    expect(pickClips(p, 'v1', 6.1)!.a).toBeUndefined()
  })
  it('độ dài chuyển cảnh không vượt quá clip ngắn', () => {
    const p = twoClips()
    expect(transitionDur(clipOf(p, 'a'), clipOf(p, 'b'), 99)).toBeCloseTo(3.6)
  })
  it('dòng bị ẩn thì không cần hình', () => {
    const p = twoClips()
    expect(visibleClips({ ...p, tracks: p.tracks.map((t) => ({ ...t, hidden: true })) }, 1)).toEqual([])
  })
})

describe('tốc độ + keyframe', () => {
  it('đổi tốc độ không làm mất hiệu ứng', () => {
    let p = withClip()
    p = { ...p, clips: p.clips.map((c) => ({ ...c, fx: { filter: 'bw' } })) }
    expect(fxOf(clipOf(setSpeed(p, 'c1', 2), 'c1')).filter).toBe('bw')
  })
})
