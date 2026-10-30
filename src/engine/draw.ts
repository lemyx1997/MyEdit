import { blendOp, filterCss } from '../fx/catalog'
import { fxOf, resolveClip } from '../fx/anim'
import { drawTransition } from '../fx/transitions'
import { clamp, clipDur } from '../timeline/ops'
import { pickClips } from '../timeline/pick'
import type { Adjust, Asset, Background, Clip, MaskShape, Project, Ratio } from '../types'
import { textDrawable } from './text'

export interface Drawable {
  src: CanvasImageSource
  w: number
  h: number
  /** true: vẽ đúng cỡ gốc (chữ). Mặc định: co vừa khung hình. */
  native?: boolean
}
export type Resolver = (clip: Clip, asset: Asset | undefined, t: number) => Drawable | null

/** Vị trí của từng clip vừa vẽ (px trên khung hình) để kéo thả trực tiếp trên màn hình. Xếp theo thứ tự vẽ: cuối = trên cùng. */
export interface Layout {
  id: string
  cx: number
  cy: number
  w: number
  h: number
  rot: number // radian
}
export const layouts: Layout[] = []

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/** Kích thước khung hình theo tỉ lệ; `shortSide` là cạnh ngắn (720, 1080, 2160…). */
export function canvasSize(ratio: Ratio, shortSide: number): [number, number] {
  const [a, b] = ratio.split(':').map(Number)
  return a >= b ? [even((shortSide * a) / b), even(shortSide)] : [even(shortSide), even((shortSide * b) / a)]
}

// ---- canvas dùng lại để khỏi cấp phát mỗi khung hình ----
const pool = new Map<string, HTMLCanvasElement>()
function getCanvas(name: string, w: number, h: number, clear = true) {
  let c = pool.get(name)
  if (!c) {
    c = document.createElement('canvas')
    pool.set(name, c)
  }
  if (c.width !== w || c.height !== h) {
    c.width = w
    c.height = h
  } else if (clear) {
    c.getContext('2d')!.clearRect(0, 0, w, h)
  }
  return c
}

// ---- hiệu ứng điểm ảnh ----
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Xoá phông xanh: điểm ảnh càng gần màu chọn càng trong suốt (có viền mềm). */
function chromaKey(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, tolerance: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const [kr, kg, kb] = hexRgb(color)
  const lo = tolerance * 441
  const hi = lo + 60
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - kr, d[i + 1] - kg, d[i + 2] - kb)
    if (dist < lo) d[i + 3] = 0
    else if (dist < hi) d[i + 3] = (d[i + 3] * (dist - lo)) / (hi - lo)
  }
  ctx.putImageData(img, 0, 0)
}

/** Làm nét: cộng thêm phần chênh lệch giữa điểm ảnh và các điểm kế bên. */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const src = ctx.getImageData(0, 0, w, h)
  const out = ctx.createImageData(w, h)
  const s = src.data
  const o = out.data
  const k = amount * 1.2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const l = x > 0 ? i - 4 : i
      const r = x < w - 1 ? i + 4 : i
      const u = y > 0 ? i - w * 4 : i
      const dn = y < h - 1 ? i + w * 4 : i
      for (let c = 0; c < 3; c++) {
        const v = s[i + c] + k * (4 * s[i + c] - s[l + c] - s[r + c] - s[u + c] - s[dn + c])
        o[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
      }
      o[i + 3] = s[i + 3]
    }
  }
  ctx.putImageData(out, 0, 0)
}

function adjustFilter(a: Adjust, H: number) {
  const parts: string[] = []
  if (a.brightness) parts.push(`brightness(${1 + a.brightness})`)
  if (a.contrast) parts.push(`contrast(${1 + a.contrast})`)
  if (a.saturation) parts.push(`saturate(${1 + a.saturation})`)
  if (a.blur > 0.001) parts.push(`blur(${(a.blur * 20 * H) / 1080}px)`)
  return parts.join(' ')
}

export function maskPath(ctx: CanvasRenderingContext2D, mask: MaskShape, w: number, h: number) {
  if (mask === 'circle') {
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
  } else if (mask === 'rect') {
    ctx.roundRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.8, Math.min(w, h) * 0.06)
  } else if (mask === 'heart') {
    const s = Math.min(w, h) / 2
    ctx.moveTo(0, 0.9 * s)
    ctx.bezierCurveTo(-1.2 * s, 0.2 * s, -1.1 * s, -0.8 * s, -0.5 * s, -0.8 * s)
    ctx.bezierCurveTo(-0.2 * s, -0.8 * s, 0, -0.55 * s, 0, -0.35 * s)
    ctx.bezierCurveTo(0, -0.55 * s, 0.2 * s, -0.8 * s, 0.5 * s, -0.8 * s)
    ctx.bezierCurveTo(1.1 * s, -0.8 * s, 1.2 * s, 0.2 * s, 0, 0.9 * s)
    ctx.closePath()
  }
}

