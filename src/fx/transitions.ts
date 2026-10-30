type Src = HTMLCanvasElement

const smooth = (p: number) => p * p * (3 - 2 * p)

/**
 * Chuyển cảnh: A là cảnh đi ra, B là cảnh đi vào, p chạy 0→1.
 * A và B đã được vẽ sẵn ra hai tấm canvas cùng cỡ khung hình.
 */
export function drawTransition(id: string, ctx: CanvasRenderingContext2D, A: Src, B: Src, prog: number, W: number, H: number) {
  const p = smooth(Math.min(1, Math.max(0, prog)))
  ctx.save()
  const alpha = (v: number) => (ctx.globalAlpha = Math.min(1, Math.max(0, v)))
  switch (id) {
    case 'fadeBlack':
    case 'fadeWhite': {
      ctx.fillStyle = id === 'fadeBlack' ? '#000' : '#fff'
      ctx.fillRect(0, 0, W, H)
      if (p < 0.5) { alpha(1 - p * 2); ctx.drawImage(A, 0, 0) } else { alpha(p * 2 - 1); ctx.drawImage(B, 0, 0) }
      break
    }
    case 'slideL': ctx.drawImage(A, -p * W, 0); ctx.drawImage(B, (1 - p) * W, 0); break
    case 'slideR': ctx.drawImage(A, p * W, 0); ctx.drawImage(B, -(1 - p) * W, 0); break
    case 'slideU': ctx.drawImage(A, 0, -p * H); ctx.drawImage(B, 0, (1 - p) * H); break
    case 'slideD': ctx.drawImage(A, 0, p * H); ctx.drawImage(B, 0, -(1 - p) * H); break
    case 'wipeL':
    case 'wipeR':
    case 'wipeU':
    case 'wipeD': {
      ctx.drawImage(A, 0, 0)
      ctx.beginPath()
      if (id === 'wipeL') ctx.rect(W * (1 - p), 0, W * p, H)
      else if (id === 'wipeR') ctx.rect(0, 0, W * p, H)
      else if (id === 'wipeU') ctx.rect(0, H * (1 - p), W, H * p)
      else ctx.rect(0, 0, W, H * p)
      ctx.clip()
      ctx.drawImage(B, 0, 0)
      break
    }
    case 'zoomIn': {
      ctx.drawImage(B, 0, 0)
      const s = 1 + p * 0.8
      alpha(1 - p)
      ctx.drawImage(A, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s)
      break
    }
    case 'zoomOut': {
      ctx.drawImage(A, 0, 0)
      const s = 1.5 - p * 0.5
      alpha(p)
      ctx.drawImage(B, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s)
      break
    }
    case 'circle': {
      ctx.drawImage(A, 0, 0)
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, p * Math.hypot(W, H) * 0.52, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(B, 0, 0)
      break
    }
    case 'spin': {
      ctx.drawImage(B, 0, 0)
      alpha(1 - p)
      ctx.translate(W / 2, H / 2)
      ctx.rotate(p * Math.PI)
      const s = 1 - p * 0.6
      ctx.scale(s, s)
      ctx.drawImage(A, -W / 2, -H / 2)
      break
    }
    case 'blurFade': {
      ctx.filter = `blur(${Math.round(p * 24)}px)`
      ctx.drawImage(A, 0, 0)
      ctx.filter = `blur(${Math.round((1 - p) * 24)}px)`
      alpha(p)
      ctx.drawImage(B, 0, 0)
      break
    }
    default: // 'fade'
      ctx.drawImage(A, 0, 0)
      alpha(p)
      ctx.drawImage(B, 0, 0)
  }
  ctx.restore()
}
