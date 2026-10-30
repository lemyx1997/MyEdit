import { del, get, set } from 'idb-keyval'
import type { Project } from './types'

// Lưu dự án trong trình duyệt (IndexedDB). Lỗi (ví dụ chế độ ẩn danh) được bỏ qua êm.
const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn()
  } catch {
    return undefined
  }
}

export const saveProject = (p: Project) => safe(() => set('project', p))
export const saveFile = (id: string, blob: Blob) => safe(() => set('file:' + id, blob))
export const deleteFile = (id: string) => safe(() => del('file:' + id))

export async function loadProject(): Promise<{ project: Project; blobs: Map<string, Blob> } | null> {
  const project = await safe(() => get<Project>('project'))
  if (!project) return null
  const blobs = new Map<string, Blob>()
  for (const a of project.assets) {
    const b = await safe(() => get<Blob>('file:' + a.id))
    if (b) blobs.set(a.id, b)
  }
  return { project, blobs }
}
