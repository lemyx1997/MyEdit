import { useRef, useState } from 'react'
import { fmtTime } from '../engine/draw'
import { useProject } from '../store'
import { TABS, useUi } from '../ui'
import Library from './Library'

const KIND_ICON = { video: '🎬', audio: '🎵', image: '🖼' } as const

export default function MediaPanel() {
  const { tab, setTab } = useUi()
  const assets = useProject((s) => s.project.assets)
  const addAssets = useProject((s) => s.addAssets)
  const addToTimeline = useProject((s) => s.addToTimeline)
  const removeAsset = useProject((s) => s.removeAsset)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
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
          <>
            <div
              onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setOver(false)
                void addAssets([...e.dataTransfer.files])
              }}
              className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-sm"
              style={{ borderColor: over ? 'var(--accent)' : 'var(--line)', color: 'var(--muted)' }}
            >
              <span className="text-2xl">＋</span>
              Kéo thả hoặc bấm để nhập video, ảnh, nhạc
              <input
                ref={input}
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                hidden
                onChange={(e) => {
                  void addAssets([...(e.target.files ?? [])])
                  e.target.value = ''
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {assets.map((a) => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/myedit-asset', a.id)}
                  className="group relative cursor-grab overflow-hidden rounded border text-xs"
                  style={{ borderColor: 'var(--line)', background: 'var(--panel-2)' }}
                  title="Kéo xuống dòng thời gian, hoặc bấm dấu + để thêm"
                >
                  <div className="flex h-16 items-center justify-center text-2xl" style={a.thumb ? { background: `center / cover url(${a.thumb})` } : undefined}>
                    {!a.thumb && KIND_ICON[a.kind]}
                  </div>
                  <div className="truncate px-1.5 pt-1">{a.name}</div>
                  <div className="px-1.5 pb-1" style={{ color: 'var(--muted)' }}>
                    {KIND_ICON[a.kind]} {a.kind === 'image' ? 'Ảnh' : fmtTime(a.duration)}
                  </div>
                  <button
                    onClick={() => addToTimeline(a.id)}
                    className="absolute right-1 top-1 hidden h-6 w-6 rounded-full text-sm font-bold group-hover:block"
                    style={{ background: 'var(--accent)', color: '#04222a' }}
                    title="Thêm vào dòng thời gian"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeAsset(a.id)}
                    className="absolute left-1 top-1 hidden h-5 w-5 rounded-full bg-black/70 text-xs text-white group-hover:block"
                    title="Xoá khỏi thư viện"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {assets.length === 0 && (
              <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
                File được xử lý ngay trên máy bạn, không tải lên mạng.
              </p>
            )}
          </>
        ) : (
          <Library tab={current.id} />
        )}
      </div>
    </aside>
  )
}
