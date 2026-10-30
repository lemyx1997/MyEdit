import { DEFAULT_ADJUST, fxOf } from '../fx/anim'
import { ANIM_IN_OUT, ANIM_LOOP, FILTERS, STICKERS, TEXT_PRESETS, TRANSITIONS, DEFAULT_TEXT } from '../fx/catalog'
import { useProject } from '../store'
import type { Tab } from '../ui'
import { Chip, Slider, line } from './ui'

function useSelected() {
  const clip = useProject((s) => s.project.clips.find((c) => c.id === s.selectedId))
  const asset = useProject((s) => s.project.assets.find((a) => a.id === s.project.clips.find((c) => c.id === s.selectedId)?.assetId))
  return { clip, asset }
}

const hint = (t: string) => <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{t}</p>

function TextPanel() {
  const addText = useProject((s) => s.addText)
  return (
    <>
      {hint('Bấm một mẫu để thêm chữ vào vị trí kim chỉ. Sửa nội dung ở bảng bên phải.')}
      <div className="grid grid-cols-2 gap-2">
        {TEXT_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => addText(p.props)}
            className="flex h-16 items-center justify-center overflow-hidden rounded border px-1 text-center"
            style={{ ...line, background: '#222a35' }}
            title={p.label}
          >
            <span
              style={{
                fontFamily: `"${p.props.font}", sans-serif`,
                fontWeight: p.props.bold ? 700 : 400,
                fontStyle: p.props.italic ? 'italic' : 'normal',
                color: p.props.color,
                fontSize: 20,
                WebkitTextStroke: p.props.strokeW ? `${Math.min(2, p.props.strokeW / 4)}px ${p.props.strokeColor}` : undefined,
                textShadow: p.props.shadow ? `${p.props.shadow.x / 2}px ${p.props.shadow.y / 2}px ${p.props.shadow.blur / 2}px ${p.props.shadow.color}` : undefined,
                background: p.props.bg ? p.props.bg.color : undefined,
                padding: p.props.bg ? '2px 8px' : undefined,
                borderRadius: 4,
              }}
            >
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function StickerPanel() {
  const addText = useProject((s) => s.addText)
  return (
    <>
      {hint('Bấm để thêm nhãn dán. Muốn dùng ảnh PNG/GIF của riêng bạn, hãy nhập ở tab Phương tiện rồi kéo lên dòng Video 2.')}
      <div className="grid grid-cols-6 gap-1">
        {STICKERS.map((e) => (
          <button
            key={e}
            onClick={() => addText({ ...DEFAULT_TEXT, text: e, font: 'Arial', bold: false, size: 240 })}
            className="rounded p-1 text-2xl hover:bg-white/10"
          >
            {e}
          </button>
        ))}
      </div>
    </>
  )
}

function EffectsPanel() {
  const { clip } = useSelected()
  const setAnim = useProject((s) => s.setAnim)
  if (!clip) return hint('Chọn một clip trên dòng thời gian, rồi bấm hoạt ảnh muốn dùng.')
  const fx = fxOf(clip)
  const grid = (items: { id: string; label: string }[], cur: string | null | undefined, apply: (id: string | null) => void) => (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Chip active={!cur} onClick={() => apply(null)}>Không</Chip>
      {items.map((a) => (
        <Chip key={a.id} active={cur === a.id} onClick={() => apply(a.id)}>{a.label}</Chip>
      ))}
    </div>
  )
  return (
    <>
      <h4 className="mb-1 text-xs font-semibold">Hoạt ảnh vào</h4>
      {grid(ANIM_IN_OUT, fx.animIn?.id, (id) => setAnim('in', id, fx.animIn?.dur ?? 0.6))}
      <h4 className="mb-1 text-xs font-semibold">Hoạt ảnh ra</h4>
      {grid(ANIM_IN_OUT, fx.animOut?.id, (id) => setAnim('out', id, fx.animOut?.dur ?? 0.6))}
      <h4 className="mb-1 text-xs font-semibold">Hoạt ảnh lặp</h4>
      {grid(ANIM_LOOP, fx.animLoop, (id) => setAnim('loop', id))}
      {hint('Chỉnh thời lượng hoạt ảnh ở bảng Thuộc tính bên phải.')}
    </>
  )
}

function TransitionsPanel() {
  const { clip } = useSelected()
  const setTransition = useProject((s) => s.setTransition)
  const endGesture = useProject((s) => s.endGesture)
  const fx = clip ? fxOf(clip) : null
  return (
    <>
      {hint('Chọn clip đứng SAU chỗ nối (hai clip phải nằm sát nhau trên cùng một dòng), rồi bấm kiểu chuyển cảnh.')}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip active={!fx?.transition} onClick={() => setTransition(null)}>Không</Chip>
        {TRANSITIONS.map((t) => (
          <Chip key={t.id} active={fx?.transition?.id === t.id} onClick={() => setTransition(t.id, fx?.transition?.dur ?? 1)}>{t.label}</Chip>
        ))}
      </div>
      {fx?.transition && (
        <Slider
          label="Thời lượng" value={fx.transition.dur} min={0.2} max={3} step={0.1} fmt={(v) => `${v.toFixed(1)}s`}
          onChange={(v) => setTransition(fx.transition!.id, v)} onEnd={endGesture}
        />
      )}
    </>
  )
}

function FiltersPanel() {
  const { clip, asset } = useSelected()
  const patchFx = useProject((s) => s.patchFx)
  const endGesture = useProject((s) => s.endGesture)
  const fx = clip ? fxOf(clip) : null
  const bg = asset?.thumb ? `center / cover url(${asset.thumb})` : 'linear-gradient(135deg,#f97316,#eab308 30%,#22c55e 55%,#06b6d4 78%,#6366f1)'
  return (
    <>
      {hint(clip ? 'Bấm một bộ lọc để áp dụng cho clip đang chọn.' : 'Chọn một clip trên dòng thời gian trước.')}
      <div className="grid grid-cols-3 gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => patchFx({ filter: f.id })} className="text-center text-[11px]">
            <div
              className="h-14 rounded"
              style={{ background: bg, filter: f.css || undefined, outline: fx?.filter === f.id ? '2px solid var(--accent)' : undefined }}
            />
            <div className="mt-0.5 truncate">{f.label}</div>
          </button>
        ))}
      </div>
      {fx && fx.filter !== 'none' && (
        <div className="mt-3">
          <Slider
            label="Độ đậm bộ lọc" value={fx.filterStrength} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => patchFx({ filterStrength: v }, true)} onEnd={endGesture}
          />
        </div>
      )}
    </>
  )
}

