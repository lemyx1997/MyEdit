import { fmtTime } from '../engine/draw'
import { fxOf, hasKfAt, valueAt } from '../fx/anim'
import { BLENDS, FONTS, MASKS } from '../fx/catalog'
import { useProject } from '../store'
import { clamp, clipDur } from '../timeline/ops'
import type { BlendMode, Clip, KfProp, MaskShape, Ratio, TextProps } from '../types'
import { Chip, Section, Slider, line, type KfState } from './ui'

const RATIOS: Ratio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9']
const field = { background: 'var(--panel-2)', borderColor: 'var(--line)' }

function ProjectSettings() {
  const project = useProject((s) => s.project)
  const setRatio = useProject((s) => s.setRatio)
  const setBg = useProject((s) => s.setBg)
  const bg = project.bg ?? { type: 'black' as const }
  const images = project.assets.filter((a) => a.kind === 'image' || a.kind === 'video')
  return (
    <>
      <p className="mb-2" style={{ color: 'var(--muted)' }}>Chọn một clip trên dòng thời gian để chỉnh chi tiết. Dưới đây là cài đặt chung của dự án.</p>
      <Section title="Khung hình">
        <div className="flex flex-wrap gap-1.5">
          {RATIOS.map((r) => <Chip key={r} active={project.ratio === r} onClick={() => setRatio(r)}>{r}</Chip>)}
        </div>
      </Section>
      <Section title="Nền (khi video không vừa khung)">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={bg.type === 'black'} onClick={() => setBg({ type: 'black' })}>Đen</Chip>
          <Chip active={bg.type === 'color'} onClick={() => setBg({ type: 'color', color: bg.type === 'color' ? bg.color : '#1e293b' })}>Màu</Chip>
          <Chip active={bg.type === 'blur'} onClick={() => setBg({ type: 'blur' })}>Nhoè theo video</Chip>
          <Chip active={bg.type === 'image'} onClick={() => images[0] && setBg({ type: 'image', assetId: images[0].id })}>Ảnh</Chip>
        </div>
        {bg.type === 'color' && (
          <input type="color" value={bg.color} onChange={(e) => setBg({ type: 'color', color: e.target.value })} className="h-8 w-full" />
        )}
        {bg.type === 'image' && (
          <select
            value={bg.assetId} onChange={(e) => setBg({ type: 'image', assetId: e.target.value })}
            className="w-full rounded border px-2 py-1" style={field}
          >
            {images.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {images.length === 0 && bg.type !== 'image' && <p className="text-xs" style={{ color: 'var(--muted)' }}>Muốn dùng ảnh làm nền, hãy nhập ảnh ở tab Phương tiện trước.</p>}
      </Section>
    </>
  )
}

function TextEditor({ clip }: { clip: Clip }) {
  const updateText = useProject((s) => s.updateText)
  const endGesture = useProject((s) => s.endGesture)
  const t = clip.text as TextProps
  const set = (patch: Partial<TextProps>, live = false) => updateText(patch, live)
  return (
    <Section title="Chữ">
      <textarea
        value={t.text} rows={3} onChange={(e) => set({ text: e.target.value }, true)} onBlur={endGesture}
        className="w-full rounded border px-2 py-1" style={field}
      />
      <select value={t.font} onChange={(e) => set({ font: e.target.value })} className="w-full rounded border px-2 py-1" style={{ ...field, fontFamily: `"${t.font}"` }}>
        {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>{f}</option>)}
      </select>
      <Slider label="Cỡ chữ" value={t.size} min={20} max={400} step={1} onChange={(v) => set({ size: v }, true)} onEnd={endGesture} />
      <div className="flex flex-wrap items-center gap-1.5">
        <input type="color" value={t.color} onChange={(e) => set({ color: e.target.value }, true)} onBlur={endGesture} title="Màu chữ" className="h-7 w-9" />
        <Chip active={t.bold} onClick={() => set({ bold: !t.bold })}><b>B</b></Chip>
        <Chip active={t.italic} onClick={() => set({ italic: !t.italic })}><i>I</i></Chip>
        {(['left', 'center', 'right'] as const).map((a) => (
          <Chip key={a} active={t.align === a} onClick={() => set({ align: a })}>{a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}</Chip>
        ))}
      </div>
      <Slider label="Viền chữ" value={t.strokeW} min={0} max={20} step={0.5} onChange={(v) => set({ strokeW: v }, true)} onEnd={endGesture} />
      {t.strokeW > 0 && (
        <input type="color" value={t.strokeColor} onChange={(e) => set({ strokeColor: e.target.value }, true)} onBlur={endGesture} title="Màu viền" className="h-7 w-full" />
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!t.shadow} onChange={(e) => set({ shadow: e.target.checked ? { color: '#000000', blur: 10, x: 4, y: 4 } : null })} />
        Đổ bóng / phát sáng
      </label>
      {t.shadow && (
        <div className="flex items-center gap-2">
          <input type="color" value={t.shadow.color} onChange={(e) => set({ shadow: { ...t.shadow!, color: e.target.value } }, true)} onBlur={endGesture} className="h-7 w-9" />
          <input
            type="range" min={0} max={40} value={t.shadow.blur} className="flex-1" title="Độ nhoè bóng"
            onChange={(e) => set({ shadow: { ...t.shadow!, blur: +e.target.value } }, true)} onPointerUp={endGesture}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!t.bg} onChange={(e) => set({ bg: e.target.checked ? { color: '#000000', alpha: 0.6 } : null })} />
        Nền sau chữ
      </label>
      {t.bg && (
        <div className="flex items-center gap-2">
          <input type="color" value={t.bg.color} onChange={(e) => set({ bg: { ...t.bg!, color: e.target.value } }, true)} onBlur={endGesture} className="h-7 w-9" />
          <input
            type="range" min={0} max={1} step={0.05} value={t.bg.alpha} className="flex-1" title="Độ đậm nền"
            onChange={(e) => set({ bg: { ...t.bg!, alpha: +e.target.value } }, true)} onPointerUp={endGesture}
          />
        </div>
      )}
    </Section>
  )
}

export default function Inspector() {
  const clip = useProject((s) => s.project.clips.find((c) => c.id === s.selectedId))
  const asset = useProject((s) => s.project.assets.find((a) => a.id === s.project.clips.find((c) => c.id === s.selectedId)?.assetId))
  const playhead = useProject((s) => s.playhead)
  const setProp = useProject((s) => s.setProp)
  const toggleKf = useProject((s) => s.toggleKf)
  const patchFx = useProject((s) => s.patchFx)
  const patchClip = useProject((s) => s.patchClip)
  const setSpeed = useProject((s) => s.setSpeed)
  const setAnim = useProject((s) => s.setAnim)
  const endGesture = useProject((s) => s.endGesture)
  const duplicate = useProject((s) => s.duplicateSelected)
  const remove = useProject((s) => s.deleteSelected)

  const body = () => {
    if (!clip) return <ProjectSettings />
    const fx = fxOf(clip)
    const local = clamp(playhead - clip.start, 0, clipDur(clip))
    const isMedia = !!asset && asset.kind !== 'image'
    const baseOf = (p: KfProp) => (p === 'volume' ? clip.volume : fx[p])
    const val = (p: KfProp) => valueAt(clip.kfs?.[p], local, baseOf(p))
    const kf = (p: KfProp): KfState => ({
      state: hasKfAt(clip.kfs?.[p], local) ? 'at' : clip.kfs?.[p]?.length ? 'has' : 'none',
      toggle: () => toggleKf(p),
    })
    const S = (p: KfProp, label: string, min: number, max: number, step: number, fmt: (v: number) => string) => (
      <Slider label={label} value={val(p)} min={min} max={max} step={step} fmt={fmt} kf={kf(p)} onChange={(v) => setProp(p, v, true)} onEnd={endGesture} />
    )
    return (
      <div>
        <div className="mb-1">
          <div className="truncate font-medium" title={asset?.name}>{clip.text ? (clip.text.text.split('\n')[0] || 'Chữ') : asset?.name}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Dài {fmtTime(clipDur(clip))} · bắt đầu {fmtTime(clip.start)}</div>
        </div>

        {clip.text && <TextEditor clip={clip} />}

        <Section title="Vị trí & kích thước (◇ = khung chính)">
          {S('x', 'Ngang', -1, 1, 0.005, (v) => `${Math.round(v * 100)}%`)}
          {S('y', 'Dọc', -1, 1, 0.005, (v) => `${Math.round(v * 100)}%`)}
          {S('scale', 'Phóng to', 0.05, 5, 0.01, (v) => `${Math.round(v * 100)}%`)}
          {S('rotation', 'Xoay', -360, 360, 1, (v) => `${Math.round(v)}°`)}
          {S('opacity', 'Độ trong suốt', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`)}
        </Section>

        <Section title="Hoà trộn & mặt nạ">
          <select value={fx.blend} onChange={(e) => patchFx({ blend: e.target.value as BlendMode })} className="w-full rounded border px-2 py-1" style={field}>
            {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {MASKS.map((m) => <Chip key={m.id} active={fx.mask === m.id} onClick={() => patchFx({ mask: m.id as MaskShape })}>{m.label}</Chip>)}
          </div>
        </Section>

        {!clip.text && (
          <Section title="Xoá phông xanh (chroma key)">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fx.chroma.on} onChange={(e) => patchFx({ chroma: { ...fx.chroma, on: e.target.checked } })} />
              Bật xoá phông
            </label>
            {fx.chroma.on && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <input type="color" value={fx.chroma.color} onChange={(e) => patchFx({ chroma: { ...fx.chroma, color: e.target.value } }, true)} onBlur={endGesture} className="h-7 w-9" />
                  Màu cần xoá
                </div>
                <Slider label="Độ nhạy" value={fx.chroma.tolerance} min={0.05} max={0.9} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => patchFx({ chroma: { ...fx.chroma, tolerance: v } }, true)} onEnd={endGesture} />
              </>
            )}
          </Section>
        )}

        {(fx.animIn || fx.animOut) && (
          <Section title="Thời lượng hoạt ảnh">
            {fx.animIn && (
              <Slider label="Hoạt ảnh vào" value={fx.animIn.dur} min={0.1} max={3} step={0.1} fmt={(v) => `${v.toFixed(1)}s`}
                onChange={(v) => { setAnim('in', fx.animIn!.id, v) }} onEnd={endGesture} />
            )}
            {fx.animOut && (
              <Slider label="Hoạt ảnh ra" value={fx.animOut.dur} min={0.1} max={3} step={0.1} fmt={(v) => `${v.toFixed(1)}s`}
                onChange={(v) => { setAnim('out', fx.animOut!.id, v) }} onEnd={endGesture} />
            )}
          </Section>
        )}

        {isMedia && (
          <Section title="Âm thanh & tốc độ">
            {S('volume', 'Âm lượng', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`)}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={clip.muted} onChange={(e) => patchClip(clip.id, { muted: e.target.checked })} />
              Tắt tiếng clip này
            </label>
            <div>
              <Slider label="Tốc độ" value={clip.speed} min={0.1} max={10} step={0.1} fmt={(v) => `${v.toFixed(1)}x`}
                onChange={(v) => setSpeed(clip.id, v)} onEnd={endGesture} />
              <div className="mt-1 flex gap-1">
                {[0.5, 1, 2, 4].map((v) => (
                  <button key={v} onClick={() => { setSpeed(clip.id, v); endGesture() }} className="flex-1 rounded border px-1 py-0.5 text-xs" style={line}>{v}x</button>
                ))}
              </div>
            </div>
          </Section>
        )}
        {asset?.kind === 'image' && (
          <p className="my-3 text-xs" style={{ color: 'var(--muted)' }}>Kéo mép phải của ảnh trên dòng thời gian để đổi thời lượng hiển thị.</p>
        )}

        <div className="mt-3 flex gap-2">
          <button onClick={duplicate} className="flex-1 rounded border px-2 py-1" style={line}>Nhân đôi</button>
          <button onClick={remove} className="flex-1 rounded border px-2 py-1" style={{ ...line, color: '#f87171' }}>Xoá</button>
        </div>
      </div>
    )
  }

  return (
    <aside className="w-72 shrink-0 overflow-auto border-l p-3 text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <h2 className="mb-2 font-semibold">Thuộc tính</h2>
      {body()}
    </aside>
  )
}
