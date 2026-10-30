import { create } from 'zustand'
import { getFile, kindOf, probe, registerFile, unregisterFile } from './media'
import { deleteFile, saveFile } from './persist'
import {
  addClip, clamp, clipEnd, deleteClip, duplicateClip, pasteClip, projectDuration,
  setSpeed as opSetSpeed, splitClip,
} from './timeline/ops'
import type { Clip, Project, Ratio } from './types'
import { useUi } from './ui'

const HISTORY = 100
const uid = () => Math.random().toString(36).slice(2, 10)
const notify = (m: string) => useUi.getState().setNotice(m)

export function defaultProject(): Project {
  const track = (id: string, kind: 'video' | 'audio', name: string) => ({ id, kind, name, muted: false, hidden: false })
  return {
    name: 'Dự án chưa đặt tên',
    ratio: '16:9',
    assets: [],
    clips: [],
    tracks: [track('v2', 'video', 'Video 2'), track('v1', 'video', 'Video 1'), track('a1', 'audio', 'Âm thanh 1'), track('a2', 'audio', 'Âm thanh 2')],
  }
}

/** Khi hoàn tác/làm lại: giữ nguyên danh sách file và tên dự án hiện tại, chỉ lấy lại phần dựng. */
const reconcile = (snap: Project, cur: Project): Project => ({
  ...snap,
  name: cur.name,
  assets: cur.assets,
  clips: snap.clips.filter((c) => cur.assets.some((a) => a.id === c.assetId)),
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
  addAssets: (files: File[]) => Promise<void>
  removeAsset: (id: string) => void
  addToTimeline: (assetId: string, trackId?: string, start?: number) => void
  split: () => void
  deleteSelected: () => void
  duplicateSelected: () => void
  copy: () => void
  paste: () => void
  setSpeed: (id: string, speed: number) => void
  patchClip: (id: string, patch: Partial<Clip>, live?: boolean) => void
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

  hydrate: (p) => set({ project: p ?? defaultProject(), loaded: true, past: [], future: [] }),

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
    for (const file of files) {
      const kind = kindOf(file)
      if (!kind) {
        notify(`"${file.name}" không phải video, nhạc hoặc ảnh nên chưa nhập được.`)
        continue
      }
      try {
        const meta = await probe(file, kind)
        const id = uid()
        registerFile(id, file)
        void saveFile(id, file)
        set((s) => ({ project: { ...s.project, assets: [...s.project.assets, { id, ...meta }] } }))
      } catch {
        notify(`Không đọc được "${file.name}". Hãy thử định dạng phổ biến như MP4, MP3, JPG, PNG.`)
      }
    }
  },

  removeAsset: (id) => {
    const p = get().project
    get().commit({ ...p, assets: p.assets.filter((a) => a.id !== id), clips: p.clips.filter((c) => c.assetId !== id) })
    unregisterFile(id)
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

  patchClip: (id, patch, live) => {
    const p = get().project
    const next = { ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
    if (live) get().setLive(next)
    else get().commit(next)
  },
}))

/** Dùng cho bộ xuất video: lấy file gốc của tài nguyên. */
export const fileOf = (assetId: string) => getFile(assetId)
