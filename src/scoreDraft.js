function hasValue(v) {
  return v != null && v !== ''
}

function normalize(v) {
  return hasValue(v) ? Number(v) : null
}

export function scoreDraftChanged(match, draft) {
  const nextA = normalize(draft?.a ?? match.scoreA)
  const nextB = normalize(draft?.b ?? match.scoreB)
  if (nextA == null || nextB == null) return false
  return nextA !== normalize(match.scoreA) || nextB !== normalize(match.scoreB)
}
