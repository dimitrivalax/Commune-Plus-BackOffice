/** Tri texte (ordre alphabétique français). */
export function compareLocaleFr(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return (a || '').localeCompare(b || '', 'fr', { sensitivity: 'base' })
}

/**
 * Dates ISO optionnelles : en tri asc, les valeurs vides en dernier.
 * Pour tri desc, multiplier le résultat global par -1 côté appelant.
 */
export function compareOptionalIsoDateNullsLast(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const ta = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY
  const tb = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY
  return ta - tb
}

/** Deux dates ISO non optionnelles. */
export function compareIsoDateStrings(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime()
}

/**
 * Chaîne optionnelle (ex. URL) : vides en dernier en tri asc (ordre lexicographic sur les non-vides).
 */
export function compareOptionalStringNullsLast(
  a: string | null | undefined,
  b: string | null | undefined,
  loc: string = 'fr'
): number {
  const sa = a ?? ''
  const sb = b ?? ''
  if (!sa && !sb)
    return 0
  if (!sa)
    return 1
  if (!sb)
    return -1
  return sa.localeCompare(sb, loc, { sensitivity: 'base' })
}
