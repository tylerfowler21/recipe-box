/**
 * Combining grocery lines into one entry per ingredient.
 *
 * Two recipes both wanting flour should read as one line with the total, not
 * two lines you have to add up in the shop. Ingredients are free text, so this
 * parses what it can and is deliberately conservative: amounts are only summed
 * when the ingredient names match *and* the units are compatible. Anything it
 * can't confidently combine stays as its own line under the same heading,
 * which is far better than confidently reporting a wrong total.
 */

const FRACTION_GLYPHS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}
const GLYPHS = Object.keys(FRACTION_GLYPHS).join('')

/** Canonical unit -> its size in a base unit, per measurement family. */
type Family = 'volume' | 'weight' | 'count'

const UNITS: Record<string, { canonical: string; family: Family; base: number }> = {}

function defineUnit(canonical: string, family: Family, base: number, ...aliases: string[]) {
  for (const alias of [canonical, ...aliases]) {
    UNITS[alias] = { canonical, family, base }
  }
}

// Volume, based in millilitres.
defineUnit('tsp', 'volume', 4.92892, 'teaspoon', 'teaspoons', 't', 'tsps')
defineUnit('tbsp', 'volume', 14.7868, 'tablespoon', 'tablespoons', 'tbsps', 'tbs', 'tb')
defineUnit('fl oz', 'volume', 29.5735, 'floz', 'fluidounce', 'fluidounces')
defineUnit('cup', 'volume', 236.588, 'cups', 'c')
defineUnit('pint', 'volume', 473.176, 'pints', 'pt')
defineUnit('quart', 'volume', 946.353, 'quarts', 'qt')
defineUnit('gallon', 'volume', 3785.41, 'gallons', 'gal')
defineUnit('ml', 'volume', 1, 'millilitre', 'millilitres', 'milliliter', 'milliliters')
defineUnit('l', 'volume', 1000, 'litre', 'litres', 'liter', 'liters')

// Weight, based in grams.
defineUnit('oz', 'weight', 28.3495, 'ounce', 'ounces')
defineUnit('lb', 'weight', 453.592, 'lbs', 'pound', 'pounds')
defineUnit('g', 'weight', 1, 'gram', 'grams')
defineUnit('kg', 'weight', 1000, 'kilogram', 'kilograms')

// Countable things. Base 1 so they simply add up.
defineUnit('clove', 'count', 1, 'cloves')
defineUnit('can', 'count', 1, 'cans')
defineUnit('package', 'count', 1, 'packages', 'pkg', 'pkgs')
defineUnit('slice', 'count', 1, 'slices')
defineUnit('stick', 'count', 1, 'sticks')
defineUnit('bunch', 'count', 1, 'bunches')
defineUnit('head', 'count', 1, 'heads')
defineUnit('box', 'count', 1, 'boxes')

/** Prep and description that shouldn't split one ingredient into several. */
const DESCRIPTORS = new Set([
  'chopped', 'diced', 'minced', 'sliced', 'melted', 'softened', 'divided',
  'beaten', 'shredded', 'grated', 'cooked', 'uncooked', 'fresh', 'frozen',
  'large', 'small', 'medium', 'ground', 'crushed', 'peeled', 'drained',
  'rinsed', 'warm', 'cold', 'room', 'temperature', 'optional', 'plus',
  'more', 'taste', 'halved', 'quartered', 'cubed', 'trimmed', 'boneless',
  'skinless', 'of', 'a', 'an', 'the',
])

/**
 * Words that describe *preparation* and can be dropped from a shopping label.
 *
 * A strict subset of DESCRIPTORS. "ground", "fresh", "large" and "smoked" stay
 * out of it deliberately: they group fine, but on a shopping list "ground beef"
 * and "beef" are different purchases, so they must survive into the label.
 */
const PREP_ONLY = new Set([
  'chopped', 'diced', 'minced', 'sliced', 'melted', 'softened', 'divided',
  'beaten', 'shredded', 'grated', 'cooked', 'uncooked', 'peeled', 'drained',
  'rinsed', 'cold', 'warm', 'halved', 'quartered', 'cubed', 'trimmed',
  'crushed', 'room', 'temperature', 'optional',
])

