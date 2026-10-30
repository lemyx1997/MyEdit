export type Ratio = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | '21:9'
export type AssetKind = 'video' | 'audio' | 'image'

/** Một file người dùng đã nhập (video, nhạc hoặc ảnh). File thật nằm ở media.ts / IndexedDB. */
export interface Asset {
  id: string
  name: string
  kind: AssetKind
  /** Độ dài gốc (giây). Với ảnh là 0 vì ảnh kéo dài được tuỳ ý. */
  duration: number
  width: number
  height: number
  thumb?: string
}

/** Một dòng trên timeline: video/ảnh, âm thanh, hoặc chữ & nhãn dán. */
export interface Track {
  id: string
  kind: 'video' | 'audio' | 'text'
  name: string
  muted: boolean
  hidden: boolean
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'soft-light' | 'difference'
export type MaskShape = 'none' | 'circle' | 'rect' | 'heart'
/** Thuộc tính có thể gắn keyframe (khung chính). */
export type KfProp = 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume'

/** Một khung chính. `t` là giây tính từ đầu clip (trên timeline). */
export interface Keyframe {
  t: number
  v: number
}

export interface Adjust {
  brightness: number // -1..1
  contrast: number // -1..1
  saturation: number // -1..1
  temperature: number // -1 (lạnh) .. 1 (ấm)
  blur: number // 0..1
  sharpen: number // 0..1
  vignette: number // 0..1
}

export interface Chroma {
  on: boolean
  color: string
  tolerance: number // 0..1
}

export interface Anim {
  id: string
  dur: number
}

/** Hiệu ứng hình của một clip. Giá trị thiếu sẽ lấy mặc định (xem fx/anim.ts). */
export interface Fx {
  x: number // lệch ngang, tính theo tỉ lệ bề rộng khung (0 = giữa)
  y: number
  scale: number
  rotation: number // độ
  opacity: number
  blend: BlendMode
  mask: MaskShape
  filter: string
  filterStrength: number
  adjust: Adjust
  chroma: Chroma
  animIn: Anim | null
  animOut: Anim | null
  animLoop: string | null
  /** Chuyển cảnh với clip liền trước trên cùng dòng */
  transition: Anim | null
}

export interface TextProps {
  text: string
  font: string
  size: number // px ở khung cao 1080
  color: string
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  strokeColor: string
  strokeW: number
  shadow: { color: string; blur: number; x: number; y: number } | null
  bg: { color: string; alpha: number } | null
}

/** Một đoạn clip đặt trên timeline. Mọi thời gian tính bằng giây. */
export interface Clip {
  id: string
  /** Rỗng với clip chữ / nhãn dán (không có file gốc) */
  assetId: string
  trackId: string
  /** Vị trí bắt đầu trên timeline */
  start: number
  /** Đoạn lấy từ file gốc: từ inPoint đến outPoint */
  inPoint: number
  outPoint: number
  speed: number
  volume: number
  muted: boolean
  fx?: Partial<Fx>
  kfs?: Partial<Record<KfProp, Keyframe[]>>
  text?: TextProps
}

export type Background =
  | { type: 'black' }
  | { type: 'color'; color: string }
  | { type: 'blur' }
  | { type: 'image'; assetId: string }

export interface Project {
  name: string
  ratio: Ratio
  bg?: Background
  assets: Asset[]
  tracks: Track[]
  clips: Clip[]
}
