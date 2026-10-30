import { useEffect, useRef } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { canvasSize, fmtTime, layouts, renderFrame, type Layout, type Resolver } from '../engine/draw'
import { fxOf, valueAt, volumeAt, withProp } from '../fx/anim'
import { createMediaEl, getImageDrawable } from '../media'
import { useProject } from '../store'
import { clamp, clipDur, clipEnd, projectDuration } from '../timeline/ops'
import { visibleClips } from '../timeline/pick'
import type { Clip, Project, Ratio } from '../types'
import { useUi } from '../ui'

const AR: Record<Ratio, number> = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3, '21:9': 21 / 9 }

/** Điểm (px khung hình) có nằm trong hình chữ nhật đã xoay của clip không. */
function hit(l: Layout, x: number, y: number) {
  const dx = x - l.cx
  const dy = y - l.cy
  const c = Math.cos(-l.rot)
  const s = Math.sin(-l.rot)
  return Math.abs(dx * c - dy * s) <= l.w / 2 && Math.abs(dx * s + dy * c) <= l.h / 2
}

export default function Player() {
  const ratio = useProject((s) => s.project.ratio)
  const playing = useProject((s) => s.playing)
  const playhead = useProject((s) => s.playhead)
  const duration = useProject((s) => projectDuration(s.project))
  const setPlayhead = useProject((s) => s.setPlayhead)
  const toggle = useProject((s) => s.toggle)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const els = useRef(new Map<string, HTMLVideoElement | HTMLAudioElement>())
  const quality = useUi((s) => s.quality)
  const autoLow = useUi((s) => s.autoLow)
  const low = quality === '360' || (quality === 'auto' && autoLow)
  const [W, H] = canvasSize(ratio, low ? 360 : 720)
  const ar = AR[ratio]

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pool = els.current
    let raf = 0
    let last = performance.now()
    let slow = 0 // đếm số khung hình vẽ quá chậm liên tiếp (máy yếu)

    // Đồng bộ các thẻ video/nhạc ẩn với vị trí kim chỉ
    const sync = (p: Project, t: number, playingNow: boolean) => {
      const active = new Set<string>()
      const vis = new Set(visibleClips(p, t).map((c) => c.id))
      for (const clip of p.clips) {
        const asset = p.assets.find((a) => a.id === clip.assetId)
        const track = p.tracks.find((x) => x.id === clip.trackId)
        if (!asset || !track || asset.kind === 'image') continue
        const covering = clip.start <= t && t < clipEnd(clip)
        // clip video còn cần hình trong lúc chuyển cảnh dù đã/chưa tới lượt
        if (!(covering || (asset.kind === 'video' && vis.has(clip.id)))) continue
        active.add(clip.id)
        let el = pool.get(clip.id)
        if (!el) {
          el = createMediaEl(asset)
          pool.set(clip.id, el)
        }
        const want = clamp(clip.inPoint + (t - clip.start) * clip.speed, 0, Math.max(0, asset.duration - 0.05))
        const vol = volumeAt(clip, clamp(t - clip.start, 0, clipDur(clip)))
        el.muted = clip.muted || track.muted || !covering
        el.volume = clamp(vol, 0, 1)
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

    const resolve: Resolver = (clip, asset, t) => {
      if (!asset) return null
      if (asset.kind === 'image') return getImageDrawable(asset.id, t - clip.start)
      const el = pool.get(clip.id)
      if (!(el instanceof HTMLVideoElement) || el.readyState < 2) return null
      return { src: el, w: el.videoWidth, h: el.videoHeight }
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
      const t0 = performance.now()
      sync(st.project, t, st.playing)
      renderFrame(ctx, W, H, st.project, t, resolve)
      // máy yếu: nếu vẽ chậm liên tục thì tự hạ chất lượng xem trước
      if (useUi.getState().quality === 'auto' && !useUi.getState().autoLow && st.playing) {
        slow = performance.now() - t0 > 45 ? slow + 1 : Math.max(0, slow - 1)
        if (slow > 40) {
          useUi.getState().setAutoLow(true)
          useUi.getState().setNotice('Máy hơi chậm nên MyEdit đã hạ chất lượng xem trước cho mượt hơn (video xuất ra vẫn giữ nguyên chất lượng).')
        }
      }

      // khung chọn quanh clip đang chọn
      const box = boxRef.current
      const wrap = wrapRef.current
      if (box && wrap) {
        const l = layouts.find((x) => x.id === st.selectedId)
        if (l) {
          const k = wrap.clientWidth / W
          box.style.display = 'block'
          box.style.left = `${(l.cx - l.w / 2) * k}px`
          box.style.top = `${(l.cy - l.h / 2) * k}px`
          box.style.width = `${l.w * k}px`
          box.style.height = `${l.h * k}px`
          box.style.transform = `rotate(${l.rot}rad)`
        } else {
          box.style.display = 'none'
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      for (const el of pool.values()) el.pause()
    }
  }, [W, H])

  // ----- kéo thả trực tiếp trên khung hình -----
  const toCanvas = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = wrapRef.current!.getBoundingClientRect()
    const k = W / r.width
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]
  }
  const baseOf = (c: Clip, prop: 'x' | 'y' | 'scale' | 'rotation', t: number) => {
    const local = clamp(t - c.start, 0, clipDur(c))
    return valueAt(c.kfs?.[prop], local, fxOf(c)[prop])
  }
  const drag = (e: RPointerEvent, mode: 'move' | 'scale' | 'rotate') => {
    e.stopPropagation()
    const st = useProject.getState()
    let id = st.selectedId
    const [px0, py0] = toCanvas(e)
    if (mode === 'move') {
      const top = [...layouts].reverse().find((l) => hit(l, px0, py0))
      id = top?.id ?? null
      st.select(id)
    }
    const base = st.project
    const c = base.clips.find((x) => x.id === id)
    const lay = layouts.find((l) => l.id === id)
    if (!c || !lay) return
    const t = st.playhead
    const x0 = baseOf(c, 'x', t)
    const y0 = baseOf(c, 'y', t)
    const s0 = baseOf(c, 'scale', t)
    const r0 = baseOf(c, 'rotation', t)
    const d0 = Math.hypot(px0 - lay.cx, py0 - lay.cy) || 1
    const a0 = Math.atan2(py0 - lay.cy, px0 - lay.cx)
    let moved = false
    const move = (ev: PointerEvent) => {
      const [px, py] = toCanvas(ev)
      if (!moved && Math.hypot(px - px0, py - py0) < 3) return
      moved = true
      let next = base
      if (mode === 'move') {
        next = withProp(withProp(base, c.id, 'x', x0 + (px - px0) / W, t), c.id, 'y', y0 + (py - py0) / H, t)
      } else if (mode === 'scale') {
        next = withProp(base, c.id, 'scale', clamp((s0 * Math.hypot(px - lay.cx, py - lay.cy)) / d0, 0.05, 10), t)
      } else {
        next = withProp(base, c.id, 'rotation', r0 + ((Math.atan2(py - lay.cy, px - lay.cx) - a0) * 180) / Math.PI, t)
      }
      useProject.getState().setLive(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      useProject.getState().endGesture()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const handle = 'absolute h-3 w-3 rounded-full border-2 pointer-events-auto'
  const hs = { background: '#fff', borderColor: 'var(--accent)' }

  return (
    <section className="flex min-w-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <div
          ref={wrapRef}
          className="relative select-none"
          style={{
            aspectRatio: ar,
            maxHeight: '100%',
            maxWidth: '100%',
            height: ar < 1 ? '100%' : undefined,
            width: ar >= 1 ? '100%' : undefined,
          }}
          onPointerDown={(e) => drag(e, 'move')}
        >
          <canvas ref={canvasRef} width={W} height={H} className="h-full w-full rounded" style={{ background: '#000' }} />
          <div ref={boxRef} className="pointer-events-none absolute" style={{ display: 'none', outline: '1.5px solid var(--accent)' }}>
            <div className={handle} style={{ ...hs, left: -6, top: -6, cursor: 'nwse-resize' }} onPointerDown={(e) => drag(e, 'scale')} />
            <div className={handle} style={{ ...hs, right: -6, top: -6, cursor: 'nesw-resize' }} onPointerDown={(e) => drag(e, 'scale')} />
            <div className={handle} style={{ ...hs, left: -6, bottom: -6, cursor: 'nesw-resize' }} onPointerDown={(e) => drag(e, 'scale')} />
            <div className={handle} style={{ ...hs, right: -6, bottom: -6, cursor: 'nwse-resize' }} onPointerDown={(e) => drag(e, 'scale')} />
            <div className="pointer-events-none absolute left-1/2 -top-6 h-6 w-px" style={{ background: 'var(--accent)' }} />
            <div className={handle} style={{ ...hs, left: 'calc(50% - 6px)', top: -30, cursor: 'grab' }} onPointerDown={(e) => drag(e, 'rotate')} title="Xoay" />
          </div>
        </div>
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