/** Turns "Cold diced butter" into "Butter" without losing "ground beef". */
function displayName(name: string): string {
  const words = name.split(/\s+/).filter((w) => !PREP_ONLY.has(w.toLowerCase().replace(/[^a-z]/g, '')))
  const cleaned = words.join(' ').replace(/\s+/g, ' ').trim()
  const out = cleaned || name
  return out.charAt(0).toUpperCase() + out.slice(1)
}

const NUMBER = `(?:\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+[${GLYPHS}]|[${GLYPHS}]|\\d+(?:\\.\\d+)?)`
const LEADING_QTY = new RegExp(`^\\s*(${NUMBER})(?:\\s*(?:-|–|to)\\s*(${NUMBER}))?\\s*`, 'i')

function toNumber(raw: string): number | null {
  const t = raw.trim()
  const attached = t.match(new RegExp(`^(\\d+)([${GLYPHS}])$`))
  if (attached) return Number(attached[1]) + FRACTION_GLYPHS[attached[2]]
  if (t.length === 1 && FRACTION_GLYPHS[t] !== undefined) return FRACTION_GLYPHS[t]
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export type ParsedIngredient = {
  /** null when the line had no readable amount ("Salt"). */
  quantity: number | null
  /** Canonical unit, or null for a bare count ("2 avocados"). */
  unit: string | null
  family: Family | null
  /** Lowercased, descriptor-stripped, for grouping. */
  key: string
  /** Tidied but readable, for display. */
  name: string
  original: string
}

function singular(word: string): string {
  if (word.length <= 3) return word
  if (/(ss|us|is)$/.test(word)) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('es') && /(ch|sh|x|s|z)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

export function parseIngredient(text: string): ParsedIngredient {
  const original = text.trim()

  // Strip parentheticals and footnote markers — "(2-3 cans)", "($8.07)", "*see note".
  let rest = original
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*.*$/, ' ')
    .trim()

  let quantity: number | null = null
  const qtyMatch = rest.match(LEADING_QTY)
  if (qtyMatch) {
    const first = toNumber(qtyMatch[1])
    const second = qtyMatch[2] ? toNumber(qtyMatch[2]) : null
    // A range means "somewhere between"; take the larger so you don't under-buy.
    quantity = second !== null && first !== null ? Math.max(first, second) : first
    rest = rest.slice(qtyMatch[0].length)
  }

  let unit: string | null = null
  let family: Family | null = null
  const unitMatch = rest.match(/^([a-zA-Z]+\.?)\s+/)
  if (unitMatch) {
    const asWritten = unitMatch[1].replace(/\.$/, '')
    // Case is meaningful for exactly one abbreviation: in recipes "T" is a
    // tablespoon and "t" a teaspoon. Lowercasing first silently turns every
    // "10 T. butter" into ten teaspoons.
    const raw =
      asWritten === 'T' ? 'tbsp' : asWritten === 't' ? 'tsp' : asWritten.toLowerCase()
    const found = UNITS[raw]
    if (found) {
      unit = found.canonical
      family = found.family
      rest = rest.slice(unitMatch[0].length)
    }
  }

  // Everything after the first comma or dash is preparation, not identity —
  // the family doc writes both "coconut oil, melted" and "green onions - minced".
  const name = rest
    .split(/,|\s[-–—]\s/)[0]
    .replace(/\s+/g, ' ')
    .replace(/[\s\-–—]+$/, '')
    .trim()

  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !DESCRIPTORS.has(w))
    .map(singular)
    .join(' ')
    .trim()

  return {
    quantity,
    unit,
    family,
    key: key || original.toLowerCase(),
    name: name || original,
    original,
  }
}

