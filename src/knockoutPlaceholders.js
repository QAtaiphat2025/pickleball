function koRoundName(round, maxRound) {
  if (round === maxRound) return 'Chung kết'
  if (round === maxRound - 1) return 'Bán kết'
  if (round === maxRound - 2) return 'Tứ kết'
  if (round === maxRound - 3) return 'Vòng 1/8'
  return `Vòng ${round}`
}

export function knockoutPlaceholderLabel(match, sideIndex, matches) {
  const feedId = match?.feeds?.[sideIndex]
  if (!feedId) return null

  const source = matches.find((m) => m.id === feedId)
  if (!source) return null

  const maxRound = Math.max(...matches.map((m) => m.round || 0))
  return `Thắng ${koRoundName(source.round || 1, maxRound)} ${(source.slot || 0) + 1}`
}
