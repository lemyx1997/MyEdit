import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { canvasSize, renderFrame } from '../engine/draw'
import { ensureFonts } from '../engine/text'
import { decodeAsset } from '../audio'
import { volumeAt } from '../fx/anim'
import { createMediaEl, getImageDrawable, once, preloadGifs } from '../media'
import { clamp, clipDur, projectDuration } from '../timeline/ops'
import { visibleClips } from '../timeline/pick'
import type { Project } from '../types'

export interface ExportOptions {
  shortSide: number
  fps: number
  onProgress: (fraction: number, label: string) => void
  signal: AbortSignal
}

const SR = 48000
const CODECS = ['avc1.640034', 'avc1.640033', 'avc1.64002A', 'avc1.4d002a', 'avc1.42001f']

export const supportsExport = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined'

const abortCheck = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException('Đã huỷ', 'AbortError')
}

/** Trộn toàn bộ âm thanh (video + nhạc) theo thời gian, âm lượng, tốc độ, mờ dần. Trả null nếu không có tiếng. */
export async function mixAudio(project: Project, duration: number, sr = SR, channels = 2): Promise<AudioBuffer | null> {
  const ctx = new OfflineAudioContext(channels, Math.max(1, Math.ceil(duration * sr)), sr)
  let used = 0
  for (const clip of project.clips) {
    const asset = project.assets.find((a) => a.id === clip.assetId)
    const track = project.tracks.find((t) => t.id === clip.trackId)
    if (!asset || !track || asset.kind === 'image' || clip.muted || track.muted) continue
    const buf = await decodeAsset(asset.id)
    if (!buf) continue // video không có tiếng
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = clip.speed
    const gain = ctx.createGain()
    const dur = clipDur(clip)
    if (clip.kfs?.volume?.length || clip.fadeIn || clip.fadeOut) {
      // âm lượng thay đổi theo thời gian: lấy mẫu mỗi 20ms
      const n = Math.max(2, Math.ceil(dur / 0.02))
      const curve = new Float32Array(n)
      for (let i = 0; i < n; i++) curve[i] = volumeAt(clip, (i / (n - 1)) * dur)
      gain.gain.setValueCurveAtTime(curve, clip.start, dur)
    } else {
      gain.gain.value = clip.volume
    }
    src.connect(gain).connect(ctx.destination)
    src.start(clip.start, clip.inPoint, clip.outPoint - clip.inPoint)
    used++
  }
  return used ? ctx.startRendering() : null
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return resolve()
    const done = () => {
      clearTimeout(timer)
      v.removeEventListener('seeked', done)
      resolve()
    }
    const timer = setTimeout(done, 4000)
    v.addEventListener('seeked', done)
    v.currentTime = t
  })
}

export async function exportMp4(project: Project, o: ExportOptions): Promise<Blob> {
  if (!supportsExport()) throw new Error('Trình duyệt của bạn chưa hỗ trợ xuất video. Hãy dùng Chrome hoặc Edge bản mới.')
  const duration = projectDuration(project)
  if (duration <= 0) throw new Error('Chưa có clip nào để xuất.')
  const [W, H] = canvasSize(project.ratio, o.shortSide)
  const fps = o.fps
  const total = Math.max(1, Math.ceil(duration * fps))

  o.onProgress(0, 'Đang xử lý âm thanh…')
  const audio = await mixAudio(project, duration)
  abortCheck(o.signal)

  // chọn bộ mã hoá H.264 mà máy này hỗ trợ
  const bitrate = Math.round((o.shortSide >= 2000 ? 40e6 : o.shortSide >= 1000 ? 12e6 : 6e6) * (fps / 30))
  let codec: string | null = null
  for (const c of CODECS) {
    const r = await VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, bitrate, framerate: fps })
    if (r.supported) { codec = c; break }
  }
  if (!codec) throw new Error(`Máy của bạn không xuất được video cỡ ${W}×${H}. Hãy thử chọn độ phân giải thấp hơn.`)

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    ...(audio ? { audio: { codec: 'aac' as const, numberOfChannels: 2, sampleRate: SR } } : {}),
    fastStart: 'in-memory',
  })
  let encError: Error | null = null
  const venc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encError = e },
  })
  venc.configure({ codec, width: W, height: H, bitrate, framerate: fps, avc: { format: 'avc' } })

  // thẻ video riêng cho từng clip, chỉ dùng để lấy hình
  const videos = new Map<string, HTMLVideoElement>()
  try {
    o.onProgress(0.05, 'Đang chuẩn bị hình…')
    await ensureFonts(project)
    await preloadGifs(project.assets.filter((a) => a.kind === 'image').map((a) => a.id))
    for (const clip of project.clips) {
      const asset = project.assets.find((a) => a.id === clip.assetId)
      if (asset?.kind !== 'video') continue
      const el = createMediaEl(asset) as HTMLVideoElement
      el.muted = true
      await once(el, 'loadeddata')
      videos.set(clip.id, el)
    }

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    for (let i = 0; i < total; i++) {
      abortCheck(o.signal)
      if (encError) throw encError
      const t = i / fps
      for (const clip of visibleClips(project, t)) {
        const v = videos.get(clip.id)
        if (!v) continue
        const want = clip.inPoint + (t - clip.start) * clip.speed
        await seek(v, clamp(want, 0, Math.max(0, v.duration - 0.001)))
      }
      renderFrame(ctx, W, H, project, t, (clip, asset) => {
        if (!asset) return null
        if (asset.kind === 'image') return getImageDrawable(asset.id, t - clip.start)
        const v = videos.get(clip.id)
        return v ? { src: v, w: v.videoWidth, h: v.videoHeight } : null
      })
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) })
      venc.encode(frame, { keyFrame: i % (fps * 2) === 0 })
      frame.close()
      while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4))
      if (i % 5 === 0) {
        o.onProgress(0.1 + 0.8 * (i / total), `Đang dựng hình ${i + 1}/${total}`)
        await new Promise((r) => setTimeout(r)) // nhường cho giao diện cập nhật
      }
    }
    await venc.flush()
    if (encError) throw encError

    if (audio) {
      o.onProgress(0.92, 'Đang mã hoá âm thanh…')
      const aenc = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => { encError = e },
      })
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 192000 })
      const ch0 = audio.getChannelData(0)
      const ch1 = audio.getChannelData(1)
      const CH = SR
      for (let off = 0; off < audio.length; off += CH) {
        abortCheck(o.signal)
        const n = Math.min(CH, audio.length - off)
        const data = new Float32Array(n * 2)
        data.set(ch0.subarray(off, off + n), 0)
        data.set(ch1.subarray(off, off + n), n)
        const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off / SR) * 1e6), data })
        aenc.encode(ad)
        ad.close()
      }
      await aenc.flush()
      if (encError) throw encError
    }

    o.onProgress(0.99, 'Đang đóng gói file MP4…')
    muxer.finalize()
    o.onProgress(1, 'Hoàn tất')
    return new Blob([muxer.target.buffer], { type: 'video/mp4' })
  } finally {
    if (venc.state !== 'closed') venc.close()
    for (const v of videos.values()) {
      v.removeAttribute('src')
      v.load()
    }
  }
}
