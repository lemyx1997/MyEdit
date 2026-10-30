import type { Asset, AssetKind } from './types'

// Giữ file thật (Blob) và đường dẫn tạm của từng tài nguyên. Không nằm trong state vì quá nặng.
const files = new Map<string, Blob>()
const urls = new Map<string, string>()
const images = new Map<string, HTMLImageElement>()

export function registerFile(id: string, blob: Blob) {
  files.set(id, blob)
  urls.set(id, URL.createObjectURL(blob))
}

export function unregisterFile(id: string) {
  const u = urls.get(id)
  if (u) URL.revokeObjectURL(u)
  files.delete(id)
  urls.delete(id)
  images.delete(id)
  gifs.delete(id)
}

export const getFile = (id: string) => files.get(id)
export const getUrl = (id: string) => urls.get(id)

export function kindOf(file: File): AssetKind | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

/** Tạo thẻ phát cho một clip video/nhạc. Mỗi clip có thẻ riêng để phát độc lập. */
export function createMediaEl(asset: Asset): HTMLVideoElement | HTMLAudioElement {
  const el = document.createElement(asset.kind === 'video' ? 'video' : 'audio')
  el.preload = 'auto'
  if (el instanceof HTMLVideoElement) el.playsInline = true
  el.src = getUrl(asset.id) ?? ''
  return el
}

export function getImage(assetId: string): HTMLImageElement {
  let img = images.get(assetId)
  if (!img) {
    img = new Image()
    img.src = getUrl(assetId) ?? ''
    images.set(assetId, img)
  }
  return img
}

// ---- GIF động: tách thành từng khung hình để vẽ đúng thời điểm (cả khi xuất video) ----
interface Gif {
  frames: ImageBitmap[]
  starts: number[]
  total: number
}
const gifs = new Map<string, Gif | 'loading' | 'failed'>()

function loadGif(id: string) {
  if (gifs.has(id)) return
  gifs.set(id, 'loading')
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Decoder = (globalThis as any).ImageDecoder
      if (!Decoder) throw new Error('no ImageDecoder')
      const dec = new Decoder({ data: await files.get(id)!.arrayBuffer(), type: 'image/gif' })
      await dec.tracks.ready
      const n: number = dec.tracks.selectedTrack.frameCount
      const frames: ImageBitmap[] = []
      const starts: number[] = []
      let total = 0
      for (let i = 0; i < Math.min(n, 400); i++) {
        const r = await dec.decode({ frameIndex: i })
        frames.push(await createImageBitmap(r.image))
        starts.push(total)
        total += Math.max(0.02, (r.image.duration ?? 100000) / 1e6)
        r.image.close()
      }
      gifs.set(id, { frames, starts, total })
    } catch {
      gifs.set(id, 'failed')
    }
  })()
}

/** Chờ GIF giải mã xong (dùng trước khi xuất video). */
export async function preloadGifs(ids: string[]) {
  for (const id of ids) {
    if (files.get(id)?.type !== 'image/gif') continue
    loadGif(id)
    while (gifs.get(id) === 'loading') await new Promise((r) => setTimeout(r, 30))
  }
}

/** Hình của một ảnh tại thời điểm `t` giây kể từ đầu clip (ảnh tĩnh thì luôn như nhau, GIF thì chạy theo thời gian). */
export function getImageDrawable(assetId: string, t: number): { src: CanvasImageSource; w: number; h: number } | null {
  if (files.get(assetId)?.type === 'image/gif') {
    loadGif(assetId)
    const g = gifs.get(assetId)
    if (g && g !== 'loading' && g !== 'failed') {
      const tt = g.total > 0 ? t % g.total : 0
      let i = g.starts.length - 1
      while (i > 0 && g.starts[i] > tt) i--
      const f = g.frames[i]
      return { src: f, w: f.width, h: f.height }
    }
  }
  const img = getImage(assetId)
  return img.complete && img.naturalWidth ? { src: img, w: img.naturalWidth, h: img.naturalHeight } : null
}

export function once(el: HTMLElement, ok: string, ms = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      el.removeEventListener(ok, onOk)
      el.removeEventListener('error', onErr)
    }
    const onOk = () => { cleanup(); resolve() }
    const onErr = () => { cleanup(); reject(new Error('Không đọc được file')) }
    const timer = setTimeout(() => { cleanup(); reject(new Error('Đọc file quá lâu')) }, ms)
    el.addEventListener(ok, onOk)
    el.addEventListener('error', onErr)
  })
}

const THUMB_W = 160

function thumbFrom(src: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = THUMB_W
  c.height = Math.max(1, Math.round((THUMB_W * h) / w))
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.6)
}

/** Đọc thông tin (độ dài, kích thước, ảnh nhỏ) của file vừa nhập. */
export async function probe(file: File, kind: AssetKind): Promise<Omit<Asset, 'id'>> {
  const url = URL.createObjectURL(file)
  try {
    if (kind === 'image') {
      const img = new Image()
      img.src = url
      await once(img, 'load')
      return { name: file.name, kind, duration: 0, width: img.naturalWidth, height: img.naturalHeight, thumb: thumbFrom(img, img.naturalWidth, img.naturalHeight) }
    }
    const el = document.createElement(kind === 'video' ? 'video' : 'audio')
    el.preload = 'auto'
    el.muted = true
    el.src = url
    await once(el, 'loadeddata')
    const duration = el.duration
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Độ dài không hợp lệ')
    if (el instanceof HTMLVideoElement) {
      el.currentTime = Math.min(0.5, duration / 2)
      await once(el, 'seeked')
      return { name: file.name, kind, duration, width: el.videoWidth, height: el.videoHeight, thumb: thumbFrom(el, el.videoWidth, el.videoHeight) }
    }
    return { name: file.name, kind, duration, width: 0, height: 0 }
  } finally {
    URL.revokeObjectURL(url)
  }
}
