import { createClient } from '@supabase/supabase-js'

// Cấu hình đọc từ biến môi trường (.env.local khi dev, GitHub secret khi deploy).
// anon key AN TOÀN để công khai — RLS ở Supabase mới là thứ bảo vệ dữ liệu.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(url && anonKey)

if (!supabaseReady) {
  // Không throw để app vẫn render được màn hình báo lỗi cấu hình.
  console.error(
    'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. ' +
      'Tạo file .env.local (xem .env.example) rồi chạy lại.',
  )
}

export const supabase = supabaseReady
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

// Email admin cố định — người dùng chỉ nhập mật khẩu, không cần biết email này.
// Mật khẩu quản trong Supabase (Authentication > Users), đổi ở dashboard.
export const ADMIN_EMAIL = 'admin@pickleball.local'
