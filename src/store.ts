import { create } from 'zustand'
import { getFile, kindOf, probe, registerFile, unregisterFile } from './media'
import { deleteFile, saveFile } from './persist'
import { hasKfAt, removeKfAt, resolveClip, upsertKf, withProp } from './fx/anim'
import { DEFAULT_TEXT } from './fx/catalog'
import { CAPTION_STYLES, wrapCaption, type Template } from './fx/templates'
import { decodeAsset, findSilences, forgetAudio, loudnessDb } from './audio'
import {
  addClip, addTextClip, clamp, clipDur, clipEnd, deleteClip, duplicateClip, pasteClip, projectDuration,
  removeRanges, setSpeed as opSetSpeed, splitClip,
} from './timeline/ops'
import { transitionDur } from './timeline/pick'
import type { Background, Clip, Fx, KfProp, Project, Ratio, TextProps } from './types'
import { translate } from './i18n'
import { useUi } from './ui'

const HISTORY = 100
const uid = () => Math.random().toString(36).slice(2, 10)
const notify = (m: string) => useUi.getState().setNotice(m)
const T = (s: string) => translate(useUi.getState().lang, s)

export function defaultProject(): Project {
  const track = (id: string, kind: 'video' | 'audio' | 'text', name: string) => ({ id, kind, name, muted: false, hidden: false })
  return {
    name: 'Dự án chưa đặt tên',
    ratio: '16:9',
    bg: { type: 'black' },
    assets: [],
    clips: [],
    tracks: [track('t1', 'text', 'Chữ & nhãn dán'), track('v2', 'video', 'Video 2'), track('v1', 'video', 'Video 1'), track('a1', 'audio', 'Âm thanh 1'), track('a2', 'audio', 'Âm thanh 2')],
  }
}

/** Dự án lưu từ phiên bản cũ: bổ sung dòng chữ và nền nếu còn thiếu. */
export function migrate(p: Project): Project {
  let q = p
  if (!q.tracks.some((t) => t.kind === 'text')) {
    q = { ...q, tracks: [{ id: 't1', kind: 'text', name: 'Chữ & nhãn dán', muted: false, hidden: false }, ...q.tracks] }
  }
  return q.bg ? q : { ...q, bg: { type: 'black' } }
}

/** Khi hoàn tác/làm lại: giữ nguyên danh sách file và tên dự án hiện tại, chỉ lấy lại phần dựng. */
const reconcile = (snap: Project, cur: Project): Project => ({
  ...snap,
  name: cur.name,
  assets: cur.assets,
  clips: snap.clips.filter((c) => c.text || cur.assets.some((a) => a.id === c.assetId)),
})

interface ProjectState {
  project: Project
  loaded: boolean
  selectedId: string | null
  playhead: number
  playing: boolean
  zoom: number // số điểm ảnh cho mỗi giây trên timeline
  snap: boolean
  past: Project[]
  future: Project[]
  clipboard: Clip | null
  gestureBase: Project | null

