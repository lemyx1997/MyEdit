import type { Project, TextProps } from '../types'

// Vẽ chữ ra một tấm "ảnh" riêng, sau đó được xử lý như mọi clip hình khác.

let fontsVersion = 0
const loading = new Set<string>()
const cache = new Map<string, HTMLCanvasElement>()

/** Chuỗi font cho canvas. Font phải khai báo đúng độ đậm/nghiêng để trình duyệt nạp đúng file. */
const fontStr = (tp: TextProps, px: number) => `${tp.italic ? 'italic ' : ''}${tp.bold ? 700 : 400} ${px}px "${tp.font}", sans-serif`

/** Chờ font nạp xong (dùng trước khi xuất video để chữ không bị đổi font). */
export async function ensureFonts(p: Project) {
  const jobs = p.clips.filter((c) => c.text).map((c) => document.fonts.load(fontStr(c.text!, 40), c.text!.text))
  await Promise.all(jobs)
  fontsVersion++
}

function ready(tp: TextProps) {
  const f = fontStr(tp, 40)
  if (document.fonts.check(f, tp.text)) return true
  if (!loading.has(f)) {
    loading.add(f)
    void document.fonts.load(f, tp.text).then(() => {
      loading.delete(f)
      fontsVersion++
    })
  }
  return false
}

export function textDrawable(tp: TextProps, H: number): { src: HTMLCanvasElement; w: number; h: number; native: true } {
  const ok = ready(tp)
  const key = `${JSON.stringify(tp)}|${H}|${ok ? fontsVersion : 'wait'}`
  let c = cache.get(key)
  if (!c) {
    if (cache.size > 60) cache.clear()
    c = render(tp, (tp.size * H) / 1080)
    cache.set(key, c)
  }
  return { src: c, w: c.width, h: c.height, native: true }
}

function render(tp: TextProps, px: number): HTMLCanvasElement {
  const lines = (tp.text || ' ').split('\n')
  const m = document.createElement('canvas').getContext('2d')!
  m.font = fontStr(tp, px)
  const lineH = px * 1.25
  const textW = Math.max(...lines.map((l) => m.measureText(l).width), 1)
  const sw = (tp.strokeW * px) / 100 * 2 // độ dày viền tính theo cỡ chữ
  const pad = px * 0.25 + sw + (tp.shadow ? tp.shadow.blur + Math.max(Math.abs(tp.shadow.x), Math.abs(tp.shadow.y)) : 0)
  const W = Math.ceil(textW + pad * 2)
  const H = Math.ceil(lineH * lines.length + pad * 2)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  if (tp.bg) {
    ctx.globalAlpha = tp.bg.alpha
    ctx.fillStyle = tp.bg.color
    ctx.beginPath()
    ctx.roundRect(pad * 0.4, pad * 0.4, W - pad * 0.8, H - pad * 0.8, px * 0.2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.font = fontStr(tp, px)
  ctx.textBaseline = 'middle'
  ctx.textAlign = tp.align
  ctx.lineJoin = 'round'
  const x = tp.align === 'left' ? pad : tp.align === 'right' ? W - pad : W / 2
  lines.forEach((line, i) => {
    const y = pad + lineH * i + lineH / 2
    if (tp.shadow) {
      ctx.shadowColor = tp.shadow.color
      ctx.shadowBlur = tp.shadow.blur
      ctx.shadowOffsetX = tp.shadow.x
      ctx.shadowOffsetY = tp.shadow.y
    }
    if (tp.strokeW > 0) {
      ctx.lineWidth = sw
      ctx.strokeStyle = tp.strokeColor
      ctx.strokeText(line, x, y)
      ctx.shadowColor = 'transparent' // chỉ đổ bóng một lần
    }
    ctx.fillStyle = tp.color
    ctx.fillText(line, x, y)
    ctx.shadowColor = 'transparent'
  })
  return c
}
