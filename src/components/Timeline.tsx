const TRACKS = ['Chữ / Hiệu ứng', 'Video 1', 'Âm thanh']

export default function Timeline() {
  return (
    <footer className="flex h-56 shrink-0 flex-col border-t" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <div className="flex h-8 items-center gap-3 border-b px-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
        <button disabled title="Tách (Ctrl+B)">✂ Tách</button>
        <button disabled title="Xóa (Delete)">🗑 Xóa</button>
        <label className="ml-auto flex items-center gap-1">
          Thu phóng <input type="range" disabled />
        </label>
      </div>
      <div className="flex-1 overflow-auto">
        {TRACKS.map((name) => (
          <div key={name} className="flex h-12 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="w-28 shrink-0 border-r px-2 py-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)', background: 'var(--panel-2)' }}>
              {name}
            </div>
            <div className="flex-1" />
          </div>
        ))}
      </div>
    </footer>
  )
}
