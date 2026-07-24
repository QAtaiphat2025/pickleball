import { useSyncExternalStore } from 'react'

const KEY = 'pickleball.state.v1'

const empty = () => ({
  tournaments: {},
  activeId: null,
})

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return empty()
    return { ...empty(), ...parsed }
  } catch {
    return empty()
  }
}

let state = load()
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getState() {
  return state
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater
  state = next
  emit()
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

// ---- id helper ----
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ---- tournament helpers ----
export function createTournament({ name, format, numGroups }) {
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
  setState((s) => ({
    ...s,
    tournaments: { ...s.tournaments, [id]: t },
    activeId: id,
  }))
  return id
}

export function updateTournament(id, patch) {
  setState((s) => {
    const t = s.tournaments[id]
    if (!t) return s
    const next = typeof patch === 'function' ? patch(t) : { ...t, ...patch }
    return { ...s, tournaments: { ...s.tournaments, [id]: next } }
  })
}

export function deleteTournament(id) {
  setState((s) => {
    const tournaments = { ...s.tournaments }
    delete tournaments[id]
    const activeId = s.activeId === id ? null : s.activeId
    return { ...s, tournaments, activeId }
  })
}

export function setActive(id) {
  setState((s) => ({ ...s, activeId: id }))
}

export function useActive() {
  return useStore((s) => (s.activeId ? s.tournaments[s.activeId] : null))
}
