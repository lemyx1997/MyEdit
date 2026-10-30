import { useT } from '../i18n'
import { useProject } from '../store'
import type { Ratio } from '../types'
import { useUi, type Quality } from '../ui'

const RATIOS: Ratio[] = ['9:16', '16:9', '1:1', '4:5', '4:3', '21:9']
const btn = 'rounded border px-2 py-1 text-sm'
const bd = { borderColor: 'var(--line)' }

export default function TopBar() {
  const t = useT()
  const { theme, toggleTheme, setExportOpen, setTemplatesOpen, setTourOpen, lang, setLang, quality, setQuality } = useUi()
  const name = useProject((s) => s.project.name)
  const ratio = useProject((s) => s.project.ratio)
  const hasClips = useProject((s) => s.project.clips.length > 0 || s.project.assets.length > 0)
  const canUndo = useProject((s) => s.past.length > 0)
  const canRedo = useProject((s) => s.future.length > 0)
  const { setName, setRatio, undo, redo, newProject } = useProject.getState()

  return (
    <header className="flex h-12 items-center gap-2 border-b px-3" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
        <span className="text-lg">▶</span> MyEdit
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={t('Tên dự án')}
        className="w-44 rounded bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
      />
      <div className="flex gap-1">
        <button disabled={!canUndo} onClick={undo} title={t('Hoàn tác (Ctrl+Z)')} className="rounded px-2 py-1 text-sm disabled:opacity-30">↶</button>
        <button disabled={!canRedo} onClick={redo} title={t('Làm lại (Ctrl+Shift+Z)')} className="rounded px-2 py-1 text-sm disabled:opacity-30">↷</button>
      </div>
      <button className={btn} style={bd} onClick={() => setTemplatesOpen(true)}>▦ {t('Mẫu')}</button>
      <button
        className={btn} style={bd} title={t('Dự án mới')}
        onClick={() => {
          if (!hasClips || window.confirm(t('Tạo dự án mới? Dự án hiện tại sẽ bị xoá khỏi trình duyệt (hãy xuất video trước nếu cần).'))) newProject()
        }}
      >
        ＋ {t('Mới')}
      </button>
      <div className="flex-1" />
      <select
        value={quality} onChange={(e) => setQuality(e.target.value as Quality)} aria-label={t('Chất lượng xem trước')} title={t('Chất lượng xem trước (chọn thấp nếu máy giật)')}
        className={btn} style={{ background: 'var(--panel-2)', ...bd }}
      >
        <option value="auto">{t('Xem trước: Tự động')}</option>
        <option value="720">{t('Xem trước: Cao (720p)')}</option>
        <option value="360">{t('Xem trước: Nhẹ (360p)')}</option>
      </select>
      <select value={ratio} onChange={(e) => setRatio(e.target.value as Ratio)} aria-label={t('Tỉ lệ khung hình')} className={btn} style={{ background: 'var(--panel-2)', ...bd }}>
        {RATIOS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <button className={btn} style={bd} onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} title="Tiếng Việt / English">🌐 {lang === 'vi' ? 'VI' : 'EN'}</button>
      <button className={btn} style={bd} onClick={toggleTheme}>{theme === 'dark' ? `☀ ${t('Sáng')}` : `🌙 ${t('Tối')}`}</button>
      <button className={btn} style={bd} onClick={() => setTourOpen(true)} title={t('Hướng dẫn nhanh')}>?</button>
      <button onClick={() => setExportOpen(true)} className="rounded px-4 py-1.5 text-sm font-semibold" style={{ background: 'var(--accent)', color: '#04222a' }}>
        {t('Xuất video')}
      </button>
    </header>
  )
}
