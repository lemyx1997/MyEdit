import { describe, expect, it } from 'vitest'
import type { Asset, Project } from '../types'
import {
  addClip, clipDur, clipEnd, deleteClip, duplicateClip, moveClip, overlaps,
  projectDuration, setSpeed, snapMove, snapPoint, splitClip, trimEnd, trimStart,
} from './ops'

const video: Asset = { id: 'av', name: 'v.mp4', kind: 'video', duration: 10, width: 1920, height: 1080 }
const audio: Asset = { id: 'aa', name: 'a.mp3', kind: 'audio', duration: 20, width: 0, height: 0 }
const image: Asset = { id: 'ai', name: 'i.png', kind: 'image', duration: 0, width: 100, height: 100 }

const base = (): Project => ({
  name: 't', ratio: '16:9', assets: [video, audio, image],
  tracks: [
    { id: 'v1', kind: 'video', name: 'V1', muted: false, hidden: false },
    { id: 'v2', kind: 'video', name: 'V2', muted: false, hidden: false },
    { id: 'a1', kind: 'audio', name: 'A1', muted: false, hidden: false },
  ],
  clips: [],
})

const withClip = () => addClip(base(), video, 'v1', 0, 'c1')!

describe('addClip', () => {
  it('đặt clip video vào dòng video', () => {
    const p = withClip()
    expect(p.clips).toHaveLength(1)
    expect(clipDur(p.clips[0])).toBe(10)
  })
  it('từ chối nhạc ở dòng video và ngược lại', () => {
    expect(addClip(base(), audio, 'v1', 0, 'x')).toBeNull()
    expect(addClip(base(), video, 'a1', 0, 'x')).toBeNull()
  })
  it('ảnh mặc định dài 5 giây', () => {
    expect(clipDur(addClip(base(), image, 'v1', 0, 'x')!.clips[0])).toBe(5)
  })
  it('tự đẩy sang chỗ trống nếu bị trùng', () => {
    const p = addClip(withClip(), video, 'v1', 3, 'c2')!
    expect(p.clips[1].start).toBe(10)
  })
})

describe('splitClip', () => {
  it('tách làm hai đoạn liền nhau', () => {
    const p = splitClip(withClip(), 'c1', 4, 'c2')!
    const [a, b] = p.clips
    expect(a.outPoint).toBe(4)
    expect(b.start).toBe(4)
    expect(b.inPoint).toBe(4)
    expect(clipEnd(a)).toBe(b.start)
    expect(projectDuration(p)).toBe(10)
  })
  it('tính đúng khi clip đang đổi tốc độ', () => {
    let p = setSpeed(withClip(), 'c1', 2) // dài 5 giây trên timeline
    p = splitClip(p, 'c1', 2, 'c2')!
    expect(p.clips[0].outPoint).toBe(4) // 2 giây timeline = 4 giây file gốc
    expect(p.clips[1].inPoint).toBe(4)
  })
  it('không tách sát mép', () => {
    expect(splitClip(withClip(), 'c1', 0, 'c2')).toBeNull()
    expect(splitClip(withClip(), 'c1', 10, 'c2')).toBeNull()
    expect(splitClip(withClip(), 'c1', 0.05, 'c2')).toBeNull()
  })
})

describe('trim', () => {
  it('cắt đầu làm mất phần đầu file gốc', () => {
    const p = trimStart(withClip(), 'c1', 3)
    expect(p.clips[0].start).toBe(3)
    expect(p.clips[0].inPoint).toBe(3)
    expect(clipEnd(p.clips[0])).toBe(10)
  })
  it('không kéo mép trái ra khỏi đầu file gốc', () => {
    const p = trimStart(moveClip(withClip(), 'c1', 5, 'v1')!, 'c1', 0)
    expect(p.clips[0].start).toBe(5)
  })
  it('cắt cuối', () => {
    const p = trimEnd(withClip(), 'c1', 6)
    expect(p.clips[0].outPoint).toBe(6)
  })
  it('không kéo dài quá file gốc', () => {
    expect(trimEnd(withClip(), 'c1', 99).clips[0].outPoint).toBe(10)
  })
  it('không đè lên clip kế bên', () => {
    let p = trimEnd(withClip(), 'c1', 4)
    p = addClip(p, video, 'v1', 6, 'c2')!
    p = trimEnd(p, 'c1', 9)
    expect(clipEnd(p.clips[0])).toBe(6)
  })
  it('giữ độ dài tối thiểu', () => {
    expect(clipDur(trimEnd(withClip(), 'c1', 0).clips[0])).toBeCloseTo(0.1)
  })
})

describe('moveClip', () => {
  it('di chuyển sang dòng video khác', () => {
    expect(moveClip(withClip(), 'c1', 2, 'v2')!.clips[0].trackId).toBe('v2')
  })
  it('không cho sang dòng khác loại', () => {
    expect(moveClip(withClip(), 'c1', 0, 'a1')).toBeNull()
  })
  it('không cho đè lên clip khác', () => {
    const p = addClip(withClip(), video, 'v1', 10, 'c2')!
    expect(moveClip(p, 'c2', 5, 'v1')).toBeNull()
    expect(overlaps(p, 'v1', 5, 8, 'c2')).toBe(true)
  })
  it('không cho âm vị trí', () => {
    expect(moveClip(withClip(), 'c1', -5, 'v1')!.clips[0].start).toBe(0)
  })
})

describe('setSpeed', () => {
  it('nhanh gấp đôi thì ngắn một nửa', () => {
    expect(clipDur(setSpeed(withClip(), 'c1', 2).clips[0])).toBe(5)
  })
  it('giới hạn 0.1x đến 10x', () => {
    expect(setSpeed(withClip(), 'c1', 100).clips[0].speed).toBe(10)
    expect(setSpeed(withClip(), 'c1', 0).clips[0].speed).toBe(0.1)
  })
  it('chậm đi không được đè clip kế bên', () => {
    let p = addClip(withClip(), video, 'v1', 10, 'c2')!
    p = trimEnd(p, 'c1', 10)
    p = setSpeed(p, 'c1', 0.5)
    expect(clipEnd(p.clips[0])).toBeLessThanOrEqual(p.clips[1].start + 1e-9)
  })
})

describe('duplicate / delete', () => {
  it('nhân đôi đặt ngay sau bản gốc', () => {
    const p = duplicateClip(withClip(), 'c1', 'c2')!
    expect(p.clips[1].start).toBe(10)
  })
  it('xoá clip', () => {
    expect(deleteClip(withClip(), 'c1').clips).toHaveLength(0)
  })
})

describe('snap', () => {
  it('hít vào mốc gần', () => {
    expect(snapPoint(4.95, [5, 8], 0.2)).toBe(5)
    expect(snapPoint(4.5, [5, 8], 0.2)).toBe(4.5)
  })
  it('hít cả đầu và cuối clip', () => {
    expect(snapMove(2.9, 2, [5], 0.2)).toBeCloseTo(3) // cuối clip (4.9) hít vào 5
  })
})