  hydrate: (p: Project | null) => void
  commit: (p: Project) => void
  setLive: (p: Project) => void
  endGesture: () => void
  undo: () => void
  redo: () => void
  select: (id: string | null) => void
  setPlayhead: (t: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  setZoom: (z: number) => void
  toggleSnap: () => void
  setName: (n: string) => void
  setRatio: (r: Ratio) => void
  toggleTrack: (id: string, key: 'muted' | 'hidden') => void
  addAssets: (files: File[]) => Promise<string[]>
  removeAsset: (id: string) => void
  addToTimeline: (assetId: string, trackId?: string, start?: number) => void
  split: () => void
  deleteSelected: () => void
  duplicateSelected: () => void
  copy: () => void
  paste: () => void
  setSpeed: (id: string, speed: number) => void
  patchClip: (id: string, patch: Partial<Clip>, live?: boolean) => void
  addText: (props?: TextProps) => void
  updateSelected: (fn: (c: Clip) => Clip, live?: boolean) => void
  patchFx: (patch: Partial<Fx>, live?: boolean) => void
  updateText: (patch: Partial<TextProps>, live?: boolean) => void
  setProp: (prop: KfProp, value: number, live?: boolean) => void
  toggleKf: (prop: KfProp) => void
  setTransition: (id: string | null, dur?: number) => void
  setAnim: (kind: 'in' | 'out' | 'loop', id: string | null, dur?: number) => void
  setBg: (bg: Background) => void
  extractAudio: () => void
  cutSilence: () => Promise<void>
  normalizeVolumes: () => Promise<void>
  addCaptions: (items: { start: number; end: number; text: string }[], styleId?: string, append?: boolean) => number
  styleCaptions: (styleId: string) => void
  applyTemplate: (t: Template) => void
  newProject: () => void
}

export const useProject = create<ProjectState>((set, get) => ({
  project: defaultProject(),
  loaded: false,
  selectedId: null,
  playhead: 0,
  playing: false,
  zoom: 50,
  snap: true,
  past: [],
  future: [],
  clipboard: null,
  gestureBase: null,

  hydrate: (p) => set({ project: p ? migrate(p) : defaultProject(), loaded: true, past: [], future: [] }),

  commit: (p) => {
    const s = get()
    if (p === s.project) return
    set({ project: p, past: [...s.past.slice(-(HISTORY - 1)), s.project], future: [] })
  },

  // Kéo thả / trượt thanh: thay đổi liên tục nhưng chỉ ghi MỘT bước hoàn tác khi thả tay.
  setLive: (p) => {
    const s = get()
    set({ project: p, gestureBase: s.gestureBase ?? s.project })
  },
  endGesture: () => {
    const s = get()
    if (!s.gestureBase) return
    if (s.gestureBase !== s.project) set({ past: [...s.past.slice(-(HISTORY - 1)), s.gestureBase], future: [] })
    set({ gestureBase: null })
  },

  undo: () => {
    const s = get()
    const prev = s.past[s.past.length - 1]
    if (!prev) return
    const next = reconcile(prev, s.project)
    set({
      project: next, past: s.past.slice(0, -1), future: [s.project, ...s.future],
      selectedId: next.clips.some((c) => c.id === s.selectedId) ? s.selectedId : null,
    })
  },
  redo: () => {
    const s = get()
    const nxt = s.future[0]
    if (!nxt) return
    const next = reconcile(nxt, s.project)
    set({
      project: next, past: [...s.past, s.project], future: s.future.slice(1),
      selectedId: next.clips.some((c) => c.id === s.selectedId) ? s.selectedId : null,
    })
  },

  select: (selectedId) => set({ selectedId }),
  setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
  play: () => {
    const dur = projectDuration(get().project)
    if (dur <= 0) return notify('Hãy thêm clip vào dòng thời gian trước khi phát.')
    if (get().playhead >= dur - 0.01) set({ playhead: 0 })
    set({ playing: true })
  },
  pause: () => set({ playing: false }),
  toggle: () => (get().playing ? get().pause() : get().play()),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 10, 300) }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),

