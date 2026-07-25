import { useSyncExternalStore, useRef } from 'react'
import { supabase, supabaseReady, ADMIN_EMAIL } from './supabase'

// activeId (đang xem giải nào) là trạng thái UI của TỪNG máy → vẫn để local.
const ACTIVE_KEY = 'pickleball.activeId'

const empty = () => ({
  tournaments: {}, // id -> object giải (mirror từ Supabase)
  activeId: loadActiveId(),
  session: null, // session đăng nhập admin (null = khách/chỉ xem)
  loading: supabaseReady, // đang tải danh sách giải lần đầu
  error: null, // lỗi mạng / cấu hình
  ready: supabaseReady, // đã cấu hình Supabase chưa
})

function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null
  } catch {
    return null
  }
}

function persistActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore */
  }
}

let state = empty()
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater
  state = next
  emit()
}

// So sánh nông: đủ để biết selector có trả kết quả "khác" hay không.
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false
  }
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!Object.is(a[k], b[k])) return false
  }
  return true
}

export function useStore(selector = (s) => s) {
  // Cache kết quả selector: chỉ trả reference mới khi giá trị thực sự đổi.
  // Nếu không, selector trả object literal mới mỗi lần gọi -> useSyncExternalStore
  // thấy reference khác -> re-render vô hạn ("Maximum update depth exceeded").
  const cacheRef = useRef({ has: false, value: undefined })
  const getSnapshot = () => {
    const next = selector(state)
    const cache = cacheRef.current
    if (cache.has && shallowEqual(cache.value, next)) {
      return cache.value
    }
    cache.has = true
    cache.value = next
    return next
  }
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ---- id helper ----
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ---- đồng bộ từ Supabase ----
// Gộp 1 dòng (row.data) vào cache local.
function upsertLocal(row) {
  const t = row?.data
  if (!t || !t.id) return
  setState((s) => ({ ...s, tournaments: { ...s.tournaments, [t.id]: t } }))
}

function removeLocal(id) {
  setState((s) => {
    if (!s.tournaments[id]) return s
    const tournaments = { ...s.tournaments }
    delete tournaments[id]
    const activeId = s.activeId === id ? null : s.activeId
    if (activeId !== s.activeId) persistActiveId(activeId)
    return { ...s, tournaments, activeId }
  })
}

// Nạp toàn bộ giải + mở kênh realtime. Gọi 1 lần lúc mở app.
let initialized = false
export async function initStore() {
  if (initialized || !supabaseReady) return
  initialized = true

  // 1) auth session hiện có + lắng nghe đổi trạng thái đăng nhập
  const { data: sess } = await supabase.auth.getSession()
  setState((s) => ({ ...s, session: sess?.session ?? null }))
  supabase.auth.onAuthStateChange((_event, session) => {
    setState((s) => ({ ...s, session: session ?? null }))
  })

  // 2) nạp danh sách giải
  await reload()

  // 3) realtime: mọi thay đổi bảng tournaments → cập nhật cache
  supabase
    .channel('tournaments-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournaments' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          removeLocal(payload.old?.id)
        } else {
          upsertLocal(payload.new)
        }
      },
    )
    .subscribe()
}

export async function reload() {
  if (!supabaseReady) return
  setState((s) => ({ ...s, loading: true, error: null }))
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, data')
    .order('created_at', { ascending: false })
  if (error) {
    setState((s) => ({ ...s, loading: false, error: error.message }))
    return
  }
  const map = {}
  data.forEach((row) => {
    if (row.data && row.data.id) map[row.data.id] = row.data
  })
  setState((s) => ({ ...s, tournaments: map, loading: false, error: null }))
}

// ---- tournament helpers (giữ chữ ký cũ; giờ ghi lên Supabase) ----
export async function createTournament({ name, format, numGroups }) {
  const id = uid('t')
  const t = {
    id,
    name: name || 'Giải mới',
    format: format || 'round-robin', // 'round-robin' | 'knockout' | 'group-knockout'
    numGroups: format === 'group-knockout' ? numGroups || 2 : null,
    groups: [], // [{ id, name, order, pairIds }] — chỉ dùng cho group-knockout
    stage: format === 'group-knockout' ? 'group' : null, // 'group' | 'knockout'
    createdAt: Date.now(),
    athletes: [],
    pairs: [],
    matches: [],
    paired: false,
    scheduled: false,
  }
  // optimistic: hiện local ngay
  setState((s) => ({
    ...s,
    tournaments: { ...s.tournaments, [id]: t },
    activeId: id,
  }))
  persistActiveId(id)

  const { error } = await supabase.from('tournaments').insert({ id, data: t })
  if (error) {
    // revert
    removeLocal(id)
    setState((s) => ({ ...s, error: error.message }))
    return null
  }
  return id
}

export async function updateTournament(id, patch) {
  const cur = state.tournaments[id]
  if (!cur) return
  const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }

  // optimistic
  setState((s) => ({ ...s, tournaments: { ...s.tournaments, [id]: next } }))

  const { error } = await supabase
    .from('tournaments')
    .update({ data: next })
    .eq('id', id)
  if (error) {
    // revert về bản cũ
    setState((s) => ({ ...s, tournaments: { ...s.tournaments, [id]: cur }, error: error.message }))
  }
}

export async function deleteTournament(id) {
  const cur = state.tournaments[id]
  // optimistic
  removeLocal(id)

  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) {
    // revert
    if (cur) setState((s) => ({ ...s, tournaments: { ...s.tournaments, [id]: cur }, error: error.message }))
  }
}

export function setActive(id) {
  persistActiveId(id)
  setState((s) => ({ ...s, activeId: id }))
}

export function useActive() {
  return useStore((s) => (s.activeId ? s.tournaments[s.activeId] : null))
}

// ---- auth (Supabase, một mật khẩu chung qua 1 user admin) ----
export async function login(password) {
  if (!supabaseReady) return { ok: false, msg: 'Chưa cấu hình Supabase' }
  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: (password || '').trim(),
  })
  if (error) return { ok: false, msg: 'Mật khẩu không đúng' }
  return { ok: true }
}

export async function logout() {
  if (supabaseReady) await supabase.auth.signOut()
}

// unlocked = đã đăng nhập admin. Giữ shape { unlocked } để các trang không phải sửa.
export function useAuth() {
  return useStore((s) => ({ unlocked: !!s.session, session: s.session }))
}

// tiện cho App: trạng thái tải/lỗi/cấu hình
export function useAppStatus() {
  return useStore((s) => ({ loading: s.loading, error: s.error, ready: s.ready }))
}
