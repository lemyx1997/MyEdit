import type { BlendMode, MaskShape, TextProps } from '../types'

export interface Preset {
  id: string
  label: string
}

/** Bộ lọc màu: mỗi cái là một chuỗi CSS filter. */
export const FILTERS: (Preset & { css: string })[] = [
  { id: 'none', label: 'Gốc', css: '' },
  { id: 'vivid', label: 'Rực rỡ', css: 'saturate(1.45) contrast(1.1)' },
  { id: 'warm', label: 'Ấm áp', css: 'sepia(0.25) saturate(1.25) hue-rotate(-8deg)' },
  { id: 'cool', label: 'Mát lạnh', css: 'hue-rotate(14deg) saturate(1.1) brightness(1.03)' },
  { id: 'bw', label: 'Đen trắng', css: 'grayscale(1)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.45) brightness(0.9)' },
  { id: 'vintage', label: 'Cổ điển', css: 'sepia(0.5) contrast(0.92) brightness(1.08)' },
  { id: 'sepia', label: 'Nâu cũ', css: 'sepia(1)' },
  { id: 'fade', label: 'Nhạt màu', css: 'contrast(0.8) brightness(1.12) saturate(0.8)' },
  { id: 'matte', label: 'Matte', css: 'contrast(0.86) saturate(0.9) brightness(1.05)' },
  { id: 'dramatic', label: 'Kịch tính', css: 'contrast(1.4) saturate(1.2) brightness(0.9)' },
  { id: 'bright', label: 'Sáng bừng', css: 'brightness(1.22) contrast(1.05)' },
  { id: 'dreamy', label: 'Mơ màng', css: 'contrast(0.9) brightness(1.15) saturate(1.25)' },
  { id: 'cyber', label: 'Cyber', css: 'hue-rotate(190deg) saturate(1.5) contrast(1.1)' },
  { id: 'sunset', label: 'Hoàng hôn', css: 'sepia(0.35) hue-rotate(-20deg) saturate(1.6)' },
  { id: 'forest', label: 'Rừng xanh', css: 'sepia(0.2) hue-rotate(55deg) saturate(1.3)' },
  { id: 'pop', label: 'Pop', css: 'saturate(1.85) contrast(1.15)' },
  { id: 'cinema', label: 'Điện ảnh', css: 'contrast(1.15) saturate(0.9) sepia(0.15) brightness(0.95)' },
  { id: 'frost', label: 'Băng giá', css: 'hue-rotate(180deg) saturate(0.7) brightness(1.1)' },
  { id: 'rose', label: 'Hồng phấn', css: 'sepia(0.3) hue-rotate(-35deg) saturate(1.4)' },
  { id: 'invert', label: 'Đảo màu', css: 'invert(1)' },
]
export const filterCss = (id: string) => FILTERS.find((f) => f.id === id)?.css ?? ''

export const ANIM_IN_OUT: Preset[] = [
  { id: 'fade', label: 'Mờ dần' },
  { id: 'slideL', label: 'Trượt từ trái' },
  { id: 'slideR', label: 'Trượt từ phải' },
  { id: 'slideU', label: 'Trượt từ trên' },
  { id: 'slideD', label: 'Trượt từ dưới' },
  { id: 'zoomIn', label: 'Phóng vào' },
  { id: 'zoomOut', label: 'Thu vào' },
  { id: 'pop', label: 'Nảy lên' },
  { id: 'spin', label: 'Xoay vào' },
  { id: 'drop', label: 'Rơi xuống' },
]
export const ANIM_LOOP: Preset[] = [
  { id: 'pulse', label: 'Nhịp đập' },
  { id: 'shake', label: 'Rung' },
  { id: 'float', label: 'Lơ lửng' },
  { id: 'spin', label: 'Xoay vòng' },
  { id: 'swing', label: 'Đung đưa' },
  { id: 'blink', label: 'Nhấp nháy' },
]

export const TRANSITIONS: Preset[] = [
  { id: 'fade', label: 'Mờ dần' },
  { id: 'fadeBlack', label: 'Qua màn đen' },
  { id: 'fadeWhite', label: 'Qua màn trắng' },
  { id: 'slideL', label: 'Trượt trái' },
  { id: 'slideR', label: 'Trượt phải' },
  { id: 'slideU', label: 'Trượt lên' },
  { id: 'slideD', label: 'Trượt xuống' },
  { id: 'wipeL', label: 'Quét trái' },
  { id: 'wipeR', label: 'Quét phải' },
  { id: 'wipeU', label: 'Quét lên' },
  { id: 'wipeD', label: 'Quét xuống' },
  { id: 'zoomIn', label: 'Phóng to' },
  { id: 'zoomOut', label: 'Thu nhỏ' },
  { id: 'circle', label: 'Mở vòng tròn' },
  { id: 'spin', label: 'Xoay' },
  { id: 'blurFade', label: 'Nhoè mờ' },
]

