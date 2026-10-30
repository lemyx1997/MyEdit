import { useEffect } from 'react'
import { TemplatesDialog, Tutorial } from './components/Dialogs'
import ExportDialog from './components/ExportDialog'
import Inspector from './components/Inspector'
import MediaPanel from './components/MediaPanel'
import Player from './components/Player'
import Timeline from './components/Timeline'
import TopBar from './components/TopBar'
import { useT } from './i18n'
import { registerFile } from './media'
import { loadProject, saveProject } from './persist'
import { useProject } from './store'
import { useUi } from './ui'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return el.tagName === 'INPUT' && !['range', 'checkbox'].includes((el as HTMLInputElement).type)
}

export default function App() {
  const t = useT()
  const exportOpen = useUi((s) => s.exportOpen)
  const notice = useUi((s) => s.notice)
  const templatesOpen = useUi((s) => s.templatesOpen)
  const tourOpen = useUi((s) => s.tourOpen)

  // Mở lại dự án đã lưu, sau đó tự lưu mỗi khi có thay đổi
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    void loadProject().then((saved) => {
      if (saved) {
        for (const [id, blob] of saved.blobs) registerFile(id, blob)
        const assets = saved.project.assets.filter((a) => saved.blobs.has(a.id))
        saved.project.assets = assets
        saved.project.clips = saved.project.clips.filter((c) => c.text || assets.some((a) => a.id === c.assetId))
      }
      useProject.getState().hydrate(saved?.project ?? null)
    })
    const unsub = useProject.subscribe((s, prev) => {
      if (!s.loaded || s.project === prev.project) return
      clearTimeout(timer)
      timer = setTimeout(() => void saveProject(s.project), 500)
    })
    return () => { unsub(); clearTimeout(timer) }
  }, [])

  // Lỗi bất ngờ (không phải do người dùng huỷ) → báo nhẹ nhàng, không làm mất dự án
  useEffect(() => {
    const onRej = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof DOMException && e.reason.name === 'AbortError') return
      useUi.getState().setNotice('Có lỗi nhỏ xảy ra, nhưng dự án vẫn an toàn. Nếu lặp lại, hãy tải lại trang.')
    }
    window.addEventListener('unhandledrejection', onRej)
    return () => window.removeEventListener('unhandledrejection', onRej)
  }, [])

  // Phím tắt giống CapCut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const s = useProject.getState()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (e.code === 'Space') {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        s.toggle()
      } else if (mod && k === 'b') { e.preventDefault(); s.split() }
      else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? s.redo() : s.undo() }
      else if (mod && k === 'y') { e.preventDefault(); s.redo() }
      else if (mod && k === 'c') s.copy()
      else if (mod && k === 'v') s.paste()
      else if (mod && k === 'd') { e.preventDefault(); s.duplicateSelected() }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); s.deleteSelected() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full min-w-[1100px] flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <MediaPanel />
        <Player />
        <Inspector />
      </div>
      <Timeline />
      {exportOpen && <ExportDialog />}
      {templatesOpen && <TemplatesDialog />}
      {tourOpen && <Tutorial />}
      {notice && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
          {t(notice)}
        </div>
      )}
    </div>
  )
}
