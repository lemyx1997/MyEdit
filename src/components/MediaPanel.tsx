import { TABS, useUi } from '../store'

export default function MediaPanel() {
  const { tab, setTab } = useUi()
  const current = TABS.find((t) => t.id === tab)!
  return (
    <aside className="flex w-80 shrink-0 flex-col border-r" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <nav className="flex flex-wrap gap-1 border-b p-2" style={{ borderColor: 'var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded px-2 py-1 text-xs"
            style={t.id === tab ? { background: 'var(--accent)', color: '#04222a' } : { color: 'var(--muted)' }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto p-3">
        {tab === 'media' ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
            <span className="text-2xl">＋</span>
            Kéo thả video, ảnh, nhạc vào đây
            <span className="text-xs">(có ở Giai đoạn 1)</span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Mục “{current.label}” sẽ được làm ở các giai đoạn sau.</p>
        )}
      </div>
    </aside>
  )
}