export const BLENDS: { id: BlendMode; label: string; op: GlobalCompositeOperation }[] = [
  { id: 'normal', label: 'Bình thường', op: 'source-over' },
  { id: 'multiply', label: 'Nhân tối', op: 'multiply' },
  { id: 'screen', label: 'Làm sáng', op: 'screen' },
  { id: 'overlay', label: 'Phủ màu', op: 'overlay' },
  { id: 'darken', label: 'Tối hơn', op: 'darken' },
  { id: 'lighten', label: 'Sáng hơn', op: 'lighten' },
  { id: 'color-dodge', label: 'Cháy sáng', op: 'color-dodge' },
  { id: 'soft-light', label: 'Ánh sáng dịu', op: 'soft-light' },
  { id: 'difference', label: 'Khác biệt', op: 'difference' },
]
export const blendOp = (id: BlendMode): GlobalCompositeOperation => BLENDS.find((b) => b.id === id)?.op ?? 'source-over'

export const MASKS: { id: MaskShape; label: string }[] = [
  { id: 'none', label: 'Không' },
  { id: 'circle', label: 'Hình tròn' },
  { id: 'rect', label: 'Chữ nhật' },
  { id: 'heart', label: 'Trái tim' },
]

/** Font có hỗ trợ tiếng Việt. Các font bên dưới 'Hệ thống' có sẵn trên máy; còn lại được đóng gói theo ứng dụng. */
export const FONTS = [
  'Be Vietnam Pro', 'Roboto', 'Montserrat', 'Oswald', 'Anton', 'Playfair Display', 'Pacifico', 'Lobster', 'Dancing Script',
  'Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Courier New',
]

const base: TextProps = {
  text: 'Nhập chữ', font: 'Be Vietnam Pro', size: 96, color: '#ffffff', bold: true, italic: false, align: 'center',
  strokeColor: '#000000', strokeW: 0, shadow: null, bg: null,
}
export const DEFAULT_TEXT = base

export const TEXT_PRESETS: { label: string; props: TextProps }[] = [
  { label: 'Tiêu đề lớn', props: { ...base, text: 'TIÊU ĐỀ', font: 'Anton', bold: false, size: 150, strokeW: 6 } },
  { label: 'Phụ đề hộp đen', props: { ...base, text: 'Phụ đề của bạn', size: 56, bold: false, bg: { color: '#000000', alpha: 0.65 } } },
  { label: 'Neon', props: { ...base, text: 'NEON', font: 'Montserrat', color: '#67e8f9', size: 130, shadow: { color: '#22d3ee', blur: 28, x: 0, y: 0 } } },
  { label: 'Viết tay', props: { ...base, text: 'Viết tay', font: 'Pacifico', bold: false, color: '#fde047', size: 120, shadow: { color: '#000000', blur: 6, x: 3, y: 3 } } },
  { label: 'Cổ điển', props: { ...base, text: 'Cổ điển', font: 'Playfair Display', color: '#fef3c7', size: 110, italic: true } },
  { label: 'Retro', props: { ...base, text: 'Retro', font: 'Lobster', bold: false, color: '#f9a8d4', size: 130, strokeColor: '#831843', strokeW: 8 } },
  { label: 'Bóng đổ', props: { ...base, text: 'Bóng đổ', font: 'Roboto', size: 110, shadow: { color: '#000000', blur: 12, x: 6, y: 6 } } },
  { label: 'Hộp vàng', props: { ...base, text: 'NỔI BẬT', font: 'Oswald', color: '#111827', size: 100, bg: { color: '#facc15', alpha: 1 } } },
  { label: 'Đỏ nổi bật', props: { ...base, text: 'HOT', font: 'Anton', bold: false, color: '#ef4444', size: 170, strokeColor: '#ffffff', strokeW: 10 } },
  { label: 'Thanh lịch', props: { ...base, text: 'Thanh lịch', font: 'Montserrat', bold: false, size: 84 } },
  { label: 'Chữ ký', props: { ...base, text: 'Chữ ký', font: 'Dancing Script', color: '#ffffff', size: 130, shadow: { color: '#000000', blur: 8, x: 2, y: 2 } } },
]

export const STICKERS = [
  '😀', '😂', '🥰', '😎', '🤩', '😭', '😡', '🥳', '😱', '🤔', '👍', '👏', '🙏', '💪', '👀', '❤️',
  '🔥', '⭐', '✨', '💥', '💯', '🎉', '🎁', '🎈', '🌈', '☀️', '🌙', '⚡', '🌸', '🍀', '🍕', '☕',
  '🎵', '🎬', '📷', '💡', '✅', '❌', '⚠️', '❓', '❗', '➡️', '⬇️', '🔔', '🏆', '👑', '💎', '🚀',
]
