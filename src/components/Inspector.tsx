export default function Inspector() {
  return (
    <aside className="w-72 shrink-0 border-l p-3" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <h2 className="mb-2 text-sm font-semibold">Thuộc tính</h2>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Chọn một clip trên dòng thời gian để chỉnh âm lượng, tốc độ, màu, hoạt ảnh…
      </p>
    </aside>
  )
}
