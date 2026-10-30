import { shiftKfs, upsertKf, valueAt } from '../fx/anim'
import type { Asset, Clip, KfProp, Project, TextProps } from '../types'

// Các phép chỉnh sửa timeline thuần tuý: nhận Project cũ, trả Project mới (hoặc null nếu không hợp lệ).
// Không phụ thuộc giao diện nên kiểm thử được dễ dàng.

export const MIN_DUR = 0.1
export const IMAGE_DEFAULT = 5
export const IMAGE_MAX = 3600
export const MIN_SPEED = 0.1
export const MAX_SPEED = 10
const EPS = 1e-6

export const clipDur = (c: Clip) => (c.outPoint - c.inPoint) / c.speed
export const clipEnd = (c: Clip) => c.start + clipDur(c)
export const projectDuration = (p: Project) => p.clips.reduce((m, c) => Math.max(m, clipEnd(c)), 0)
export const maxOut = (a: Asset | undefined) => (!a ? 0 : a.kind === 'image' ? IMAGE_MAX : a.duration)
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const others = (p: Project, trackId: string, ignoreId?: string) =>
  p.clips.filter((c) => c.trackId === trackId && c.id !== ignoreId)

const replace = (p: Project, id: string, fn: (c: Clip) => Clip): Project => ({
  ...p,
  clips: p.clips.map((c) => (c.id === id ? fn(c) : c)),
})

export function overlaps(p: Project, trackId: string, start: number, end: number, ignoreId?: string) {
  return others(p, trackId, ignoreId).some((c) => start < clipEnd(c) - EPS && end > c.start + EPS)
}

/** Vị trí trống đầu tiên (từ `start` trở đi) trên dòng, đủ chỗ cho clip dài `dur`. */
export function findFreeStart(p: Project, trackId: string, start: number, dur: number, ignoreId?: string) {
  let s = Math.max(0, start)
  const list = others(p, trackId, ignoreId).sort((a, b) => a.start - b.start)
  for (const c of list) {
    if (s < clipEnd(c) - EPS && s + dur > c.start + EPS) s = clipEnd(c)
  }
  return s
}

export function addClip(p: Project, asset: Asset, trackId: string, start: number, id: string): Project | null {
  const track = p.tracks.find((t) => t.id === trackId)
  const need = asset.kind === 'audio' ? 'audio' : 'video'
  if (!track || track.kind !== need) return null
  const dur = asset.kind === 'image' ? IMAGE_DEFAULT : asset.duration
  if (!(dur > 0)) return null
  const clip: Clip = {
    id, assetId: asset.id, trackId,
    start: findFreeStart(p, trackId, start, dur),
    inPoint: 0, outPoint: dur, speed: 1, volume: 1, muted: false,
  }
  return { ...p, clips: [...p.clips, clip] }
}

export function splitClip(p: Project, id: string, t: number, newId: string): Project | null {
  const c = p.clips.find((x) => x.id === id)
  if (!c || !(t > c.start + MIN_DUR && t < clipEnd(c) - MIN_DUR)) return null
  const src = c.inPoint + (t - c.start) * c.speed
  const cut = t - c.start // vị trí cắt tính từ đầu clip (trên timeline)
  let leftKfs = c.kfs
  let rightKfs = c.kfs
  if (c.kfs) {
    // giữ nguyên giá trị hai bên chỗ cắt: thêm khung chính ở mép cắt
    leftKfs = {}
    rightKfs = {}
    for (const k of Object.keys(c.kfs) as KfProp[]) {
      const list = c.kfs[k]!
      const v = valueAt(list, cut, 0)
      leftKfs[k] = upsertKf(list.filter((x) => x.t < cut), cut, v)
      rightKfs[k] = upsertKf(list.filter((x) => x.t > cut).map((x) => ({ t: x.t - cut, v: x.v })), 0, v)
    }
  }
  // hoạt ảnh vào/chuyển cảnh chỉ ở nửa đầu, hoạt ảnh ra chỉ ở nửa sau
  const leftFx = c.fx && { ...c.fx, animOut: null }
  const rightFx = c.fx && { ...c.fx, animIn: null, transition: null }
  const left: Clip = { ...c, outPoint: src, kfs: leftKfs, fx: leftFx }
  const right: Clip = { ...c, id: newId, start: t, inPoint: src, kfs: rightKfs, fx: rightFx }
  return { ...p, clips: p.clips.flatMap((x) => (x.id === id ? [left, right] : [x])) }
}