/** Vẽ MỘT clip (đã gồm vị trí, hoạt ảnh, bộ lọc, mặt nạ, phông xanh…) lên `ctx`. */
function drawClip(ctx: CanvasRenderingContext2D, W: number, H: number, p: Project, clip: Clip, t: number, resolve: Resolver) {
  const asset = p.assets.find((a) => a.id === clip.assetId)
  const d: Drawable | null = clip.text ? textDrawable(clip.text, H) : resolve(clip, asset, t)
  if (!d || !d.w || !d.h) return
  const fx = fxOf(clip)
  const local = clamp(t - clip.start, 0, clipDur(clip))
  const r = resolveClip(clip, local)

  let w: number
  let h: number
  if (d.native) {
    w = d.w
    h = d.h
  } else {
    const s = Math.min(W / d.w, H / d.h)
    w = d.w * s
    h = d.h * s
  }
  w = Math.max(1, Math.round(w))
  h = Math.max(1, Math.round(h))

  // 1) tấm nháp riêng của clip: mọi hiệu ứng màu chỉ nằm trong phạm vi clip
  const L = getCanvas('layer', w, h)
  const lc = L.getContext('2d', { willReadFrequently: fx.chroma.on || fx.adjust.sharpen > 0.01 })!
  const adj = adjustFilter(fx.adjust, H)
  const pre = filterCss(fx.filter)
  const strength = clamp(fx.filterStrength, 0, 1)
  lc.filter = pre && strength >= 1 ? `${pre} ${adj}`.trim() : adj || 'none'
  lc.drawImage(d.src, 0, 0, w, h)
  if (pre && strength < 1) {
    lc.globalAlpha = strength
    lc.filter = `${pre} ${adj}`.trim()
    lc.drawImage(d.src, 0, 0, w, h)
    lc.globalAlpha = 1
  }
  lc.filter = 'none'
  if (fx.chroma.on) chromaKey(lc, w, h, fx.chroma.color, fx.chroma.tolerance)
  if (fx.adjust.sharpen > 0.01) sharpen(lc, w, h, fx.adjust.sharpen)
  lc.globalCompositeOperation = 'source-atop'
  if (Math.abs(fx.adjust.temperature) > 0.01) {
    lc.globalAlpha = Math.abs(fx.adjust.temperature) * 0.28
    lc.fillStyle = fx.adjust.temperature > 0 ? '#ff9a2e' : '#2e8bff'
    lc.fillRect(0, 0, w, h)
    lc.globalAlpha = 1
  }
  if (fx.adjust.vignette > 0.01) {
    const g = lc.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${fx.adjust.vignette * 0.9})`)
    lc.fillStyle = g
    lc.fillRect(0, 0, w, h)
  }
  lc.globalCompositeOperation = 'source-over'

  // 2) đặt lên khung hình: vị trí, xoay, phóng, mặt nạ, độ trong suốt, chế độ hoà trộn
  const cx = W / 2 + r.x * W
  const cy = H / 2 + r.y * H
  ctx.save()
  ctx.globalAlpha = clamp(r.opacity * r.aMul, 0, 1)
  ctx.globalCompositeOperation = blendOp(fx.blend)
  ctx.translate(cx, cy)
  ctx.rotate((r.rot * Math.PI) / 180)
  ctx.scale(r.scale, r.scale)
  if (fx.mask !== 'none') {
    ctx.beginPath()
    maskPath(ctx, fx.mask, w, h)
    ctx.clip()
  }
  ctx.drawImage(L, -w / 2, -h / 2, w, h)
  ctx.restore()
  layouts.push({ id: clip.id, cx, cy, w: w * r.scale, h: h * r.scale, rot: (r.rot * Math.PI) / 180 })
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, bg: Background, p: Project, t: number, resolve: Resolver) {
  ctx.fillStyle = bg.type === 'color' ? bg.color : '#000'
  ctx.fillRect(0, 0, W, H)
  const cover = (src: CanvasImageSource, sw: number, sh: number) => {
    const s = Math.max(W / sw, H / sh)
    ctx.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s)
  }
  if (bg.type === 'image') {
    const asset = p.assets.find((a) => a.id === bg.assetId)
    const d = asset && resolve({ id: '', assetId: asset.id, trackId: '', start: 0, inPoint: 0, outPoint: 1, speed: 1, volume: 0, muted: true }, asset, t)
    if (d) cover(d.src, d.w, d.h)
  } else if (bg.type === 'blur') {
    // lấy hình của clip video dưới cùng đang hiện, phóng kín khung rồi làm nhoè
    for (let i = p.tracks.length - 1; i >= 0; i--) {
      const tr = p.tracks[i]
      if (tr.kind !== 'video' || tr.hidden) continue
      const pk = pickClips(p, tr.id, t)
      if (!pk) continue
      const d = resolve(pk.b, p.assets.find((a) => a.id === pk.b.assetId), t)
      if (!d) continue
      ctx.save()
      ctx.filter = `blur(${Math.round((40 * H) / 1080)}px) brightness(0.7)`
      const s = Math.max(W / d.w, H / d.h) * 1.1
      ctx.drawImage(d.src, (W - d.w * s) / 2, (H - d.h * s) / 2, d.w * s, d.h * s)
      ctx.restore()
      break
    }
  }
}

/** Vẽ một khung hình tại thời điểm t. Dùng chung cho xem trước và xuất file nên hai bên luôn giống nhau. */
export function renderFrame(ctx: CanvasRenderingContext2D, W: number, H: number, project: Project, t: number, resolve: Resolver) {
  layouts.length = 0
  drawBackground(ctx, W, H, project.bg ?? { type: 'black' }, project, t, resolve)
  // dòng xếp từ trên xuống dưới; vẽ từ dưới lên để dòng trên nằm đè lên
  for (let i = project.tracks.length - 1; i >= 0; i--) {
    const tr = project.tracks[i]
    if (tr.kind === 'audio' || tr.hidden) continue
    const pk = pickClips(project, tr.id, t)
    if (!pk) continue
    if (pk.a && pk.transId) {
      const A = getCanvas('transA', W, H)
      const B = getCanvas('transB', W, H)
      drawClip(A.getContext('2d')!, W, H, project, pk.a, t, resolve)
      drawClip(B.getContext('2d')!, W, H, project, pk.b, t, resolve)
      drawTransition(pk.transId, ctx, A, B, pk.prog, W, H)
    } else {
      drawClip(ctx, W, H, project, pk.b, t, resolve)
    }
  }
}

export function fmtTime(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}
