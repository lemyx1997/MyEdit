import { clipDur, clamp } from '../timeline/ops'
import type { Adjust, Anim, Chroma, Clip, Fx, KfProp, Keyframe, Project } from '../types'

export const DEFAULT_ADJUST: Adjust = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, blur: 0, sharpen: 0, vignette: 0 }
export const DEFAULT_CHROMA: Chroma = { on: false, color: '#00ff00', tolerance: 0.35 }

export const DEFAULT_FX: Fx = {
  x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
  blend: 'normal', mask: 'none',
  filter: 'none', filterStrength: 1,
  adjust: DEFAULT_ADJUST, chroma: DEFAULT_CHROMA,
  animIn: null, animOut: null, animLoop: null, transition: null,
}

/** Hiệu ứng đầy đủ của clip (đã điền giá trị mặc định cho phần còn thiếu). */
export function fxOf(c: Clip): Fx {
  const f = c.fx
  if (!f) return DEFAULT_FX
  return { ...DEFAULT_FX, ...f, adjust: { ...DEFAULT_ADJUST, ...f.adjust }, chroma: { ...DEFAULT_CHROMA, ...f.chroma } }
}

// ---------- keyframe ----------

/** Nội suy tuyến tính giữa các khung chính; ngoài khoảng thì giữ giá trị đầu/cuối. */
export function valueAt(kfs: Keyframe[] | undefined, t: number, base: number): number {
  if (!kfs || kfs.length === 0) return base
  if (t <= kfs[0].t) return kfs[0].v
  const last = kfs[kfs.length - 1]
  if (t >= last.t) return last.v
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (t >= a.t && t < b.t) return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t)
  }
  return base
}

const KF_EPS = 0.04

export function upsertKf(list: Keyframe[], t: number, v: number): Keyframe[] {
  const i = list.findIndex((k) => Math.abs(k.t - t) < KF_EPS)
  if (i >= 0) return list.map((k, j) => (j === i ? { t: k.t, v } : k))
  return [...list, { t, v }].sort((a, b) => a.t - b.t)
}

export const hasKfAt = (list: Keyframe[] | undefined, t: number) => !!list?.some((k) => Math.abs(k.t - t) < KF_EPS)
export const removeKfAt = (list: Keyframe[], t: number) => list.filter((k) => Math.abs(k.t - t) >= KF_EPS)

/** Dịch mọi khung chính đi `d` giây (dùng khi cắt đầu clip hoặc tách clip). */
export const shiftKfs = (kfs: Clip['kfs'], d: number): Clip['kfs'] => {
  if (!kfs) return kfs
  const out: NonNullable<Clip['kfs']> = {}
  for (const k of Object.keys(kfs) as KfProp[]) out[k] = kfs[k]!.map((x) => ({ t: x.t + d, v: x.v }))
  return out
}

/** Đặt giá trị một thuộc tính: nếu đã có keyframe thì thêm/sửa keyframe tại kim chỉ, không thì sửa giá trị gốc. */
export function withProp(p: Project, id: string, prop: KfProp, value: number, playhead: number): Project {
  return {
    ...p,
    clips: p.clips.map((c) => {
      if (c.id !== id) return c
      const list = c.kfs?.[prop]
      if (list && list.length) {
        const local = clamp(playhead - c.start, 0, clipDur(c))
        return { ...c, kfs: { ...c.kfs, [prop]: upsertKf(list, local, value) } }
      }
      return prop === 'volume' ? { ...c, volume: value } : { ...c, fx: { ...c.fx, [prop]: value } }
    }),
  }
}

// ---------- hoạt ảnh ----------

export interface Delta {
  dx: number
  dy: number
  sMul: number
  dr: number
  aMul: number
}
const ID: Delta = { dx: 0, dy: 0, sMul: 1, dr: 0, aMul: 1 }

export const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p, 0, 1), 3)
const easeBack = (p: number) => {
  const c = 1.70158
  const x = clamp(p, 0, 1) - 1
  return 1 + (c + 1) * x * x * x + c * x * x
}

