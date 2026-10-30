import type { TextProps } from '../types'
import { DEFAULT_TEXT, TEXT_PRESETS } from './catalog'

const base = DEFAULT_TEXT

export interface CaptionStyle {
  id: string
  label: string
  props: TextProps
  y: number
}
const capBase: TextProps = { ...base, text: '', size: 56, bold: true }
export const CAPTION_STYLES: CaptionStyle[] = [
  { id: 'classic', label: 'Trắng nền đen', props: { ...capBase, bg: { color: '#000000', alpha: 0.6 } }, y: 0.36 },
  { id: 'yellow', label: 'Vàng viền đen', props: { ...capBase, color: '#facc15', strokeW: 6 }, y: 0.36 },
  { id: 'tiktok', label: 'TikTok in đậm', props: { ...capBase, font: 'Anton', bold: false, size: 78, strokeW: 8 }, y: 0.3 },
  { id: 'soft', label: 'Mềm mại có bóng', props: { ...capBase, font: 'Montserrat', size: 52, shadow: { color: '#000000', blur: 10, x: 2, y: 2 } }, y: 0.36 },
]

/** Ngắt dòng cho phụ đề dài (khoảng `max` ký tự mỗi dòng). */
export function wrapCaption(text: string, max = 34): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? cur + ' ' + w : w
    }
  }
  if (cur) lines.push(cur)
  return lines.join('\n')
}

export interface Template {
  id: string
  label: string
  desc: string
  ratio: '9:16' | '16:9' | '1:1' | '4:5'
  bg: { type: 'black' } | { type: 'blur' } | { type: 'color'; color: string }
  texts: { props: TextProps; start: number; dur: number; y: number }[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'tiktok', label: 'TikTok / Reels', desc: '9:16, tiêu đề lớn + phụ đề dưới', ratio: '9:16', bg: { type: 'blur' },
    texts: [
      { props: { ...TEXT_PRESETS[0].props, text: 'TIÊU ĐỀ\nVIDEO', size: 130 }, start: 0, dur: 3, y: -0.3 },
      { props: { ...capBase, text: 'Phụ đề của bạn ở đây', bg: { color: '#000000', alpha: 0.6 } }, start: 3, dur: 4, y: 0.32 },
    ],
  },
  {
    id: 'shorts', label: 'YouTube Shorts', desc: '9:16, chữ vàng nổi bật', ratio: '9:16', bg: { type: 'blur' },
    texts: [
      { props: { ...base, text: 'CHỦ ĐỀ HÔM NAY', font: 'Oswald', color: '#111827', size: 100, bg: { color: '#facc15', alpha: 1 } }, start: 0, dur: 3, y: -0.32 },
      { props: { ...capBase, text: 'Nội dung phụ đề', color: '#facc15', strokeW: 6 }, start: 3, dur: 4, y: 0.34 },
    ],
  },
  {
    id: 'youtube', label: 'YouTube 16:9', desc: 'Ngang, tiêu đề mở đầu', ratio: '16:9', bg: { type: 'black' },
    texts: [
      { props: { ...TEXT_PRESETS[2].props, text: 'TÊN VIDEO CỦA BẠN', size: 120 }, start: 0, dur: 3, y: 0 },
      { props: { ...capBase, text: 'Phụ đề', bg: { color: '#000000', alpha: 0.6 } }, start: 3, dur: 4, y: 0.38 },
    ],
  },
  {
    id: 'square', label: 'Instagram vuông', desc: '1:1, chữ thanh lịch', ratio: '1:1', bg: { type: 'color', color: '#111827' },
    texts: [{ props: { ...TEXT_PRESETS[9].props, text: 'Tiêu đề thanh lịch', size: 90 }, start: 0, dur: 4, y: -0.35 }],
  },
  {
    id: 'portrait', label: 'Instagram 4:5', desc: 'Dọc 4:5, chữ viết tay', ratio: '4:5', bg: { type: 'blur' },
    texts: [{ props: { ...TEXT_PRESETS[3].props, text: 'Khoảnh khắc đẹp', size: 110 }, start: 0, dur: 4, y: 0.3 }],
  },
]
