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

/** Trạng thái giao diện thuần tuý (không thuộc dự án). */
interface UiState {
  tab: Tab
  theme: 'dark' | 'light'
  exportOpen: boolean
  notice: string | null
  setTab: (t: Tab) => void
  toggleTheme: () => void
  setExportOpen: (v: boolean) => void
  setNotice: (n: string | null) => void
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

export const useUi = create<UiState>((set) => ({
  tab: 'media',
  theme: 'dark',
  exportOpen: false,
  notice: null,
  setTab: (tab) => set({ tab }),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = theme
      return { theme }
    }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  setNotice: (notice) => {
    clearTimeout(noticeTimer)
    set({ notice })
    if (notice) noticeTimer = setTimeout(() => set({ notice: null }), 6000)
  },
}))
