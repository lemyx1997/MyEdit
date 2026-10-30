import type { Clip } from '../types'
import type { CaptionItem } from './transcribe'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function srtTime(t: number) {
  const ms = Math.round(t * 1000)
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
}

function parseTime(s: string): number | null {
  const m = s.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/)
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, '0') / 1000 : null
}

/** Đọc nội dung file .srt thành danh sách phụ đề. */
export function parseSrt(text: string): CaptionItem[] {
  const out: CaptionItem[] = []
  for (const block of text.replace(/^﻿/, '').replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    const [a, b] = lines[i].split('-->')
    const start = parseTime(a)
    const end = parseTime(b.trim().split(/\s+/)[0])
    const body = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').trim()
    if (start !== null && end !== null && body) out.push({ start, end, text: body })
  }
  return out
}

/** Tạo nội dung file .srt từ các clip phụ đề. */
export function toSrt(clips: Clip[]): string {
  const caps = clips.filter((c) => c.cap && c.text).sort((a, b) => a.start - b.start)
  return caps
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.start + (c.outPoint - c.inPoint) / c.speed)}\n${c.text!.text}\n`)
    .join('\n')
}
