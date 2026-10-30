import { fmtTime } from '../engine/draw'
import { useProject } from '../store'
import { clipDur } from '../timeline/ops'

export default function Inspector() {
  const clip = useProject((s) => s.project.clips.find((c) => c.id === s.selectedId))
  const asset = useProject((s) => s.project.assets.find((a) => a.id === (s.project.clips.find((c) => c.id === s.selectedId)?.assetId)))
  const patchClip = useProject((s) => s.patchClip)
  const setSpeed = useProject((s) => s.setSpeed)
  const endGesture = useProject((s) => s.endGesture)
  const duplicate = useProject((s) => s.duplicateSelected)
  const remove = useProject((s) => s.deleteSelected)
  const commitSpeed = (v: number) => {
    setSpeed(clip!.id, v)
    endGesture()
  }

  return (
    <aside className="w-72 shrink-0 overflow-auto border-l p-3 text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <h2 className="mb-2 font-semibold">Thuộc tính</h2>
      {!clip || !asset ? (
        <p style={{ color: 'var(--muted)' }}>Chọn một clip trên dòng thời gian để chỉnh âm lượng, tốc độ…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="truncate font-medium" title={asset.name}>{asset.name}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Dài {fmtTime(clipDur(clip))} · bắt đầu {fmtTime(clip.start)}
            </div>
          </div>

          {asset.kind !== 'image' && (
            <>
              <label className="block">
                <div className="mb-1 flex justify-between"><span>Âm lượng</span><span>{Math.round(clip.volume * 100)}%</span></div>
                <input
                  type="range" min={0} max={1} step={0.01} value={clip.volume} className="w-full"
                  onChange={(e) => patchClip(clip.id, { volume: +e.target.value }, true)}
                  onPointerUp={endGesture} onKeyUp={endGesture} onBlur={endGesture}
                />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={clip.muted} onChange={(e) => patchClip(clip.id, { muted: e.target.checked })} />
                Tắt tiếng clip này
              </label>
              <div>
                <div className="mb-1 flex justify-between"><span>Tốc độ</span><span>{clip.speed.toFixed(1)}x</span></div>
                <input
                  type="range" min={0.1} max={10} step={0.1} value={clip.speed} className="w-full"
                  onChange={(e) => setSpeed(clip.id, +e.target.value)}
                  onPointerUp={endGesture} onKeyUp={endGesture} onBlur={endGesture}
                />
                <div className="mt-1 flex gap-1">
                  {[0.5, 1, 2, 4].map((v) => (
                    <button key={v} onClick={() => commitSpeed(v)} className="flex-1 rounded border px-1 py-0.5 text-xs" style={{ borderColor: 'var(--line)' }}>
                      {v}x
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {asset.kind === 'image' && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Kéo mép phải của ảnh trên dòng thời gian để đổi thời lượng hiển thị.</p>
          )}

          <div className="flex gap-2">
            <button onClick={duplicate} className="flex-1 rounded border px-2 py-1" style={{ borderColor: 'var(--line)' }}>Nhân đôi</button>
            <button onClick={remove} className="flex-1 rounded border px-2 py-1" style={{ borderColor: 'var(--line)', color: '#f87171' }}>Xoá</button>
          </div>
        </div>
      )}
    </aside>
  )
}