const ADJ: { key: keyof typeof DEFAULT_ADJUST; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Độ sáng', min: -1, max: 1 },
  { key: 'contrast', label: 'Tương phản', min: -1, max: 1 },
  { key: 'saturation', label: 'Độ bão hoà', min: -1, max: 1 },
  { key: 'temperature', label: 'Nhiệt độ màu (lạnh ↔ ấm)', min: -1, max: 1 },
  { key: 'blur', label: 'Làm mờ', min: 0, max: 1 },
  { key: 'sharpen', label: 'Làm sắc nét', min: 0, max: 1 },
  { key: 'vignette', label: 'Làm tối viền (vignette)', min: 0, max: 1 },
]

function AdjustPanel() {
  const { clip } = useSelected()
  const patchFx = useProject((s) => s.patchFx)
  const endGesture = useProject((s) => s.endGesture)
  if (!clip) return hint('Chọn một clip trên dòng thời gian để chỉnh màu.')
  const adj = fxOf(clip).adjust
  return (
    <div className="space-y-3">
      {ADJ.map((a) => (
        <Slider
          key={a.key} label={a.label} value={adj[a.key]} min={a.min} max={a.max} step={0.01}
          fmt={(v) => `${Math.round(v * 100)}`}
          onChange={(v) => patchFx({ adjust: { ...adj, [a.key]: v } }, true)} onEnd={endGesture}
        />
      ))}
      <button className="w-full rounded border py-1 text-sm" style={line} onClick={() => patchFx({ adjust: DEFAULT_ADJUST })}>Đặt lại</button>
    </div>
  )
}

export default function Library({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'text': return <TextPanel />
    case 'stickers': return <StickerPanel />
    case 'effects': return <EffectsPanel />
    case 'transitions': return <TransitionsPanel />
    case 'filters': return <FiltersPanel />
    case 'adjust': return <AdjustPanel />
    default: return hint('Mục này sẽ được làm ở giai đoạn sau (nhạc, ghi âm, phụ đề tự động).')
  }
}
