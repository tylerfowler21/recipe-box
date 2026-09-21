/**
 * Scaling ingredient quantities.
 *
 * Ingredients are stored as free text ("1 1/2 cups flour", "½ c. butter",
 * "3-4 peaches"), because that's how they were written down and rewriting them
 * into structured amounts would lose nuance. So scaling works on the text: find
 * the quantity at the front, multiply it, and put it back in the same style.
 *
 * Anything without a recognisable leading quantity — "Salt", "Juice of 1 lemon"
 * — is deliberately left alone. Silently doubling "Salt" would be wrong, and
 * guessing at mid-sentence numbers does more harm than good.
 */

const GLYPHS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

const GLYPH_CLASS = Object.keys(GLYPHS).join('')

// A quantity is: a whole number, a fraction, a mixed number, a decimal, or a
// range of any of those ("3-4", "2 to 3").
const NUMBER = `(?:\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+[${GLYPH_CLASS}]|[${GLYPH_CLASS}]|\\d+(?:\\.\\d+)?)`
const QUANTITY_RE = new RegExp(`^(\\s*)(${NUMBER})(\\s*(?:-|–|to)\\s*(${NUMBER}))?`, 'i')

/**
 * Nice fractions people actually write, best match wins.
 *
 * Sixths matter more than they look: halving a third — a very common move —
 * lands on ⅙, and without it the nearest match is ⅛, which is simply wrong.
 */
const PRETTY: [number, string][] = [
  [1 / 8, '⅛'], [1 / 6, '⅙'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [5 / 6, '⅚'],
  [7 / 8, '⅞'],
]

function parseNumber(raw: string): number | null {
  const t = raw.trim()

  // "2½"
  const attached = t.match(new RegExp(`^(\\d+)([${GLYPH_CLASS}])$`))
  if (attached) return Number(attached[1]) + GLYPHS[attached[2]]

  if (t.length === 1 && GLYPHS[t] !== undefined) return GLYPHS[t]

  // "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])

  // "3/4"
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])

  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Renders a number the way a recipe would: 0.5 -> "½", 1.5 -> "1 ½". */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'

  const whole = Math.floor(value + 1e-9)
  const rest = value - whole

  if (rest < 0.02) return String(whole)

  let best = ''
  let bestGap = Infinity
  for (const [fraction, glyph] of PRETTY) {
    const gap = Math.abs(rest - fraction)
    if (gap < bestGap) {
      bestGap = gap
      best = glyph
    }
  }

  const render = () => (whole > 0 ? `${whole} ${best}` : best)

  // Lands on a familiar fraction: use it at any size, so 25.5 reads "25 ½".
  if (bestGap <= 0.02) return render()

  // Rounding up is closer than any fraction.
  if (Math.abs(rest - 1) < bestGap) return String(whole + 1)

  // Large amounts read better rounded than as approximate fractions.
  if (value >= 10) return String(Math.round(value * 10) / 10)

  if (bestGap <= 0.05) return render()

  return String(Math.round(value * 100) / 100)
}

/** Multiplies the leading quantity of one ingredient line. */
export function scaleIngredient(text: string, factor: number): string {
  if (factor === 1) return text

  const match = text.match(QUANTITY_RE)
  if (!match) return text

  const [full, lead, first, , second] = match
  const firstValue = parseNumber(first)
  if (firstValue === null) return text

  let replacement = formatQuantity(firstValue * factor)

  if (second) {
    const secondValue = parseNumber(second)
    if (secondValue !== null) {
      replacement += `-${formatQuantity(secondValue * factor)}`
    }
  }

  return `${lead}${replacement}${text.slice(full.length)}`
}

/** Scales a servings string when it starts with a number ("6", "4-6 people"). */
export function scaleServings(servings: string | null, factor: number): string | null {
  if (!servings || factor === 1) return servings
  return scaleIngredient(servings, factor)
}

export const SCALE_OPTIONS = [
  { factor: 0.5, label: '½×' },
  { factor: 1, label: '1×' },
  { factor: 2, label: '2×' },
  { factor: 3, label: '3×' },
] as const
