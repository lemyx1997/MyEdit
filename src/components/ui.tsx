import type { ReactNode } from 'react'

export const line = { borderColor: 'var(--line)' }
export const accentBtn = { background: 'var(--accent)', color: '#04222a' }

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b pb-3" style={line}>
      <h3 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export interface KfState {
  /** 'none': chưa có khung chính · 'has': có nhưng không ở vị trí kim chỉ · 'at': đang có đúng tại kim chỉ */
  state: 'none' | 'has' | 'at'
  toggle: () => void
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  onEnd?: () => void
  fmt?: (v: number) => string
  kf?: KfState
}

/** Thanh trượt có nhãn, giá trị, và (tuỳ chọn) nút ◆ để bật khung chính. */
export function Slider({ label, value, min, max, step, onChange, onEnd, fmt, kf }: SliderProps) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: 'var(--muted)' }}>{fmt ? fmt(value) : value}</span>
          {kf && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); kf.toggle() }}
              title={kf.state === 'at' ? 'Xoá khung chính tại đây' : 'Thêm khung chính tại vị trí kim chỉ'}
              style={{ color: kf.state === 'none' ? 'var(--muted)' : 'var(--accent)' }}
            >
              {kf.state === 'at' ? '◆' : '◇'}
            </button>
          )}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value} className="w-full"
        onChange={(e) => onChange(+e.target.value)}
        onPointerUp={onEnd} onKeyUp={onEnd} onBlur={onEnd}
      />
    </label>
  )
}

export function Chip({ active, children, onClick, title }: { active?: boolean; children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded border px-2 py-1 text-xs"
      style={active ? { ...accentBtn, borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', background: 'var(--panel-2)' }}
    >
      {children}
    </button>
  )
}
