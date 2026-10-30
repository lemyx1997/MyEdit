import { getFile } from './media'

// Xử lý âm thanh: giải mã, sóng âm, tìm đoạn lặng, đo độ to, ghi ra file WAV, và tự tạo hiệu ứng âm thanh.

export const SR = 48000
const decoded = new Map<string, Promise<AudioBuffer | null>>()

/** Giải mã âm thanh của một tài nguyên (video hoặc nhạc). Trả null nếu không có tiếng. */
export function decodeAsset(id: string): Promise<AudioBuffer | null> {
  let p = decoded.get(id)
  if (!p) {
    p = (async () => {
      const f = getFile(id)
      if (!f) return null
      try {
        return await new OfflineAudioContext(2, 1, SR).decodeAudioData(await f.arrayBuffer())
      } catch {
        return null
      }
    })()
    decoded.set(id, p)
  }
  return p
}
export const forgetAudio = (id: string) => {
  decoded.delete(id)
  peaksCache.delete(id)
}

// ---- sóng âm ----
const peaksCache = new Map<string, Promise<Float32Array | null>>()
const BUCKETS = 2000

export function peaksOf(id: string): Promise<Float32Array | null> {
  let p = peaksCache.get(id)
  if (!p) {
    p = decodeAsset(id).then((buf) => {
      if (!buf) return null
      const ch = buf.getChannelData(0)
      const out = new Float32Array(BUCKETS)
      const step = ch.length / BUCKETS
      for (let i = 0; i < BUCKETS; i++) {
        let m = 0
        const a = Math.floor(i * step)
        const b = Math.min(ch.length, Math.floor((i + 1) * step))
        for (let j = a; j < b; j += 8) m = Math.max(m, Math.abs(ch[j]))
        out[i] = m
      }
      return out
    })
    peaksCache.set(id, p)
  }
  return p
}

// ---- phân tích độ to / đoạn lặng ----
const WIN = 0.05

/** Độ to (RMS) theo từng khoảng 50ms trong đoạn [from, to] giây của file gốc. */
export function windowRms(buf: AudioBuffer, from: number, to: number): number[] {
  const ch = buf.getChannelData(0)
  const n = Math.floor(((to - from) * buf.sampleRate) / (WIN * buf.sampleRate))
  const size = Math.floor(WIN * buf.sampleRate)
  const start = Math.floor(from * buf.sampleRate)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let s = 0
    const a = start + i * size
    for (let j = 0; j < size && a + j < ch.length; j++) s += ch[a + j] * ch[a + j]
    out.push(Math.sqrt(s / size))
  }
  return out
}

export const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-6))

/** Các đoạn lặng (giây, tính trên file gốc) kéo dài ít nhất `minDur` và nhỏ hơn `thresholdDb`. */
export function findSilences(buf: AudioBuffer, from: number, to: number, thresholdDb = -38, minDur = 0.5): [number, number][] {
  const rms = windowRms(buf, from, to)
  const out: [number, number][] = []
  let s = -1
  for (let i = 0; i <= rms.length; i++) {
    const quiet = i < rms.length && toDb(rms[i]) < thresholdDb
    if (quiet && s < 0) s = i
    if (!quiet && s >= 0) {
      const a = from + s * WIN
      const b = from + i * WIN
      if (b - a >= minDur) out.push([a, b])
      s = -1
    }
  }
  return out
}

/** Độ to trung bình (dBFS) của đoạn [from, to]; chỉ tính những phần có tiếng để lời nói nhỏ không bị kéo thấp. */
export function loudnessDb(buf: AudioBuffer, from: number, to: number): number {
  const rms = windowRms(buf, from, to).filter((v) => toDb(v) > -50)
  if (!rms.length) return -60
  return toDb(Math.sqrt(rms.reduce((s, v) => s + v * v, 0) / rms.length))
}

// ---- ghi file WAV ----
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const n = channels[0].length
  const nc = channels.length
  const buf = new ArrayBuffer(44 + n * nc * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n * nc * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * nc * 2, true)
  let o = 44
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]))
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      o += 2
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

