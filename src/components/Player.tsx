import { useUi, type Ratio } from '../store'

const AR: Record<Ratio, number> = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3, '21:9': 21 / 9 }

export default function Player() {
  const ratio = useUi((s) => s.ratio)
  const ar = AR[ratio]
  return (
    <section className="flex min-w-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <div
          className="flex items-center justify-center rounded text-sm"
          style={{
            aspectRatio: ar,
            maxHeight: '100%',
            maxWidth: '100%',
            height: ar < 1 ? '100%' : undefined,
            width: ar >= 1 ? '100%' : undefined,
            background: '#000',
            color: '#667',
          }}
        >
          Khung xem trước · {ratio}
        </div>
      </div>
      <div className="flex h-10 items-center justify-center gap-4 border-t text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)', color: 'var(--muted)' }}>
        <button disabled title="Tua lại">⏮</button>
        <button disabled title="Phát / Dừng (Space)" className="text-lg">▶</button>
        <button disabled title="Tua tới">⏭</button>
        <span className="font-mono text-xs">00:00.00 / 00:00.00</span>
      </div>
    </section>
  )
}