  setName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setRatio: (ratio) => get().commit({ ...get().project, ratio }),
  toggleTrack: (id, key) => {
    const p = get().project
    get().commit({ ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, [key]: !t[key] } : t)) })
  },

  addAssets: async (files) => {
    const ids: string[] = []
    for (const file of files) {
      const kind = kindOf(file)
      if (!kind) {
        notify(`"${file.name}" ${T('không phải video, nhạc hoặc ảnh nên chưa nhập được.')}`)
        continue
      }
      try {
        const meta = await probe(file, kind)
        const id = uid()
        registerFile(id, file)
        void saveFile(id, file)
        set((s) => ({ project: { ...s.project, assets: [...s.project.assets, { id, ...meta }] } }))
        ids.push(id)
      } catch {
        notify(`${T('Không đọc được')} "${file.name}". ${T('Hãy thử định dạng phổ biến như MP4, MP3, JPG, PNG.')}`)
      }
    }
    return ids
  },

  removeAsset: (id) => {
    const p = get().project
    get().commit({ ...p, assets: p.assets.filter((a) => a.id !== id), clips: p.clips.filter((c) => c.assetId !== id) })
    unregisterFile(id)
    forgetAudio(id)
    void deleteFile(id)
  },

  addToTimeline: (assetId, trackId, start) => {
    const p = get().project
    const asset = p.assets.find((a) => a.id === assetId)
    if (!asset) return
    const kind = asset.kind === 'audio' ? 'audio' : 'video'
    const ofKind = p.tracks.filter((t) => t.kind === kind)
    const track = trackId ? p.tracks.find((t) => t.id === trackId) : kind === 'video' ? ofKind[ofKind.length - 1] : ofKind[0]
    if (!track || track.kind !== kind) {
      return notify('Video và ảnh thả vào dòng Video; nhạc thả vào dòng Âm thanh.')
    }
    const at = start ?? p.clips.filter((c) => c.trackId === track.id).reduce((m, c) => Math.max(m, clipEnd(c)), 0)
    const id = uid()
    const next = addClip(p, asset, track.id, at, id)
    if (!next) return
    get().commit(next)
    set({ selectedId: id })
  },

  split: () => {
    const { project, selectedId, playhead } = get()
    const inside = (c: Clip) => playhead > c.start && playhead < clipEnd(c)
    const sel = project.clips.find((c) => c.id === selectedId)
    const ids = sel && inside(sel) ? [sel.id] : project.clips.filter(inside).map((c) => c.id)
    let next: Project | null = project
    let changed = false
    for (const id of ids) {
      const r = splitClip(next, id, playhead, uid())
      if (r) { next = r; changed = true }
    }
    if (!changed) return notify('Đặt kim chỉ vào giữa một clip rồi bấm Tách.')
    get().commit(next)
  },

  deleteSelected: () => {
    const { project, selectedId } = get()
    if (!selectedId) return
    get().commit(deleteClip(project, selectedId))
    set({ selectedId: null })
  },

  duplicateSelected: () => {
    const { project, selectedId } = get()
    if (!selectedId) return
    const id = uid()
    const next = duplicateClip(project, selectedId, id)
    if (next) {
      get().commit(next)
      set({ selectedId: id })
    }
  },

  copy: () => {
    const { project, selectedId } = get()
    const c = project.clips.find((x) => x.id === selectedId)
    if (c) set({ clipboard: c })
  },

  paste: () => {
    const { project, clipboard, playhead, selectedId } = get()
    if (!clipboard) return
    const sel = project.clips.find((c) => c.id === selectedId)
    const id = uid()
    const next = pasteClip(project, clipboard, sel?.trackId ?? clipboard.trackId, playhead, id)
    if (next) {
      get().commit(next)
      set({ selectedId: id })
    }
  },

  setSpeed: (id, speed) => get().setLive(opSetSpeed(get().project, id, speed)),

  addText: (props = DEFAULT_TEXT) => {
    const p = get().project
    const track = p.tracks.find((t) => t.kind === 'text')
    if (!track) return
    const id = uid()
    const next = addTextClip(p, track.id, get().playhead, id, props)
    if (!next) return
    get().commit(next)
    set({ selectedId: id })
  },

  updateSelected: (fn, live) => {
    const { project, selectedId } = get()
    if (!selectedId) return notify('Hãy chọn một clip trên dòng thời gian trước.')
    const next = { ...project, clips: project.clips.map((c) => (c.id === selectedId ? fn(c) : c)) }
    if (live) get().setLive(next)
    else get().commit(next)
  },

  patchFx: (patch, live) => get().updateSelected((c) => ({ ...c, fx: { ...c.fx, ...patch } }), live),

  updateText: (patch, live) => get().updateSelected((c) => (c.text ? { ...c, text: { ...c.text, ...patch } } : c), live),

  setProp: (prop, value, live) => {
    const { project, selectedId, playhead } = get()
    if (!selectedId) return
    const next = withProp(project, selectedId, prop, value, playhead)
    if (live) get().setLive(next)
    else get().commit(next)
  },

  // Bật/tắt khung chính (keyframe) của một thuộc tính tại vị trí kim chỉ
  toggleKf: (prop) => {
    const { project, selectedId, playhead } = get()
    const c = project.clips.find((x) => x.id === selectedId)
    if (!c) return notify('Hãy chọn một clip trước.')
    const local = clamp(playhead - c.start, 0, clipDur(c))
    const list = c.kfs?.[prop]
    let nextList
    if (hasKfAt(list, local)) {
      nextList = removeKfAt(list!, local)
    } else {
      const cur = resolveClip(c, local)
      const v = prop === 'volume' ? cur.volume : prop === 'rotation' ? cur.rot : cur[prop]
      nextList = upsertKf(list ?? [], local, v)
    }
    const kfs = { ...c.kfs }
    if (nextList.length) kfs[prop] = nextList
    else delete kfs[prop]
    get().commit({ ...project, clips: project.clips.map((x) => (x.id === c.id ? { ...c, kfs } : x)) })
  },

  setTransition: (id, dur = 1) => {
    const { project, selectedId } = get()
    const c = project.clips.find((x) => x.id === selectedId)
    if (!c) return notify('Hãy chọn clip đứng sau chỗ cần chuyển cảnh.')
    if (id) {
      const prev = project.clips.find((o) => o.trackId === c.trackId && o.id !== c.id && Math.abs(clipEnd(o) - c.start) < 0.02)
      if (!prev) return notify('Chuyển cảnh cần hai clip nằm sát nhau trên cùng một dòng. Hãy chọn clip đứng sau.')
      dur = transitionDur(prev, c, dur)
    }
    get().patchFx({ transition: id ? { id, dur } : null })
  },

  setAnim: (kind, id, dur = 0.6) => {
    if (kind === 'loop') get().patchFx({ animLoop: id })
    else get().patchFx(kind === 'in' ? { animIn: id ? { id, dur } : null } : { animOut: id ? { id, dur } : null })
  },

  setBg: (bg) => get().commit({ ...get().project, bg }),

  // Tách tiếng của clip video ra một clip riêng trên dòng âm thanh, rồi tắt tiếng clip gốc
  extractAudio: () => {
    const { project, selectedId } = get()
    const c = project.clips.find((x) => x.id === selectedId)
    const asset = c && project.assets.find((a) => a.id === c.assetId)
    if (!c || !asset || asset.kind !== 'video') return notify('Hãy chọn một clip video để tách tiếng.')
    const dur = clipDur(c)
    const track = project.tracks.find(
      (t) => t.kind === 'audio' && !project.clips.some((o) => o.trackId === t.id && o.start < c.start + dur - 1e-6 && clipEnd(o) > c.start + 1e-6),
    )
    if (!track) return notify('Hai dòng âm thanh đều đang có clip ở chỗ này. Hãy dời clip nhạc đi rồi thử lại.')
    const id = uid()
    const audio: Clip = { ...c, id, trackId: track.id, muted: false, fx: undefined, kfs: undefined }
    get().commit({ ...project, clips: [...project.clips.map((x) => (x.id === c.id ? { ...x, muted: true } : x)), audio] })
    set({ selectedId: id })
    notify('Đã tách tiếng ra dòng âm thanh. Clip video gốc đã được tắt tiếng.')
  },

  // Tự cắt các khoảng lặng trong clip đang chọn rồi nối liền lại
  cutSilence: async () => {
    const { project, selectedId } = get()
    const c = project.clips.find((x) => x.id === selectedId)
    const asset = c && project.assets.find((a) => a.id === c.assetId)
    if (!c || !asset || asset.kind === 'image') return notify('Hãy chọn một clip video hoặc nhạc có tiếng.')
    notify('Đang tìm khoảng lặng…')
    const buf = await decodeAsset(asset.id)
    if (!buf) return notify('Clip này không có âm thanh nên không cắt khoảng lặng được.')
    const silences = findSilences(buf, c.inPoint, c.outPoint)
    const next = removeRanges(get().project, c.id, silences, uid)
    if (!next) return notify('Không thấy khoảng lặng nào đủ dài (từ nửa giây trở lên).')
    const removed = silences.reduce((s, [a, b]) => s + (b - a), 0) / c.speed
    get().commit(next)
    notify(`${T('Đã cắt')} ${silences.length} ${T('khoảng lặng, ngắn đi')} ${removed.toFixed(1)} ${T('giây.')}`)
  },

  // Cân bằng âm lượng: đưa mọi clip về cùng mức to (không khuếch đại, chỉ hạ clip quá to)
  normalizeVolumes: async () => {
    const p = get().project
    const target = -20
    const clips: Clip[] = []
    let n = 0
    for (const c of p.clips) {
      const asset = p.assets.find((a) => a.id === c.assetId)
      if (!asset || asset.kind === 'image' || c.muted) { clips.push(c); continue }
      const buf = await decodeAsset(asset.id)
      if (!buf) { clips.push(c); continue }
      const db = loudnessDb(buf, c.inPoint, c.outPoint)
      clips.push({ ...c, volume: clamp(Math.pow(10, (target - db) / 20), 0.05, 1) })
      n++
    }
    if (!n) return notify('Chưa có clip nào có tiếng để cân bằng.')
    get().commit({ ...get().project, clips })
    notify(`${T('Đã cân bằng âm lượng cho')} ${n} clip.`)
  },

  addCaptions: (items, styleId = 'classic', append = false) => {
    const style = CAPTION_STYLES.find((s) => s.id === styleId) ?? CAPTION_STYLES[0]
    let p = get().project
    if (!p.tracks.some((t) => t.id === 'cap')) {
      p = { ...p, tracks: [{ id: 'cap', kind: 'text', name: 'Phụ đề', muted: false, hidden: false }, ...p.tracks] }
    }
    const sorted = [...items].filter((i) => i.text.trim() && i.end > i.start).sort((a, b) => a.start - b.start)
    const clips: Clip[] = sorted.map((it, i) => {
      const end = Math.min(it.end, sorted[i + 1]?.start ?? it.end) // không để hai phụ đề chồng nhau
      return {
        id: uid(), assetId: '', trackId: 'cap', start: Math.max(0, it.start), inPoint: 0, outPoint: Math.max(0.3, end - it.start),
        speed: 1, volume: 1, muted: true, cap: true, fx: { y: style.y }, text: { ...style.props, text: wrapCaption(it.text) },
      }
    })
    get().commit({ ...p, clips: [...(append ? p.clips : p.clips.filter((c) => !c.cap)), ...clips] })
    return clips.length
  },

  styleCaptions: (styleId) => {
    const style = CAPTION_STYLES.find((s) => s.id === styleId)
    if (!style) return
    const p = get().project
    get().commit({
      ...p,
      clips: p.clips.map((c) => (c.cap && c.text ? { ...c, fx: { ...c.fx, y: style.y }, text: { ...style.props, text: c.text.text } } : c)),
    })
  },

  applyTemplate: (t) => {
    let p: Project = { ...get().project, ratio: t.ratio, bg: t.bg }
    for (const x of t.texts) {
      const id = uid()
      const next = addTextClip(p, 't1', x.start, id, x.props, x.dur)
      if (!next) continue
      p = { ...next, clips: next.clips.map((c) => (c.id === id ? { ...c, fx: { y: x.y, animIn: { id: 'pop', dur: 0.5 } } } : c)) }
    }
    get().commit(p)
    notify(`${T('Đã áp dụng mẫu')} "${T(t.label)}". ${T('Hãy thêm video của bạn và sửa chữ ở bảng bên phải.')}`)
  },

  newProject: () => {
    for (const a of get().project.assets) {
      unregisterFile(a.id)
      forgetAudio(a.id)
      void deleteFile(a.id)
    }
    set({ project: defaultProject(), selectedId: null, playhead: 0, playing: false, past: [], future: [], clipboard: null, gestureBase: null })
  },


  patchClip: (id, patch, live) => {
    const p = get().project
    const next = { ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
    if (live) get().setLive(next)
    else get().commit(next)
  },
}))

/** Dùng cho bộ xuất video: lấy file gốc của tài nguyên. */
export const fileOf = (assetId: string) => getFile(assetId)
