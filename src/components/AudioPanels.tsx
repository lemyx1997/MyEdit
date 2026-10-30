import { useEffect, useRef, useState } from 'react'
import { encodeWav, SOUNDS, synthSound } from '../audio'
import { MODELS, transcribe } from '../captions/transcribe'
import { parseSrt, toSrt } from '../captions/srt'
import { CAPTION_STYLES } from '../fx/templates'
import { useT } from '../i18n'
import { useProject } from '../store'
import { useUi } from '../ui'
import { Chip, accentBtn, line } from './ui'

const notify = (m: string) => useUi.getState().setNotice(m)
const hint = (t: string) => <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{t}</p>
const field = { background: 'var(--panel-2)', borderColor: 'var(--line)' }

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

/** Thêm một file âm thanh mới nhập vào dòng âm thanh, tại vị trí kim chỉ. */
async function importAndPlace(file: File) {
  const st = useProject.getState()
  const [id] = await st.addAssets([file])
  if (id) st.addToTimeline(id, undefined, st.playhead)
}

function Recorder() {
  const t = useT()
  const [rec, setRec] = useState(false)
  const [secs, setSecs] = useState(0)
  const mr = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!rec) return
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [rec])
  useEffect(() => () => stream.current?.getTracks().forEach((x) => x.stop()), [])

  const start = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return notify(t('Chưa dùng được micro. Hãy bấm biểu tượng ổ khoá cạnh thanh địa chỉ, cho phép Micro rồi thử lại.'))
    }
    const chunks: Blob[] = []
    const r = new MediaRecorder(stream.current)
    r.ondataavailable = (e) => chunks.push(e.data)
    r.onstop = async () => {
      stream.current?.getTracks().forEach((x) => x.stop())
      try {
        // đổi sang WAV để biết chính xác độ dài và phát được ở mọi nơi
        const buf = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await new Blob(chunks).arrayBuffer())
        const d = new Date()
        const name = `${t('Ghi âm')} ${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}.wav`
        await importAndPlace(new File([encodeWav([buf.getChannelData(0)], buf.sampleRate)], name, { type: 'audio/wav' }))
      } catch {
        notify(t('Bản ghi âm bị lỗi, hãy thử ghi lại.'))
      }
    }
    mr.current = r
    r.start()
    setSecs(0)
    setRec(true)
  }
  const stop = () => {
    mr.current?.stop()
    setRec(false)
  }
  return (
    <div className="mb-4">
      <h4 className="mb-1 text-xs font-semibold">{t('Ghi âm giọng thuyết minh')}</h4>
      <button
        onClick={rec ? stop : start}
        className="w-full rounded px-3 py-2 text-sm font-semibold"
        style={rec ? { background: '#ef4444', color: '#fff' } : accentBtn}
      >
        {rec ? `⏹ ${t('Dừng ghi')} (${secs}s)` : `🎙 ${t('Bắt đầu ghi âm')}`}
      </button>
      {hint(t('Bản ghi sẽ tự thêm vào dòng âm thanh tại vị trí kim chỉ.'))}
    </div>
  )
}