// ---- thư viện âm thanh tự tạo (không có bản quyền: do chính ứng dụng tổng hợp ra) ----
export interface SoundDef {
  id: string
  label: string
  kind: 'music' | 'sfx'
  dur: number
}
export const SOUNDS: SoundDef[] = [
  { id: 'beat', label: 'Nhạc nền: nhịp trống 120 BPM', kind: 'music', dur: 16 },
  { id: 'pad', label: 'Nhạc nền: êm dịu (pad)', kind: 'music', dur: 16 },
  { id: 'melody', label: 'Nhạc nền: giai điệu vui', kind: 'music', dur: 16 },
  { id: 'ding', label: 'Tiếng chuông "ting"', kind: 'sfx', dur: 1.5 },
  { id: 'chime', label: 'Chuông báo thành công', kind: 'sfx', dur: 1.5 },
  { id: 'pop', label: 'Tiếng "bốp"', kind: 'sfx', dur: 0.4 },
  { id: 'click', label: 'Tiếng bấm', kind: 'sfx', dur: 0.2 },
  { id: 'whoosh', label: 'Tiếng vút (chuyển cảnh)', kind: 'sfx', dur: 1 },
  { id: 'rise', label: 'Tiếng dâng cao hồi hộp', kind: 'sfx', dur: 2 },
  { id: 'drop', label: 'Tiếng rơi trầm', kind: 'sfx', dur: 1.2 },
]

const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

export async function synthSound(id: string): Promise<File> {
  const def = SOUNDS.find((s) => s.id === id)!
  const rate = 44100
  const ctx = new OfflineAudioContext(1, Math.ceil(def.dur * rate), rate)
  const out = ctx.createGain()
  out.gain.value = 0.7
  out.connect(ctx.destination)
  const tone = (type: OscillatorType, f: number, t0: number, len: number, vol = 0.4, f2?: number) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, t0)
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + len)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    o.connect(g).connect(out)
    o.start(t0)
    o.stop(t0 + len + 0.05)
  }
  const noiseBuf = ctx.createBuffer(1, rate * 2, rate)
  noiseBuf.getChannelData(0).forEach((_, i, a) => { a[i] = Math.random() * 2 - 1 })
  const noise = (t0: number, len: number, vol: number, filter?: BiquadFilterNode) => {
    const s = ctx.createBufferSource()
    const g = ctx.createGain()
    s.buffer = noiseBuf
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    s.connect(filter ?? g)
    if (filter) filter.connect(g)
    g.connect(out)
    s.start(t0)
    s.stop(t0 + len + 0.05)
  }

  switch (id) {
    case 'ding': tone('sine', 1318, 0, 1.4, 0.5); tone('sine', 2637, 0, 0.6, 0.12); break
    case 'chime': [72, 76, 79, 84].forEach((n, i) => tone('triangle', hz(n), i * 0.14, 1.0, 0.3)); break
    case 'pop': tone('sine', 700, 0, 0.12, 0.7, 120); break
    case 'click': noise(0, 0.03, 0.8); tone('square', 1800, 0, 0.03, 0.15); break
    case 'whoosh': {
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.setValueAtTime(300, 0)
      f.frequency.exponentialRampToValueAtTime(5000, 0.5)
      f.frequency.exponentialRampToValueAtTime(400, 1)
      noise(0, 1, 1.2, f)
      break
    }
    case 'rise': tone('sawtooth', 150, 0, 2, 0.35, 1400); noise(0, 2, 0.15); break
    case 'drop': tone('sine', 420, 0, 1.1, 0.8, 38); break
    case 'beat': {
      const beat = 0.5
      for (let b = 0; b < 32; b++) {
        const t = b * beat
        if (b % 2 === 0) tone('sine', 150, t, 0.25, 0.9, 45) // trống lớn
        else { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; noise(t, 0.18, 0.5, f) } // trống nhỏ
        const h = ctx.createBiquadFilter()
        h.type = 'highpass'
        h.frequency.value = 7000
        noise(t + beat / 2, 0.05, 0.25, h) // chũm chọe
        if (b % 8 === 0) [48, 55].forEach((n) => tone('triangle', hz(n), t, 3.8, 0.18))
      }
      break
    }
    case 'pad': {
      ;[0, 4, 8].forEach((_, ci) => {
        ;[60, 64, 67, 71].forEach((n) => tone('sine', hz(n - (ci % 2 ? 5 : 0)), ci * 5.3, 6.5, 0.12))
      })
      break
    }
    case 'melody': {
      const scale = [60, 62, 64, 67, 69, 72, 69, 67, 64, 62, 64, 67, 72, 74, 72, 69]
      scale.forEach((n, i) => tone('triangle', hz(n), i * 0.5, 0.45, 0.35))
      scale.forEach((n, i) => tone('triangle', hz(n), 8 + i * 0.5, 0.45, 0.3, hz(n) * 1.001))
      ;[48, 43, 45, 41].forEach((n, i) => tone('sine', hz(n), i * 4, 3.8, 0.25))
      break
    }
  }
  const buf = await ctx.startRendering()
  return new File([encodeWav([buf.getChannelData(0)], rate)], `${def.label.replace(/[:"]/g, '')}.wav`, { type: 'audio/wav' })
}
