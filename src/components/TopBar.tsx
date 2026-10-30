import { useProject } from '../store'
import { useUi } from '../ui'
import type { Ratio } from '../types'

const RATIOS: Ratio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9']

export default function TopBar() {
  const { theme, toggleTheme, setExportOpen } = useUi()
  const name = useProject((s) => s.project.name)
  const ratio = useProject((s) => s.project.ratio)
  const canUndo = useProject((s) => s.past.length > 0)
  const canRedo = useProject((s) => s.future.length > 0)
  const { setName, setRatio, undo, redo } = useProject.getState()

  return (
    <header className="flex h-12 items-center gap-3 border-b px-3" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
        <span className="text-lg">▶</span> MyEdit
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Tên dự án"
        className="w-56 rounded bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
      />
      <div className="ml-2 flex gap-1">
        <button disabled={!canUndo} onClick={undo} title="Hoàn tác (Ctrl+Z)" className="rounded px-2 py-1 text-sm disabled:opacity-30">↶</button>
        <button disabled={!canRedo} onClick={redo} title="Làm lại (Ctrl+Shift+Z)" className="rounded px-2 py-1 text-sm disabled:opacity-30">↷</button>
      </div>
      <div className="flex-1" />
      <select
        value={ratio}
        onChange={(e) => setRatio(e.target.value as Ratio)}
        aria-label="Tỉ lệ khung hình"
        className="rounded border px-2 py-1 text-sm"
        style={{ background: 'var(--panel-2)', borderColor: 'var(--line)' }}
      >
        {RATIOS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <button onClick={toggleTheme} className="rounded border px-2 py-1 text-sm" style={{ borderColor: 'var(--line)' }}>
        {theme === 'dark' ? '☀ Sáng' : '🌙 Tối'}
      </button>
      <button onClick={() => setExportOpen(true)} className="rounded px-4 py-1.5 text-sm font-semibold" style={{ background: 'var(--accent)', color: '#04222a' }}>
        Xuất video
      </button>
    </header>
  )
}
