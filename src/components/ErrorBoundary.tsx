import { Component, type ReactNode } from 'react'

/** Bắt lỗi bất ngờ để người dùng thấy lời nhắn dễ hiểu thay vì màn hình trắng. Dự án đã tự lưu nên không mất. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="max-w-md rounded-lg border p-6 text-center" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
          <div className="mb-2 text-3xl">😵</div>
          <h1 className="mb-2 text-lg font-semibold">Ứng dụng gặp trục trặc / Something went wrong</h1>
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
            Đừng lo, dự án của bạn đã được tự lưu trong trình duyệt. Hãy tải lại trang để tiếp tục.
            <br />
            Your project was auto-saved. Please reload the page.
          </p>
          <button className="rounded px-4 py-2 font-semibold" style={{ background: 'var(--accent)', color: '#04222a' }} onClick={() => location.reload()}>
            Tải lại trang / Reload
          </button>
          <p className="mt-3 break-words text-xs" style={{ color: 'var(--muted)' }}>{this.state.error.message}</p>
        </div>
      </div>
    )
  }
}