/** 1.5 -> "1 ½". Shared style with the recipe scaler. */
const PRETTY: [number, string][] = [
  [1 / 8, '⅛'], [1 / 6, '⅙'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [5 / 6, '⅚'], [7 / 8, '⅞'],
]

export function formatAmount(value: number): string {
  const whole = Math.floor(value + 1e-9)
  const rest = value - whole
  if (rest < 0.02) return String(whole)

  let best = ''
  let gap = Infinity
  for (const [fraction, glyph] of PRETTY) {
    const d = Math.abs(rest - fraction)
    if (d < gap) {
      gap = d
      best = glyph
    }
  }
  if (gap <= 0.02) return whole > 0 ? `${whole} ${best}` : best
  if (Math.abs(rest - 1) < gap) return String(whole + 1)
  if (value >= 10) return String(Math.round(value * 10) / 10)
  if (gap <= 0.05) return whole > 0 ? `${whole} ${best}` : best
  return String(Math.round(value * 100) / 100)
}

export type CombinedLine = {
  /** The summed amount, e.g. "3 ½ cups". Null when nothing was measurable. */
  amount: string | null
  name: string
  /** Every original line that fed into this, for showing the workings. */
  parts: { text: string; sourceLabel: string | null; id: string; checked: boolean }[]
  /** True when some parts couldn't be added to the total. */
  partial: boolean
}

type Input = { id: string; text: string; sourceLabel: string | null; checked: boolean }

/**
 * Groups by ingredient and totals what can honestly be totalled.
 *
 * Within a group, amounts are converted to the unit most of them already use,
 * so the result reads the way the recipes were written rather than in some
 * normalised base unit nobody shops in.
 */
export function combineIngredients(items: Input[]): CombinedLine[] {
  const groups = new Map<string, { parsed: ParsedIngredient; item: Input }[]>()

  for (const item of items) {
    const parsed = parseIngredient(item.text)
    const existing = groups.get(parsed.key)
    if (existing) existing.push({ parsed, item })
    else groups.set(parsed.key, [{ parsed, item }])
  }

  const lines: CombinedLine[] = []

  for (const entries of groups.values()) {
    // The shortest form is the one carrying the least preparation detail:
    // "Butter" over "Cold diced butter".
    const name = displayName(
      entries
        .map((e) => e.parsed.name)
        .reduce((best, candidate) => (candidate.length < best.length ? candidate : best)),
    )
    const parts = entries.map((e) => ({
      text: e.item.text,
      sourceLabel: e.item.sourceLabel,
      id: e.item.id,
      checked: e.item.checked,
    }))

    const measurable = entries.filter((e) => e.parsed.quantity !== null)
    if (measurable.length === 0) {
      lines.push({ amount: null, name, parts, partial: false })
      continue
    }

    // Bare counts ("2 avocados") only add up with other bare counts.
    const families = new Set(measurable.map((e) => e.parsed.family ?? 'bare'))
    if (families.size > 1) {
      lines.push({ amount: null, name, parts, partial: true })
      continue
    }

    if (families.has('bare')) {
      const total = measurable.reduce((sum, e) => sum + (e.parsed.quantity ?? 0), 0)
      lines.push({
        amount: formatAmount(total),
        name,
        parts,
        partial: measurable.length !== entries.length,
      })
      continue
    }

    const totalBase = measurable.reduce(
      (sum, e) => sum + (e.parsed.quantity ?? 0) * UNITS[e.parsed.unit!].base,
      0,
    )

    // Report in the largest unit the recipes actually used that still leaves a
    // total of at least one, so 16 tbsp of butter reads as "1 cup" rather than
    // a number nobody shops by.
    const present = [...new Set(measurable.map((e) => e.parsed.unit!))].sort(
      (a, b) => UNITS[b].base - UNITS[a].base,
    )
    const target = present.find((u) => totalBase / UNITS[u].base >= 1) ?? present[present.length - 1]
    const total = totalBase / UNITS[target].base
    const plural = total > 1 && /^(cup|clove|can|package|slice|stick|bunch|head|box|pint|quart|gallon)$/.test(target)

    lines.push({
      amount: `${formatAmount(total)} ${target}${plural ? 's' : ''}`,
      name,
      parts,
      partial: measurable.length !== entries.length,
    })
  }

  return lines.sort((a, b) => a.name.localeCompare(b.name))
}
