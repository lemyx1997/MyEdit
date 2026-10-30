import { create } from 'zustand'

export type Tab = 'media' | 'audio' | 'text' | 'stickers' | 'effects' | 'transitions' | 'captions' | 'filters' | 'adjust'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'media', label: 'Phương tiện' },
  { id: 'audio', label: 'Âm thanh' },
  { id: 'text', label: 'Văn bản' },
  { id: 'stickers', label: 'Nhãn dán' },
  { id: 'effects', label: 'Hiệu ứng' },
  { id: 'transitions', label: 'Chuyển cảnh' },
  { id: 'captions', label: 'Phụ đề' },
  { id: 'filters', label: 'Bộ lọc' },
  { id: 'adjust', label: 'Điều chỉnh' },
]

export type Lang = 'vi' | 'en'
export type Quality = 'auto' | '720' | '360'

const store = {
  get: (k: string): string | null => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  set: (k: string, v: string) => {
    try { localStorage.setItem(k, v) } catch { /* bỏ qua (chế độ ẩn danh) */ }
  },
}

/** Trạng thái giao diện thuần tuý (không thuộc dự án). */
interface UiState {
  tab: Tab
  theme: 'dark' | 'light'
  lang: Lang
  quality: Quality
  /** Máy quá chậm: tự hạ chất lượng xem trước */
  autoLow: boolean
  exportOpen: boolean
  templatesOpen: boolean
  tourOpen: boolean
  notice: string | null
  setTab: (t: Tab) => void
  toggleTheme: () => void
  setLang: (l: Lang) => void
  setQuality: (q: Quality) => void
  setAutoLow: (v: boolean) => void
  setExportOpen: (v: boolean) => void
  setTemplatesOpen: (v: boolean) => void
  setTourOpen: (v: boolean) => void
  setNotice: (n: string | null) => void
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined
const savedLang = store.get('myedit-lang')
const savedQuality = store.get('myedit-quality')

export const useUi = create<UiState>((set) => ({
  tab: 'media',
  theme: 'dark',
  lang: savedLang === 'en' ? 'en' : 'vi',
  quality: savedQuality === '720' || savedQuality === '360' ? savedQuality : 'auto',
  autoLow: false,
  exportOpen: false,
  templatesOpen: false,
  tourOpen: store.get('myedit-tour') !== 'done',
  notice: null,
  setTab: (tab) => set({ tab }),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = theme
      return { theme }
    }),
  setLang: (lang) => {
    store.set('myedit-lang', lang)
    document.documentElement.lang = lang
    set({ lang })
  },
  setQuality: (quality) => {
    store.set('myedit-quality', quality)
    set({ quality, autoLow: false })
  },
  setAutoLow: (autoLow) => set({ autoLow }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  setTemplatesOpen: (templatesOpen) => set({ templatesOpen }),
  setTourOpen: (tourOpen) => {
    if (!tourOpen) store.set('myedit-tour', 'done')
    set({ tourOpen })
  },
  setNotice: (notice) => {
    clearTimeout(noticeTimer)
    set({ notice })
    if (notice) noticeTimer = setTimeout(() => set({ notice: null }), 6000)
  },
}))
