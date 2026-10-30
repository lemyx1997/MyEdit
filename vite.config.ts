import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' để trang chạy được dưới đường dẫn GitHub Pages (…github.io/MyEdit/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
