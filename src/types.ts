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

/** Một dòng trên timeline. Video/ảnh nằm ở dòng video, nhạc nằm ở dòng âm thanh. */
export interface Track {
  id: string
  kind: 'video' | 'audio'
  name: string
  muted: boolean
  hidden: boolean
}

/** Một đoạn clip đặt trên timeline. Mọi thời gian tính bằng giây. */
export interface Clip {
  id: string
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
}

export interface Project {
  name: string
  ratio: Ratio
  assets: Asset[]
  tracks: Track[]
  clips: Clip[]
}
