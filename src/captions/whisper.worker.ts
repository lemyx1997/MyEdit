/// <reference lib="webworker" />
import { env, pipeline } from '@huggingface/transformers'

// Chạy mô hình nhận dạng giọng nói Whisper ngay trong trình duyệt (luồng riêng để giao diện không bị đơ).
// Chỉ tải file mô hình về máy (một lần); âm thanh của bạn không bị gửi đi đâu.
env.allowLocalModels = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null
let loadedModel = ''

interface Req {
  audio: Float32Array
  language: string | null
  model: string
}

self.onmessage = async (e: MessageEvent<Req>) => {
  const { audio, language, model } = e.data
  try {
    if (!asr || loadedModel !== model) {
      asr = await pipeline('automatic-speech-recognition', model, {
        dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
        device: 'wasm',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => self.postMessage({ type: 'progress', p }),
      })
      loadedModel = model
    }
    self.postMessage({ type: 'status', text: 'Đang nhận dạng giọng nói…' })
    const out = await asr(audio, {
      language: language ?? undefined,
      task: 'transcribe',
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    })
    self.postMessage({ type: 'done', chunks: out.chunks ?? [{ text: out.text, timestamp: [0, audio.length / 16000] }] })
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
