import { useUi, type Ratio } from '../store'

const RATIOS: Ratio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9']

export default function TopBar() {
  const { projectName, setProjectName, ratio, setRatio, theme, toggleTheme } = useUi()
  return (
    <header className="flex h-12 items-center gap-3 border-b px-3" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
        <span className="text-lg">▶</span> MyEdit
      </div>
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        aria-label="Tên dự án"
        className="w-56 rounded bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
      />
      <div className="ml-2 flex gap-1">
        <button disabled title="Hoàn tác (Ctrl+Z)" className="rounded px-2 py-1 text-sm opacity-40">↶</button>
        <button disabled title="Làm lại (Ctrl+Shift+Z)" className="rounded px-2 py-1 text-sm opacity-40">↷</button>
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
      <button disabled className="rounded px-4 py-1.5 text-sm font-semibold opacity-60" style={{ background: 'var(--accent)', color: '#04222a' }} title="Sẽ có ở Giai đoạn 1">
        Xuất video
      </button>
    </header>
  )
}
