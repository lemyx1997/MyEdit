import { useRef, useState } from 'react'
import { canvasSize } from '../engine/draw'
import { exportMp4, supportsExport } from '../export/exporter'
import { useProject } from '../store'
import { projectDuration } from '../timeline/ops'
import { useUi } from '../ui'

const RES = [
  { label: '720p', side: 720 },
  { label: '1080p', side: 1080 },
  { label: '4K', side: 2160 },
]

export default function ExportDialog() {
  const close = () => useUi.getState().setExportOpen(false)
  const project = useProject((s) => s.project)
  const [side, setSide] = useState(1080)
  const [fps, setFps] = useState(30)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const [W, H] = canvasSize(project.ratio, side)
  const empty = projectDuration(project) <= 0

  const download = (r: { url: string; name: string }) => {
    const a = document.createElement('a')
    a.href = r.url
    a.download = r.name
    a.click()
  }

  const start = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    setProgress(0)
    abort.current = new AbortController()
    try {
      const blob = await exportMp4(project, {
        shortSide: side, fps, signal: abort.current.signal,
        onProgress: (f, l) => { setProgress(f); setLabel(l) },
      })
      const name = (project.name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'video') + '.mp4'
      const r = { url: URL.createObjectURL(blob), name }
      setResult(r)
      download(r)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const chip = (active: boolean) => ({
    background: active ? 'var(--accent)' : 'var(--panel-2)',
    color: active ? '#04222a' : 'var(--text)',
    borderColor: 'var(--line)',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onMouseDown={() => !busy && close()}>
      <div className="w-[420px] rounded-lg border p-5 text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-base font-semibold">Xuất video MP4</h2>

        {!supportsExport() ? (
          <p style={{ color: '#f87171' }}>Trình duyệt của bạn chưa hỗ trợ xuất video. Hãy dùng Chrome hoặc Edge bản mới.</p>
        ) : (
          <>
            <div className="mb-1" style={{ color: 'var(--muted)' }}>Độ phân giải</div>
            <div className="mb-3 flex gap-2">
              {RES.map((r) => (
                <button key={r.side} disabled={busy} onClick={() => setSide(r.side)} className="flex-1 rounded border py-1" style={chip(side === r.side)}>{r.label}</button>
              ))}
            </div>
            <div className="mb-1" style={{ color: 'var(--muted)' }}>Số khung hình mỗi giây</div>
            <div className="mb-3 flex gap-2">
              {[24, 30, 60].map((f) => (
                <button key={f} disabled={busy} onClick={() => setFps(f)} className="flex-1 rounded border py-1" style={chip(fps === f)}>{f} fps</button>
              ))}
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
              Kích thước ảnh: {W}×{H}. {side === 2160 && 'Xuất 4K cần máy khoẻ và có thể mất khá lâu. '}Video được dựng ngay trên máy bạn; xuất càng dài càng chậm.
            </p>

            {busy && (
              <div className="mb-3">
                <div className="h-2 overflow-hidden rounded" style={{ background: 'var(--panel-2)' }}>
                  <div className="h-full" style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--accent)' }} />
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{Math.round(progress * 100)}% · {label}</div>
              </div>
            )}
            {error && <p className="mb-3" style={{ color: '#f87171' }}>{error}</p>}
            {result && (
              <p className="mb-3" style={{ color: '#4ade80' }}>
                Xong! File đã được tải về máy.{' '}
                <button className="underline" onClick={() => download(result)}>Tải lại</button>
              </p>
            )}
            {empty && <p className="mb-3 text-xs" style={{ color: '#fbbf24' }}>Chưa có clip nào trên dòng thời gian.</p>}
          </>
        )}

        <div className="flex justify-end gap-2">
          {busy ? (
            <button className="rounded border px-4 py-1.5" style={{ borderColor: 'var(--line)' }} onClick={() => abort.current?.abort()}>Huỷ xuất</button>
          ) : (
            <>
              <button className="rounded border px-4 py-1.5" style={{ borderColor: 'var(--line)' }} onClick={close}>Đóng</button>
              {supportsExport() && (
                <button disabled={empty} className="rounded px-4 py-1.5 font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: '#04222a' }} onClick={start}>
                  Bắt đầu xuất
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
