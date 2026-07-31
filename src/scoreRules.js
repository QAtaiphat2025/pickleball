export const DEFAULT_WIN_POINT = 11
export const WIN_POINT_PRESETS = [11, 15, 21]

export function scoreRules(t) {
  const wp = Number(t?.winPoint)
  const winPoint = Number.isInteger(wp) && wp >= 1 ? wp : DEFAULT_WIN_POINT
  const mode =
    t?.scoreMode === 'touch' || t?.scoreMode === 'cap' || t?.scoreMode === 'by2'
      ? t.scoreMode
      : t?.winBy2 === false
        ? 'touch'
        : 'by2'

  return {
    winPoint,
    capPoint: winPoint + 4,
    mode,
    winBy2: mode !== 'touch',
  }
}

export function scoreRuleLabel(rules) {
  const { winPoint, capPoint, mode } = scoreRules(rules)
  if (mode === 'touch') return `${winPoint} điểm · chạm là thắng`
  if (mode === 'cap') return `${winPoint} điểm · cách 2, chạm ${capPoint}`
  return `${winPoint} điểm · cách 2`
}

export function validateScore(scoreA, scoreB, rules) {
  const { winPoint, capPoint, mode, winBy2 } = scoreRules(rules)
  const a = Number(scoreA)
  const b = Number(scoreB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return { ok: false, msg: 'Tỉ số phải là số nguyên ≥ 0' }
  }
  if (a === b) return { ok: false, msg: 'Không thể hoà' }
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)

  if (mode === 'touch') {
    if (hi !== winPoint) {
      return { ok: false, msg: `Bên thắng phải đúng ${winPoint} điểm` }
    }
    return { ok: true }
  }

  if (mode === 'cap') {
    if (hi > capPoint) {
      return { ok: false, msg: `Bên thắng không được vượt quá ${capPoint} điểm` }
    }
    if (hi < winPoint) {
      return { ok: false, msg: `Bên thắng phải đạt tối thiểu ${winPoint} điểm` }
    }
    if (hi === capPoint) return { ok: true }
    if (lo <= winPoint - 2 && hi !== winPoint) {
      return {
        ok: false,
        msg: `Thắng ở ${winPoint} khi đối thủ ≤ ${winPoint - 2} (không đánh tiếp)`,
      }
    }
    if (lo >= winPoint - 1 && hi - lo !== 2) {
      return { ok: false, msg: `Deuce: phải hơn đúng 2 điểm hoặc chạm ${capPoint}` }
    }
    return { ok: true }
  }

  if (!winBy2) return { ok: true }
  if (hi < winPoint) {
    return { ok: false, msg: `Bên thắng phải đạt tối thiểu ${winPoint} điểm` }
  }
  if (lo <= winPoint - 2 && hi !== winPoint) {
    return {
      ok: false,
      msg: `Thắng ở ${winPoint} khi đối thủ ≤ ${winPoint - 2} (không đánh tiếp)`,
    }
  }
  if (lo >= winPoint - 1 && hi - lo !== 2) {
    return { ok: false, msg: 'Deuce: bên thắng phải hơn đúng 2 điểm' }
  }
  return { ok: true }
}
