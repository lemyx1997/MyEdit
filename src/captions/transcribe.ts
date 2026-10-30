import { mixAudio } from '../export/exporter'
import { projectDuration } from '../timeline/ops'
import type { Project } from '../types'

export interface CaptionItem {
  start: number
  end: number
  text: string
}

export const MODELS = [
  { id: 'onnx-community/whisper-tiny', label: 'Nhanh (khoảng 40 MB)' },
  { id: 'onnx-community/whisper-base', label: 'Chính xác hơn (khoảng 80 MB)' },
]

/** Mô hình hay cho mốc thời gian lệch (nhất là đoạn đầu). Căn lại theo lúc thực sự có tiếng trong khoảng đó. */
export function tighten(it: CaptionItem, audio: Float32Array, dur: number, sr = 16000): CaptionItem {
  const win = Math.round(sr * 0.05)
  const loud = (i: number) => {
    let s = 0
    for (let j = 0; j < win && i + j < audio.length; j++) s += audio[i + j] * audio[i + j]
    return Math.sqrt(s / win) > 0.012
  }
  const a = Math.max(0, Math.floor(it.start * sr))
  const b = Math.min(audio.length, Math.floor(Math.min(it.end, dur) * sr))
  let first = -1
  let last = -1
  for (let i = a; i + win <= b; i += win) {
    if (loud(i)) {
      if (first < 0) first = i
      last = i
    }
  }
  if (first < 0) return it
  const start = Math.max(it.start, first / sr - 0.1)
  const end = Math.min(it.end, (last + win) / sr + 0.25)
  return end - start >= 0.3 ? { ...it, start, end } : it
}

/** Nhận dạng giọng nói của toàn bộ âm thanh trong dự án (không tính clip/dòng đã tắt tiếng). */
export async function transcribe(
  project: Project,
  language: string | null,
  model: string,
  onStatus: (text: string, fraction?: number) => void,
  signal: AbortSignal,
): Promise<CaptionItem[]> {
  const dur = projectDuration(project)
  if (dur <= 0) throw new Error('Chưa có clip nào trên dòng thời gian.')
  onStatus('Đang chuẩn bị âm thanh…')
  const buf = await mixAudio(project, dur, 16000, 1)
  if (!buf) throw new Error('Không có tiếng nói nào để nhận dạng (clip bị tắt tiếng hoặc video không có âm thanh).')
  const audio = buf.getChannelData(0).slice()
  const mono = audio.slice() // bản giữ lại để căn thời gian (bản kia được chuyển sang luồng khác)

  const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  const files = new Map<string, { loaded: number; total: number }>()
  try {
    return await new Promise<CaptionItem[]>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Đã huỷ', 'AbortError')))
      worker.onerror = (e) => reject(new Error(e.message || 'Không chạy được bộ nhận dạng giọng nói.'))
      worker.onmessage = (e) => {
        const m = e.data
        if (m.type === 'progress') {
          const p = m.p
          if (p.status === 'progress' && p.total) {
            files.set(p.file, { loaded: p.loaded, total: p.total })
            let l = 0
            let t = 0
            for (const f of files.values()) { l += f.loaded; t += f.total }
            onStatus(`Đang tải mô hình nhận dạng (một lần duy nhất)… ${Math.round((l / t) * 100)}%`, l / t)
          }
        } else if (m.type === 'status') {
          onStatus(m.text)
        } else if (m.type === 'done') {
          const items: CaptionItem[] = (m.chunks as { text: string; timestamp: [number, number | null] }[])
            .map((c) => ({ start: c.timestamp[0] ?? 0, end: c.timestamp[1] ?? dur, text: c.text.trim() }))
            .filter((c) => c.text)
          resolve(items.map((it) => tighten(it, mono, dur)))
        } else if (m.type === 'error') {
          reject(new Error(m.message))
        }
      }
      worker.postMessage({ audio, language, model }, [audio.buffer])
    })
  } finally {
    worker.terminate()
  }
}
