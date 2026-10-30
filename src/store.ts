import { create } from 'zustand'

export type Ratio = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | '21:9'
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

interface UiState {
  projectName: string
  ratio: Ratio
  tab: Tab
  theme: 'dark' | 'light'
  setProjectName: (n: string) => void
  setRatio: (r: Ratio) => void
  setTab: (t: Tab) => void
  toggleTheme: () => void
}

export const useUi = create<UiState>((set) => ({
  projectName: 'Dự án chưa đặt tên',
  ratio: '16:9',
  tab: 'media',
  theme: 'dark',
  setProjectName: (projectName) => set({ projectName }),
  setRatio: (ratio) => set({ ratio }),
  setTab: (tab) => set({ tab }),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = theme
      return { theme }
    }),
}))
