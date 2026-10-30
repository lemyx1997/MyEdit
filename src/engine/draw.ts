import { clipEnd } from '../timeline/ops'
import type { Asset, Clip, Project, Ratio } from '../types'

export interface Drawable {
  src: CanvasImageSource
  w: number
  h: number
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/** Kích thước khung hình theo tỉ lệ; `shortSide` là cạnh ngắn (720, 1080, 2160…). */
export function canvasSize(ratio: Ratio, shortSide: number): [number, number] {
  const [a, b] = ratio.split(':').map(Number)
  return a >= b ? [even((shortSide * a) / b), even(shortSide)] : [even(shortSide), even((shortSide * b) / a)]
}

/** Vẽ một khung hình tại thời điểm t. Dùng chung cho xem trước và xuất file nên hai bên luôn giống nhau. */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  project: Project,
  t: number,
  resolve: (clip: Clip, asset: Asset) => Drawable | null,
) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  // tracks xếp từ trên xuống dưới; vẽ từ dưới lên để dòng trên nằm đè lên
  const tracks = project.tracks.filter((tr) => tr.kind === 'video' && !tr.hidden)
  for (let i = tracks.length - 1; i >= 0; i--) {
    const clip = project.clips.find((c) => c.trackId === tracks[i].id && c.start <= t && t < clipEnd(c))
    const asset = clip && project.assets.find((a) => a.id === clip.assetId)
    if (!clip || !asset) continue
    const d = resolve(clip, asset)
    if (!d || !d.w || !d.h) continue
    const s = Math.min(W / d.w, H / d.h)
    const w = d.w * s
    const h = d.h * s
    ctx.drawImage(d.src, (W - w) / 2, (H - h) / 2, w, h)
  }
}

export function fmtTime(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}
