import { useRef, useState } from 'react'
import { canvasSize } from '../engine/draw'
import { exportMp4, supportsExport } from '../export/exporter'
import { useT } from '../i18n'
import { useProject } from '../store'
import { projectDuration } from '../timeline/ops'
import type { Ratio } from '../types'
import { useUi } from '../ui'
import { Modal } from './Dialogs'
import { accentBtn, line } from './ui'

const RES = [
  { label: '720p', side: 720 },
  { label: '1080p', side: 1080 },
  { label: '4K', side: 2160 },
]

/** Cài đặt xuất sẵn cho từng nền tảng. */
const PRESETS: { label: string; ratio: Ratio; side: number; fps: number }[] = [
  { label: 'TikTok / Reels / Shorts', ratio: '9:16', side: 1080, fps: 30 },
  { label: 'YouTube (ngang)', ratio: '16:9', side: 1080, fps: 30 },
  { label: 'Instagram vuông', ratio: '1:1', side: 1080, fps: 30 },
  { label: 'Instagram 4:5', ratio: '4:5', side: 1080, fps: 30 },
  { label: 'Nhẹ để gửi Zalo / Messenger', ratio: '16:9', side: 720, fps: 24 },
]

export default function ExportDialog() {
  const t = useT()
  const close = () => useUi.getState().setExportOpen(false)
  const project = useProject((s) => s.project)
  const setRatio = useProject((s) => s.setRatio)
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
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        const m = e instanceof Error ? e.message : String(e)
        setError(/memory|alloc/i.test(m) ? t('Máy hết bộ nhớ khi xuất. Hãy chọn độ phân giải thấp hơn hoặc rút ngắn video.') : m)
      }
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
    <Modal title={t('Xuất video MP4')} onClose={() => !busy && close()}>
      {!supportsExport() ? (
        <p style={{ color: '#f87171' }}>{t('Trình duyệt của bạn chưa hỗ trợ xuất video. Hãy dùng Chrome hoặc Edge bản mới.')}</p>
      ) : (
        <>
          <div className="mb-1" style={{ color: 'var(--muted)' }}>{t('Cài đặt sẵn cho nền tảng')}</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label} disabled={busy} className="rounded border px-2 py-1 text-xs"
                style={chip(project.ratio === p.ratio && side === p.side && fps === p.fps)}
                onClick={() => { setRatio(p.ratio); setSide(p.side); setFps(p.fps) }}
              >
                {t(p.label)}
              </button>
            ))}
          </div>
          <div className="mb-1" style={{ color: 'var(--muted)' }}>{t('Độ phân giải')}</div>
          <div className="mb-3 flex gap-2">
            {RES.map((r) => (
              <button key={r.side} disabled={busy} onClick={() => setSide(r.side)} className="flex-1 rounded border py-1" style={chip(side === r.side)}>{r.label}</button>
            ))}
          </div>
          <div className="mb-1" style={{ color: 'var(--muted)' }}>{t('Số khung hình mỗi giây')}</div>
          <div className="mb-3 flex gap-2">
            {[24, 30, 60].map((f) => (
              <button key={f} disabled={busy} onClick={() => setFps(f)} className="flex-1 rounded border py-1" style={chip(fps === f)}>{f} fps</button>
            ))}
          </div>
          <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
            {t('Kích thước ảnh')}: {W}×{H} ({project.ratio}). {side === 2160 && `${t('Xuất 4K cần máy khoẻ và có thể mất khá lâu.')} `}
            {t('Video được dựng ngay trên máy bạn; xuất càng dài càng chậm.')}
          </p>

          {busy && (
            <div className="mb-3">
              <div className="h-2 overflow-hidden rounded" style={{ background: 'var(--panel-2)' }}>
                <div className="h-full" style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--accent)' }} />
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{Math.round(progress * 100)}% · {t(label)}</div>
            </div>
          )}
          {error && <p className="mb-3" style={{ color: '#f87171' }}>{error}</p>}
          {result && (
            <p className="mb-3" style={{ color: '#4ade80' }}>
              {t('Xong! File đã được tải về máy.')}{' '}
              <button className="underline" onClick={() => download(result)}>{t('Tải lại')}</button>
            </p>
          )}
          {empty && <p className="mb-3 text-xs" style={{ color: '#fbbf24' }}>{t('Chưa có clip nào trên dòng thời gian.')}</p>}
        </>
      )}

      <div className="flex justify-end gap-2">
        {busy ? (
          <button className="rounded border px-4 py-1.5" style={line} onClick={() => abort.current?.abort()}>{t('Huỷ xuất')}</button>
        ) : (
          <>
            <button className="rounded border px-4 py-1.5" style={line} onClick={close}>{t('Đóng')}</button>
            {supportsExport() && (
              <button disabled={empty} className="rounded px-4 py-1.5 font-semibold disabled:opacity-50" style={accentBtn} onClick={start}>
                {t('Bắt đầu xuất')}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
