import { useEffect, useRef } from 'react'
import { peaksOf } from '../audio'

interface Props {
  assetId: string
  inPoint: number
  outPoint: number
  duration: number
  width: number
  height: number
  color?: string
}

/** Vẽ sóng âm của đoạn [inPoint, outPoint] của file gốc. */
export default function Waveform({ assetId, inPoint, outPoint, duration, width, height, color = 'rgba(255,255,255,0.75)' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const w = Math.max(4, Math.min(4000, Math.ceil(width)))

  useEffect(() => {
    let alive = true
    void peaksOf(assetId).then((peaks) => {
      const c = ref.current
      if (!alive || !c || !peaks || duration <= 0) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.fillStyle = color
      const n = peaks.length
      const a = (inPoint / duration) * n
      const b = (outPoint / duration) * n
      const mid = height / 2
      for (let x = 0; x < w; x++) {
        const i0 = Math.floor(a + ((b - a) * x) / w)
        const i1 = Math.max(i0 + 1, Math.floor(a + ((b - a) * (x + 1)) / w))
        let m = 0
        for (let i = i0; i < i1 && i < n; i++) m = Math.max(m, peaks[i])
        const h = Math.max(1, Math.min(1, m * 1.4) * (height - 4))
        ctx.fillRect(x, mid - h / 2, 1, h)
      }
    })
    return () => { alive = false }
  }, [assetId, inPoint, outPoint, duration, w, height, color])

  return <canvas ref={ref} width={w} height={height} className="pointer-events-none absolute inset-0 h-full w-full" />
}
