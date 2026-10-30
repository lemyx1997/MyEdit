import { fxOf } from '../fx/anim'
import type { Clip, Project } from '../types'
import { clipDur, clipEnd } from './ops'

export interface Pick {
  /** Clip đang hiện (hoặc clip đến trong lúc chuyển cảnh) */
  b: Clip
  /** Clip đi ra trong lúc chuyển cảnh */
  a?: Clip
  /** Tiến độ chuyển cảnh 0..1 (chỉ có nghĩa khi có `a`) */
  prog: number
  transId?: string
}

/** Độ dài thực của chuyển cảnh: không dài quá 90% của hai clip kề nhau. */
export const transitionDur = (a: Clip, b: Clip, want: number) => Math.min(want, clipDur(a) * 0.9, clipDur(b) * 0.9)

/** Trên một dòng, tại thời điểm t cần vẽ clip nào (có thể là cặp clip đang chuyển cảnh). */
export function pickClips(p: Project, trackId: string, t: number): Pick | null {
  const list = p.clips.filter((c) => c.trackId === trackId).sort((x, y) => x.start - y.start)
  for (let i = 1; i < list.length; i++) {
    const B = list[i]
    const A = list[i - 1]
    const tr = fxOf(B).transition
    if (!tr || tr.id === 'none' || Math.abs(clipEnd(A) - B.start) > 0.02) continue
    const d = transitionDur(A, B, tr.dur)
    const cut = B.start
    if (d > 0 && t >= cut - d / 2 && t < cut + d / 2) return { a: A, b: B, prog: (t - (cut - d / 2)) / d, transId: tr.id }
  }
  const c = list.find((x) => x.start <= t && t < clipEnd(x))
  return c ? { b: c, prog: 1 } : null
}

/** Mọi clip cần có hình tại thời điểm t (kể cả clip phụ trong lúc chuyển cảnh), bỏ qua dòng đã ẩn. */
export function visibleClips(p: Project, t: number): Clip[] {
  const out: Clip[] = []
  for (const tr of p.tracks) {
    if (tr.kind === 'audio' || tr.hidden) continue
    const k = pickClips(p, tr.id, t)
    if (!k) continue
    out.push(k.b)
    if (k.a) out.push(k.a)
  }
  return out
}
