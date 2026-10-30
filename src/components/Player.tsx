import { useEffect, useRef } from 'react'
import { canvasSize, fmtTime, renderFrame } from '../engine/draw'
import { createMediaEl, getImage } from '../media'
import { useProject } from '../store'
import { clipEnd, projectDuration } from '../timeline/ops'
import type { Project, Ratio } from '../types'

const AR: Record<Ratio, number> = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3, '21:9': 21 / 9 }

export default function Player() {
  const ratio = useProject((s) => s.project.ratio)
  const playing = useProject((s) => s.playing)
  const playhead = useProject((s) => s.playhead)
  const duration = useProject((s) => projectDuration(s.project))
  const setPlayhead = useProject((s) => s.setPlayhead)
  const toggle = useProject((s) => s.toggle)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const els = useRef(new Map<string, HTMLVideoElement | HTMLAudioElement>())
  const [W, H] = canvasSize(ratio, 720)
  const ar = AR[ratio]

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pool = els.current
    let raf = 0
    let last = performance.now()

    // Đồng bộ các thẻ video/nhạc ẩn với vị trí kim chỉ
    const sync = (p: Project, t: number, playingNow: boolean) => {
      const active = new Set<string>()
      for (const clip of p.clips) {
        const asset = p.assets.find((a) => a.id === clip.assetId)
        const track = p.tracks.find((x) => x.id === clip.trackId)
        if (!asset || !track || asset.kind === 'image') continue
        if (!(clip.start <= t && t < clipEnd(clip))) continue
        active.add(clip.id)
        let el = pool.get(clip.id)
        if (!el) {
          el = createMediaEl(asset)
          pool.set(clip.id, el)
        }
        const want = clip.inPoint + (t - clip.start) * clip.speed
        el.muted = clip.muted || track.muted
        el.volume = Math.min(1, Math.max(0, clip.volume))
        if (playingNow) {
          if (el.playbackRate !== clip.speed) el.playbackRate = clip.speed
          if (el.paused) {
            el.currentTime = want
            void el.play().catch(() => {})
          } else if (Math.abs(el.currentTime - want) > 0.3) {
            el.currentTime = want
          }
        } else {
          if (!el.paused) el.pause()
          if (Math.abs(el.currentTime - want) > 0.04) el.currentTime = want
        }
      }
      for (const [id, el] of pool) {
        if (!active.has(id) && !el.paused) el.pause()
        if (!p.clips.some((c) => c.id === id)) {
          el.removeAttribute('src')
          el.load()
          pool.delete(id)
        }
      }
    }

    const loop = (now: number) => {
      const s = useProject.getState()
      let t = s.playhead
      if (s.playing) {
        t += (now - last) / 1000
        const dur = projectDuration(s.project)
        if (t >= dur) {
          t = dur
          s.setPlayhead(t)
          s.pause()
        } else {
          s.setPlayhead(t)
        }
      }
      last = now
      const st = useProject.getState()
      sync(st.project, t, st.playing)
      renderFrame(ctx, W, H, st.project, t, (clip, asset) => {
        if (asset.kind === 'image') {
          const img = getImage(asset.id)
          return img.complete && img.naturalWidth ? { src: img, w: img.naturalWidth, h: img.naturalHeight } : null
        }
        const el = pool.get(clip.id)
        if (!(el instanceof HTMLVideoElement) || el.readyState < 2) return null
        return { src: el, w: el.videoWidth, h: el.videoHeight }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      for (const el of pool.values()) el.pause()
    }
  }, [W, H])

  return (
    <section className="flex min-w-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded"
          style={{
            aspectRatio: ar,
            maxHeight: '100%',
            maxWidth: '100%',
            height: ar < 1 ? '100%' : undefined,
            width: ar >= 1 ? '100%' : undefined,
            background: '#000',
          }}
        />
      </div>
      <div className="flex h-10 items-center justify-center gap-4 border-t text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
        <button title="Về đầu" onClick={() => setPlayhead(0)}>⏮</button>
        <button title="Phát / Dừng (Space)" onClick={toggle} className="w-6 text-lg" style={{ color: 'var(--accent)' }}>
          {playing ? '⏸' : '▶'}
        </button>
        <button title="Tới cuối" onClick={() => setPlayhead(duration)}>⏭</button>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {fmtTime(playhead)} / {fmtTime(duration)}
        </span>
        <button title="Toàn màn hình" onClick={() => void canvasRef.current?.requestFullscreen?.()}>⛶</button>
      </div>
    </section>
  )
}