/** Thêm clip chữ / nhãn dán (không có file gốc) vào dòng chữ. */
export function addTextClip(p: Project, trackId: string, start: number, id: string, text: TextProps, dur = 3): Project | null {
  const track = p.tracks.find((t) => t.id === trackId)
  if (!track || track.kind !== 'text') return null
  const clip: Clip = {
    id, assetId: '', trackId,
    start: findFreeStart(p, trackId, start, dur),
    inPoint: 0, outPoint: dur, speed: 1, volume: 1, muted: true, text,
  }
  return { ...p, clips: [...p.clips, clip] }
}

export function deleteClip(p: Project, id: string): Project {
  return { ...p, clips: p.clips.filter((c) => c.id !== id) }
}

export function duplicateClip(p: Project, id: string, newId: string): Project | null {
  const c = p.clips.find((x) => x.id === id)
  return c ? pasteClip(p, c, c.trackId, clipEnd(c), newId) : null
}

export function pasteClip(p: Project, src: Clip, trackId: string, start: number, newId: string): Project | null {
  if (!p.tracks.some((t) => t.id === trackId)) return null
  const track = p.tracks.find((t) => t.id === trackId)!
  const srcTrack = p.tracks.find((t) => t.id === src.trackId)
  if (srcTrack && srcTrack.kind !== track.kind) return null
  const s = findFreeStart(p, trackId, start, clipDur(src))
  return { ...p, clips: [...p.clips, { ...src, id: newId, trackId, start: s }] }
}

/** Kéo mép trái: đổi điểm bắt đầu, đồng thời cắt bớt phần đầu của file gốc. */
export function trimStart(p: Project, id: string, newStart: number): Project {
  const c = p.clips.find((x) => x.id === id)
  if (!c) return p
  const prevEnd = others(p, c.trackId, id)
    .filter((o) => clipEnd(o) <= c.start + EPS)
    .reduce((m, o) => Math.max(m, clipEnd(o)), 0)
  const lo = Math.max(prevEnd, c.start - c.inPoint / c.speed)
  const hi = clipEnd(c) - MIN_DUR
  if (lo > hi) return p
  const ns = clamp(newStart, lo, hi)
  const delta = ns - c.start
  return replace(p, id, (x) => ({ ...x, start: ns, inPoint: Math.max(0, x.inPoint + delta * x.speed), kfs: shiftKfs(x.kfs, -delta) }))
}

/** Kéo mép phải: đổi điểm kết thúc, không vượt quá file gốc và không đè clip kế bên. */
export function trimEnd(p: Project, id: string, newEnd: number): Project {
  const c = p.clips.find((x) => x.id === id)
  if (!c) return p
  const asset = p.assets.find((a) => a.id === c.assetId)
  const nextStart = others(p, c.trackId, id)
    .filter((o) => o.start >= clipEnd(c) - EPS)
    .reduce((m, o) => Math.min(m, o.start), Infinity)
  const hi = Math.min(nextStart, c.start + ((c.text ? IMAGE_MAX : maxOut(asset)) - c.inPoint) / c.speed)
  const lo = c.start + MIN_DUR
  if (lo > hi) return p
  const ne = clamp(newEnd, lo, hi)
  return replace(p, id, (x) => ({ ...x, outPoint: x.inPoint + (ne - x.start) * x.speed }))
}

