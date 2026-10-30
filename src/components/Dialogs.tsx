import { useState } from 'react'
import { TEMPLATES } from '../fx/templates'
import { useT } from '../i18n'
import { useProject } from '../store'
import { useUi } from '../ui'
import { accentBtn, line } from './ui'

export function Modal({ title, onClose, children, width = 460 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onMouseDown={onClose}>
      <div className="max-h-[90vh] overflow-auto rounded-lg border p-5 text-sm" style={{ width, background: 'var(--panel)', borderColor: 'var(--line)' }} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** Mẫu dự án sẵn cho TikTok / Reels / Shorts… */
export function TemplatesDialog() {
  const t = useT()
  const close = () => useUi.getState().setTemplatesOpen(false)
  const apply = useProject((s) => s.applyTemplate)
  return (
    <Modal title={t('Mẫu dự án')} onClose={close} width={520}>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>{t('Chọn một mẫu để đặt sẵn khung hình, nền và chữ. Video đã nhập của bạn không bị xoá.')}</p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((m) => {
          const [a, b] = m.ratio.split(':').map(Number)
          return (
            <button
              key={m.id}
              onClick={() => { apply(m); close() }}
              className="flex gap-3 rounded border p-3 text-left hover:bg-white/5"
              style={line}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                <div className="rounded-sm" style={{ aspectRatio: `${a}/${b}`, height: a >= b ? undefined : '100%', width: a >= b ? '100%' : undefined, background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }} />
              </div>
              <div>
                <div className="font-medium">{t(m.label)}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{t(m.desc)}</div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-4 text-right">
        <button className="rounded border px-4 py-1.5" style={line} onClick={close}>{t('Đóng')}</button>
      </div>
    </Modal>
  )
}

const STEPS = [
  { icon: '📥', title: 'Nhập video, ảnh, nhạc', body: 'Kéo file vào ô "Phương tiện" bên trái (hoặc bấm vào ô đó). File chỉ nằm trên máy bạn, không bị tải lên mạng.' },
  { icon: '🎞', title: 'Đưa lên dòng thời gian', body: 'Kéo hình thu nhỏ xuống dòng thời gian, hoặc bấm dấu ＋. Kéo clip để dời chỗ, kéo hai mép để cắt, Ctrl+B để tách tại kim chỉ.' },
  { icon: '✨', title: 'Thêm chữ, hiệu ứng, phụ đề', body: 'Các tab bên trái có chữ, nhãn dán, bộ lọc, chuyển cảnh và phụ đề tự động. Chọn một clip rồi chỉnh chi tiết ở bảng bên phải.' },
  { icon: '↶', title: 'Sai thì hoàn tác', body: 'Ctrl+Z để quay lại, Ctrl+Shift+Z để làm lại. Dự án được tự lưu trong trình duyệt, tải lại trang vẫn còn.' },
  { icon: '📤', title: 'Xuất video MP4', body: 'Bấm "Xuất video" ở góc trên phải, chọn độ phân giải rồi chờ thanh tiến độ chạy xong là file tự tải về.' },
]

/** Hướng dẫn nhanh khi mở lần đầu (mở lại bằng nút "?"). */
export function Tutorial() {
  const t = useT()
  const [i, setI] = useState(0)
  const close = () => useUi.getState().setTourOpen(false)
  const s = STEPS[i]
  return (
    <Modal title={`${t('Chào mừng đến với MyEdit')} (${i + 1}/${STEPS.length})`} onClose={close}>
      <div className="mb-4 flex gap-3">
        <div className="text-4xl">{s.icon}</div>
        <div>
          <div className="mb-1 font-semibold">{t(s.title)}</div>
          <p style={{ color: 'var(--muted)' }}>{t(s.body)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button className="text-xs underline" style={{ color: 'var(--muted)' }} onClick={close}>{t('Bỏ qua')}</button>
        <div className="flex gap-2">
          {i > 0 && <button className="rounded border px-3 py-1.5" style={line} onClick={() => setI(i - 1)}>{t('Quay lại')}</button>}
          {i < STEPS.length - 1 ? (
            <button className="rounded px-4 py-1.5 font-semibold" style={accentBtn} onClick={() => setI(i + 1)}>{t('Tiếp')}</button>
          ) : (
            <button className="rounded px-4 py-1.5 font-semibold" style={accentBtn} onClick={close}>{t('Bắt đầu dựng')}</button>
          )}
        </div>
      </div>
    </Modal>
  )
}
