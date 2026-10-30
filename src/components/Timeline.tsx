import { useRef } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { fmtTime } from '../engine/draw'
import { useProject } from '../store'
import {
  clamp, clipDur, clipEnd, moveClip, projectDuration, snapMove, snapPoint, trimEnd, trimStart,
} from '../timeline/ops'
import type { Clip } from '../types'

const LANE_H = 48
const HEADER_W = 112
const SNAP_PX = 8

export default function Timeline() {
  const project = useProject((s) => s.project)
  const selectedId = useProject((s) => s.selectedId)
  const playhead = useProject((s) => s.playhead)
  const pps = useProject((s) => s.zoom)
  const snap = useProject((s) => s.snap)
  const st = useProject
  const lanesRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)

  const duration = projectDuration(project)
  const width = Math.max(duration + 15, 30) * pps

  // ----- kéo thước thời gian để tua -----
  const scrub = (e: RPointerEvent) => {
    const seek = (x: number) => st.getState().setPlayhead((x - rulerRef.current!.getBoundingClientRect().left) / pps)
    seek(e.clientX)
    const move = (ev: PointerEvent) => seek(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ----- kéo clip / kéo mép để cắt -----
  const startDrag = (e: RPointerEvent, clip: Clip, mode: 'move' | 'l' | 'r') => {
    e.stopPropagation()
    st.getState().select(clip.id)
    const base = st.getState().project
    const c0 = base.clips.find((c) => c.id === clip.id)!
    const startX = e.clientX
    let moved = false
    const th = SNAP_PX / pps
    const marks = () => [
      0,
      st.getState().playhead,
      ...base.clips.filter((c) => c.id !== clip.id).flatMap((c) => [c.start, clipEnd(c)]),
    ]

    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < 3) return
      moved = true
      const dx = (ev.clientX - startX) / pps
      const s = st.getState()
      if (mode === 'move') {
        const rect = lanesRef.current!.getBoundingClientRect()
        const idx = clamp(Math.floor((ev.clientY - rect.top) / LANE_H), 0, base.tracks.length - 1)
        let ns = c0.start + dx
        if (s.snap) ns = snapMove(ns, clipDur(c0), marks(), th)
        const r = moveClip(base, c0.id, ns, base.tracks[idx].id) ?? moveClip(base, c0.id, ns, c0.trackId)
        if (r) s.setLive(r)
      } else if (mode === 'l') {
        let ns = c0.start + dx
        if (s.snap) ns = snapPoint(ns, marks(), th)
        s.setLive(trimStart(base, c0.id, ns))
      } else {
        let ne = clipEnd(c0) + dx
        if (s.snap) ne = snapPoint(ne, marks(), th)
        s.setLive(trimEnd(base, c0.id, ne))
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      st.getState().endGesture()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ----- vạch chia thước -----
  const step = pps >= 100 ? 1 : pps >= 40 ? 2 : pps >= 20 ? 5 : 10
  const ticks = Array.from({ length: Math.floor(width / pps / step) + 1 }, (_, i) => i * step)

  const act = st.getState
  const btn = 'rounded px-2 py-0.5 hover:bg-white/10'

  return (
    <footer className="flex h-60 shrink-0 flex-col border-t" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <div className="flex h-8 shrink-0 items-center gap-1 border-b px-2 text-xs" style={{ borderColor: 'var(--line)' }}>
        <button className={btn} onClick={() => act().split()} title="Tách tại kim chỉ (Ctrl+B)">✂ Tách</button>
        <button className={btn} onClick={() => act().deleteSelected()} title="Xoá clip (Delete)">🗑 Xoá</button>
        <button className={btn} onClick={() => act().duplicateSelected()} title="Nhân đôi clip">⧉ Nhân đôi</button>
        <button
          className={btn}
          onClick={() => act().toggleSnap()}
          title="Bật/tắt nam châm hít"
          style={snap ? { color: 'var(--accent)' } : { color: 'var(--muted)' }}
        >
          🧲 Hít {snap ? 'bật' : 'tắt'}
        </button>
        <label className="ml-auto flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          Thu phóng
          <input type="range" min={10} max={200} value={pps} onChange={(e) => act().setZoom(+e.target.value)} />
        </label>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: HEADER_W + width, minWidth: '100%' }}>
          {/* thước thời gian */}
          <div className="sticky top-0 z-20 flex h-6" style={{ background: 'var(--panel)' }}>
            <div className="sticky left-0 z-30 shrink-0 border-b border-r" style={{ width: HEADER_W, background: 'var(--panel)', borderColor: 'var(--line)' }} />
            <div ref={rulerRef} onPointerDown={scrub} className="relative cursor-pointer border-b" style={{ width, borderColor: 'var(--line)' }}>
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full border-l pl-1 text-[10px] select-none" style={{ left: t * pps, borderColor: 'var(--line)', color: 'var(--muted)' }}>
                  {fmtTime(t).slice(0, 5)}
                </div>
              ))}
            </div>
          </div>

          {/* các dòng */}
          <div ref={lanesRef}>
            {project.tracks.map((track) => (
              <div key={track.id} className="flex border-b" style={{ height: LANE_H, borderColor: 'var(--line)' }}>
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center justify-between border-r px-2 text-xs"
                  style={{ width: HEADER_W, background: 'var(--panel-2)', borderColor: 'var(--line)', color: 'var(--muted)' }}
                >
                  <span className="truncate">{track.name}</span>
                  <span className="flex gap-1">
                    {track.kind === 'video' && (
                      <button title="Ẩn/hiện hình" onClick={() => act().toggleTrack(track.id, 'hidden')} style={{ opacity: track.hidden ? 0.35 : 1 }}>👁</button>
                    )}
                    <button title="Tắt/bật tiếng" onClick={() => act().toggleTrack(track.id, 'muted')} style={{ opacity: track.muted ? 0.35 : 1 }}>🔊</button>
                  </span>
                </div>
                <div
                  className="relative"
                  style={{ width, background: track.kind === 'audio' ? 'rgba(52,211,153,0.04)' : undefined }}
                  onPointerDown={() => act().select(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/myedit-asset')
                    if (!id) return
                    const left = e.currentTarget.getBoundingClientRect().left
                    act().addToTimeline(id, track.id, (e.clientX - left) / pps)
                  }}
                >
                  {project.clips
                    .filter((c) => c.trackId === track.id)
                    .map((c) => {
                      const a = project.assets.find((x) => x.id === c.assetId)
                      const sel = c.id === selectedId
                      return (
                        <div
                          key={c.id}
                          onPointerDown={(e) => startDrag(e, c, 'move')}
                          className="absolute top-1 cursor-grab overflow-hidden rounded text-[11px] text-white select-none"
                          style={{
                            left: c.start * pps,
                            width: Math.max(4, clipDur(c) * pps),
                            height: LANE_H - 8,
                            outline: sel ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)',
                            background: track.kind === 'audio' ? '#0f766e' : '#1e3a5f',
                            backgroundImage: a?.thumb ? `url(${a.thumb})` : undefined,
                            backgroundSize: 'auto 100%',
                            backgroundRepeat: 'repeat-x',
                            opacity: track.hidden ? 0.4 : 1,
                          }}
                        >
                          <div className="truncate bg-black/55 px-1">
                            {a?.name} {c.speed !== 1 && `· ${c.speed.toFixed(1)}x`}
                          </div>
                          <div onPointerDown={(e) => startDrag(e, c, 'l')} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/40" />
                          <div onPointerDown={(e) => startDrag(e, c, 'r')} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/40" />
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* kim chỉ */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px" style={{ left: HEADER_W + playhead * pps, background: 'var(--accent)' }}>
            <div className="absolute -left-1.5 top-0 h-3 w-3 rotate-45" style={{ background: 'var(--accent)' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
