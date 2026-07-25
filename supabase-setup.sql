-- =====================================================================
-- Pickleball Score — thiết lập backend Supabase (chạy 1 lần)
-- Dán toàn bộ file này vào: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1) Bảng lưu giải. Mỗi giải là 1 dòng: id (khớp t.id trong app) + data (JSON cả giải).
create table if not exists public.tournaments (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tự cập nhật updated_at mỗi lần UPDATE (để order/đồng bộ chuẩn).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tournaments_updated_at on public.tournaments;
create trigger trg_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

-- 2) Bật Row Level Security.
alter table public.tournaments enable row level security;

-- 3) Chính sách:
--    - Khách (anon) + admin (authenticated) đều ĐỌC được  -> viewer xem realtime.
--    - Chỉ admin đã đăng nhập (authenticated) mới GHI/SỬA/XÓA.
drop policy if exists "tournaments_read_all"    on public.tournaments;
drop policy if exists "tournaments_write_admin"  on public.tournaments;
drop policy if exists "tournaments_update_admin" on public.tournaments;
drop policy if exists "tournaments_delete_admin" on public.tournaments;

create policy "tournaments_read_all"
  on public.tournaments for select
  using (true);

create policy "tournaments_write_admin"
  on public.tournaments for insert
  to authenticated with check (true);

create policy "tournaments_update_admin"
  on public.tournaments for update
  to authenticated using (true) with check (true);

create policy "tournaments_delete_admin"
  on public.tournaments for delete
  to authenticated using (true);

-- 4) Bật Realtime cho bảng (viewer nhận thay đổi tức thì).
alter publication supabase_realtime add table public.tournaments;
