import { EN } from './en'
import { useUi } from './ui'

/**
 * Song ngữ Việt / Anh. Chuỗi gốc là tiếng Việt (cũng là khoá); bản tiếng Anh tra trong bảng EN.
 * Chuỗi nào chưa có bản dịch sẽ hiện tiếng Việt thay vì bị trống.
 */
export function translate(lang: 'vi' | 'en', s: string): string {
  return lang === 'en' ? (EN[s] ?? s) : s
}

export function useT() {
  const lang = useUi((s) => s.lang)
  return (s: string) => translate(lang, s)
}
