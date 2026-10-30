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
      await img.decode()
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