/** Hoạt ảnh vào/ra: p chạy từ 0 (ẩn) đến 1 (hiện bình thường). Hoạt ảnh ra dùng p đảo ngược. */
export function animDelta(id: string, p: number): Delta {
  const e = easeOut(p)
  switch (id) {
    case 'fade': return { ...ID, aMul: e }
    case 'slideL': return { ...ID, dx: -(1 - e) * 0.5, aMul: Math.min(1, p * 3) }
    case 'slideR': return { ...ID, dx: (1 - e) * 0.5, aMul: Math.min(1, p * 3) }
    case 'slideU': return { ...ID, dy: -(1 - e) * 0.5, aMul: Math.min(1, p * 3) }
    case 'slideD': return { ...ID, dy: (1 - e) * 0.5, aMul: Math.min(1, p * 3) }
    case 'zoomIn': return { ...ID, sMul: 0.4 + 0.6 * e, aMul: e }
    case 'zoomOut': return { ...ID, sMul: 1.6 - 0.6 * e, aMul: e }
    case 'pop': return { ...ID, sMul: Math.max(0.001, easeBack(p)), aMul: Math.min(1, p * 4) }
    case 'spin': return { ...ID, dr: -(1 - e) * 360, sMul: Math.max(0.001, e), aMul: e }
    case 'drop': return { ...ID, dy: -(1 - e) * 0.4, aMul: Math.min(1, p * 4) }
    default: return ID
  }
}

/** Hoạt ảnh lặp: τ là số giây từ đầu clip. */
export function loopDelta(id: string, tau: number): Delta {
  const s = (hz: number) => Math.sin(2 * Math.PI * hz * tau)
  switch (id) {
    case 'pulse': return { ...ID, sMul: 1 + 0.06 * s(1.5) }
    case 'shake': return { ...ID, dx: 0.01 * s(12), dr: 2 * s(9) }
    case 'float': return { ...ID, dy: 0.02 * s(0.8) }
    case 'spin': return { ...ID, dr: (360 * tau) / 4 }
    case 'swing': return { ...ID, dr: 8 * s(1) }
    case 'blink': return { ...ID, aMul: 0.55 + 0.45 * (0.5 + 0.5 * s(3)) }
    default: return ID
  }
}

/** Âm lượng của clip tại thời điểm `local` (giây từ đầu clip): gốc + khung chính + mờ dần vào/ra. */
export function volumeAt(c: Clip, local: number): number {
  const dur = clipDur(c)
  let v = valueAt(c.kfs?.volume, local, c.volume)
  if (c.fadeIn && c.fadeIn > 0 && local < c.fadeIn) v *= clamp(local / c.fadeIn, 0, 1)
  if (c.fadeOut && c.fadeOut > 0 && dur - local < c.fadeOut) v *= clamp((dur - local) / c.fadeOut, 0, 1)
  return v
}

export interface Resolved {
  x: number
  y: number
  scale: number
  rot: number
  opacity: number
  aMul: number
  volume: number
}

/** Giá trị cuối cùng tại thời điểm `local` (giây từ đầu clip): gốc + keyframe + hoạt ảnh. */
export function resolveClip(c: Clip, local: number): Resolved {
  const f = fxOf(c)
  const k = c.kfs ?? {}
  const dur = clipDur(c)
  let x = valueAt(k.x, local, f.x)
  let y = valueAt(k.y, local, f.y)
  let scale = valueAt(k.scale, local, f.scale)
  let rot = valueAt(k.rotation, local, f.rotation)
  const opacity = valueAt(k.opacity, local, f.opacity)
  const volume = valueAt(k.volume, local, c.volume)
  let aMul = 1
  const apply = (d: Delta) => {
    x += d.dx
    y += d.dy
    scale *= d.sMul
    rot += d.dr
    aMul *= d.aMul
  }
  const inA: Anim | null = f.animIn
  if (inA && inA.dur > 0 && local < inA.dur) apply(animDelta(inA.id, local / inA.dur))
  const outA: Anim | null = f.animOut
  if (outA && outA.dur > 0 && dur - local < outA.dur) apply(animDelta(outA.id, (dur - local) / outA.dur))
  if (f.animLoop) apply(loopDelta(f.animLoop, local))
  return { x, y, scale, rot, opacity, aMul, volume }
}