/** Di chuyển clip (có thể sang dòng khác cùng loại). Trả null nếu bị đè lên clip khác. */
export function moveClip(p: Project, id: string, newStart: number, newTrackId: string): Project | null {
  const c = p.clips.find((x) => x.id === id)
  const from = c && p.tracks.find((t) => t.id === c.trackId)
  const to = p.tracks.find((t) => t.id === newTrackId)
  if (!c || !from || !to || from.kind !== to.kind) return null
  const s = Math.max(0, newStart)
  if (overlaps(p, newTrackId, s, s + clipDur(c), id)) return null
  return replace(p, id, (x) => ({ ...x, start: s, trackId: newTrackId }))
}

/** Đổi tốc độ. Nếu chậm đi làm clip dài ra và đụng clip kế bên thì tự giữ ở mức chậm nhất cho phép. */
export function setSpeed(p: Project, id: string, speed: number): Project {
  const c = p.clips.find((x) => x.id === id)
  if (!c) return p
  let s = clamp(speed, MIN_SPEED, MAX_SPEED)
  const nextStart = others(p, c.trackId, id)
    .filter((o) => o.start >= clipEnd(c) - EPS)
    .reduce((m, o) => Math.min(m, o.start), Infinity)
  if (nextStart < Infinity) {
    const needed = (c.outPoint - c.inPoint) / (nextStart - c.start)
    if (needed > MAX_SPEED) return p
    s = Math.max(s, needed)
  }
  return replace(p, id, (x) => ({ ...x, speed: s }))
}

/** Hít vào mốc gần nhất (nếu trong ngưỡng) cho một điểm thời gian. */
export function snapPoint(t: number, candidates: number[], threshold: number) {
  let best: number | null = null
  for (const c of candidates) {
    const d = c - t
    if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d
  }
  return best === null ? t : t + best
}

/** Hít cả đầu lẫn cuối clip đang kéo vào các mốc. */
export function snapMove(start: number, dur: number, candidates: number[], threshold: number) {
  let best: number | null = null
  for (const c of candidates) {
    for (const edge of [start, start + dur]) {
      const d = c - edge
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d
    }
  }
  return best === null ? start : start + best
}

/**
 * Bỏ các đoạn (tính theo giây trên file gốc) khỏi một clip. Phần còn lại được nối liền nhau,
 * và các clip phía sau trên cùng dòng được kéo lùi lại cho khít (không để khoảng trống).
 */
export function removeRanges(p: Project, id: string, ranges: [number, number][], newId: () => string): Project | null {
  const c = p.clips.find((x) => x.id === id)
  if (!c) return null
  const cut = ranges
    .map(([a, b]) => [Math.max(a, c.inPoint), Math.min(b, c.outPoint)] as [number, number])
    .filter(([a, b]) => b - a > 0.01)
    .sort((x, y) => x[0] - y[0])
  if (!cut.length) return null
  const keep: [number, number][] = []
  let cur = c.inPoint
  for (const [a, b] of cut) {
    if (a - cur > 0.05) keep.push([cur, a])
    cur = Math.max(cur, b)
  }
  if (c.outPoint - cur > 0.05) keep.push([cur, c.outPoint])
  const oldEnd = clipEnd(c)
  let t = c.start
  const pieces: Clip[] = keep.map(([a, b], i) => {
    const piece: Clip = {
      ...c, id: i === 0 ? c.id : newId(), start: t, inPoint: a, outPoint: b,
      kfs: undefined, fadeIn: i === 0 ? c.fadeIn : undefined, fadeOut: i === keep.length - 1 ? c.fadeOut : undefined,
      fx: c.fx && (i === 0 ? c.fx : { ...c.fx, transition: null, animIn: null }),
    }
    t += (b - a) / c.speed
    return piece
  })
  const shift = oldEnd - t
  const rest = p.clips
    .filter((x) => x.id !== id)
    .map((x) => (x.trackId === c.trackId && x.start >= oldEnd - EPS ? { ...x, start: Math.max(0, x.start - shift) } : x))
  return { ...p, clips: [...rest, ...pieces] }
}