function SoundLibrary() {
  const t = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const make = async (id: string) => {
    setBusy(id)
    try { return await synthSound(id) } finally { setBusy(null) }
  }
  const preview = async (id: string) => {
    audio.current?.pause()
    const f = await make(id)
    audio.current = new Audio(URL.createObjectURL(f))
    void audio.current.play()
  }
  return (
    <div className="mb-4">
      <h4 className="mb-1 text-xs font-semibold">{t('Thư viện nhạc & hiệu ứng (miễn phí bản quyền)')}</h4>
      {hint(t('Do chính ứng dụng tự tạo ra nên dùng thoải mái, kể cả để bán hàng.'))}
      <div className="space-y-1">
        {SOUNDS.map((s) => (
          <div key={s.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs" style={line}>
            <span className="flex-1 truncate" title={t(s.label)}>{s.kind === 'music' ? '🎵' : '🔔'} {t(s.label)}</span>
            <button disabled={!!busy} onClick={() => void preview(s.id)} title={t('Nghe thử')}>▶</button>
            <button disabled={!!busy} onClick={async () => importAndPlace(await make(s.id))} title={t('Thêm vào dòng thời gian')} style={{ color: 'var(--accent)' }}>＋</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Speech() {
  const t = useT()
  const [text, setText] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState('')
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => {
      const v = speechSynthesis.getVoices()
      setVoices(v)
      setVoice((cur) => cur || (v.find((x) => x.lang.startsWith('vi')) ?? v[0])?.name || '')
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  if (!('speechSynthesis' in window)) return null
  const say = () => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = voices.find((x) => x.name === voice)
    if (v) { u.voice = v; u.lang = v.lang }
    speechSynthesis.speak(u)
  }
  return (
    <div className="mb-2">
      <h4 className="mb-1 text-xs font-semibold">{t('Đọc văn bản thành giọng nói')}</h4>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t('Nhập văn bản cần đọc…')} className="mb-1 w-full rounded border px-2 py-1 text-sm" style={field} />
      <select value={voice} onChange={(e) => setVoice(e.target.value)} className="mb-1 w-full rounded border px-2 py-1 text-xs" style={field}>
        {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
      </select>
      <div className="flex gap-1">
        <Chip onClick={say}>🔊 {t('Đọc thử')}</Chip>
        <Chip onClick={() => speechSynthesis.cancel()}>⏹ {t('Dừng')}</Chip>
      </div>
      {hint(t('Lưu ý: trình duyệt không cho thu giọng đọc này vào file, nên chỉ để nghe thử. Muốn có giọng trong video, hãy dùng Ghi âm ở trên.'))}
    </div>
  )
}

export function AudioPanel() {
  return (
    <>
      <Recorder />
      <SoundLibrary />
      <Speech />
    </>
  )
}

export function CaptionsPanel() {
  const t = useT()
  const project = useProject((s) => s.project)
  const addCaptions = useProject((s) => s.addCaptions)
  const styleCaptions = useProject((s) => s.styleCaptions)
  const [lang, setLang] = useState('vietnamese')
  const [model, setModel] = useState(MODELS[0].id)
  const [style, setStyle] = useState('classic')
  const [status, setStatus] = useState<string | null>(null)
  const [frac, setFrac] = useState<number | null>(null)
  const abort = useRef<AbortController | null>(null)
  const srtInput = useRef<HTMLInputElement>(null)
  const capCount = project.clips.filter((c) => c.cap).length

  const run = async () => {
    abort.current = new AbortController()
    setStatus(t('Đang bắt đầu…'))
    try {
      const items = await transcribe(project, lang === 'auto' ? null : lang, model, (s, f) => { setStatus(s); setFrac(f ?? null) }, abort.current.signal)
      const n = addCaptions(items, style)
      notify(n ? `${t('Đã tạo')} ${n} ${t('dòng phụ đề. Bấm vào từng dòng để sửa chữ.')}` : t('Không nhận ra lời nói nào trong video.'))
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        const m = e instanceof Error ? e.message : String(e)
        notify(/fetch|network|Failed|load/i.test(m) ? t('Không tải được mô hình nhận dạng. Hãy kiểm tra kết nối mạng (chỉ cần mạng ở lần đầu) rồi thử lại.') : m)
      }
    } finally {
      setStatus(null)
      setFrac(null)
    }
  }

  return (
    <>
      {hint(t('Tự nhận dạng lời nói trong video rồi tạo phụ đề. Chạy ngay trên máy bạn; chỉ tải mô hình về ở lần đầu.'))}
      <div className="mb-2 grid grid-cols-2 gap-1">
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded border px-2 py-1 text-xs" style={field}>
          <option value="vietnamese">{t('Tiếng Việt')}</option>
          <option value="english">{t('Tiếng Anh')}</option>
          <option value="chinese">{t('Tiếng Trung')}</option>
          <option value="japanese">{t('Tiếng Nhật')}</option>
          <option value="korean">{t('Tiếng Hàn')}</option>
          <option value="auto">{t('Tự đoán ngôn ngữ')}</option>
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded border px-2 py-1 text-xs" style={field}>
          {MODELS.map((m) => <option key={m.id} value={m.id}>{t(m.label)}</option>)}
        </select>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {CAPTION_STYLES.map((s) => (
          <Chip key={s.id} active={style === s.id} onClick={() => { setStyle(s.id); if (capCount) styleCaptions(s.id) }}>{t(s.label)}</Chip>
        ))}
      </div>
      {status ? (
        <div className="mb-2">
          <div className="h-2 overflow-hidden rounded" style={{ background: 'var(--panel-2)' }}>
            <div className={frac === null ? 'h-full w-1/3 animate-pulse' : 'h-full'} style={{ width: frac === null ? undefined : `${Math.round(frac * 100)}%`, background: 'var(--accent)' }} />
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{status}</div>
          <Chip onClick={() => abort.current?.abort()}>{t('Huỷ')}</Chip>
        </div>
      ) : (
        <button onClick={() => void run()} className="mb-2 w-full rounded px-3 py-2 text-sm font-semibold" style={accentBtn}>✨ {t('Tạo phụ đề tự động')}</button>
      )}
      <div className="flex flex-wrap gap-1">
        <Chip onClick={() => srtInput.current?.click()}>⬆ {t('Nhập file .srt')}</Chip>
        <Chip onClick={() => (capCount ? download(new Blob([toSrt(project.clips)], { type: 'text/plain;charset=utf-8' }), `${project.name || 'phude'}.srt`) : notify(t('Chưa có phụ đề nào để xuất.')))}>⬇ {t('Xuất file .srt')}</Chip>
        <Chip onClick={() => { const p = useProject.getState().playhead; addCaptions([{ start: p, end: p + 2.5, text: t('Phụ đề mới') }], style, true) }}>＋ {t('Thêm một dòng')}</Chip>
      </div>
      <input
        ref={srtInput} type="file" accept=".srt,text/plain" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const items = parseSrt(await f.text())
          notify(items.length ? `${t('Đã nhập')} ${addCaptions(items, style)} ${t('dòng phụ đề.')}` : t('File .srt này không đọc được hoặc đang trống.'))
        }}
      />
      {capCount > 0 && <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{t('Đang có')} {capCount} {t('dòng phụ đề')} · {t('Bấm vào dòng trên dòng thời gian để sửa chữ.')}</p>}
    </>
  )
}
