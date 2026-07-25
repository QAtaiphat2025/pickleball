import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Đã bỏ PWA/offline: app này cần mạng (dữ liệu lấy từ Supabase realtime).
// Service worker cũ (nếu máy từng cài PWA) được gỡ trong index.html để tránh
// kẹt cache trắng màn hình sau khi đổi kiến trúc.
export default defineConfig({
  base: '/pickleball/',
  server: {
    host: true,
    port: 5199,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5199,
    strictPort: true,
  },
  plugins: [react()],
})
