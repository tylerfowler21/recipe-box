/**
 * Splits free-form recipe text into ingredients and steps.
 *
 * This is the TypeScript counterpart of scripts/parse-docx.py, and it exists
 * for the same reason: pasted text — an Instagram caption, a screenshot
 * transcription, a note from a relative — almost never labels its sections.
 * Each line is scored as ingredient-like or step-like, and the single split
 * point that best separates the two wins.
 */

const FRACTIONS = '¼½¾⅓⅔⅛⅜⅝⅞'

const UNIT_RE =
  /\b(?:c\.|cups?|tbsps?\.?|tbs\.?|T\.|tablespoons?|tsps?\.?|t\.|teaspoons?|oz\.?|ounces?|lbs?\.?|pounds?|cloves?|cans?|packages?|pkg|pinch|dash|sticks?|box(?:es)?|quarts?|pints?|gallons?|grams?|g\.|kg|ml|l\.|liters?|litres?|slices?|bunch|head|handful|sprigs?)\b/i

const LEADING_QTY_RE = new RegExp(`^\\s*(?:[\\d${FRACTIONS}]|\\d+\\s*/\\s*\\d+)`)

const VERBS =
  'mix|bake|preheat|pre-heat|add|stir|combine|cook|remove|let|serve|pour|place|heat|roll|cut|spread|whisk|beat|knead|divide|fold|drain|boil|season|trim|flip|reduce|toss|garnish|sprinkle|dice|peel|top|blend|chop|melt|grease|line|cover|refrigerate|chill|freeze|thaw|marinate|simmer|saute|sauté|fry|grill|roast|broil|assemble|transfer|repeat|set|bring|wash|rinse|drizzle|brush|layer|scoop|form|shape|punch|whip|crack|squeeze|strain|reserve|discard|cool|rest|shake|blitz|pulse'

const VERB_RE = new RegExp(`^\\s*(?:${VERBS})\\b`, 'i')

const TEMP_TIME_RE =
  /\b(?:\d+\s*°|\d+\s*degrees|at\s+\d{3}|for\s+\d+[-–]?\d*\s*(?:min|minute|hour|second|sec)s?)\b/i

/** Numbered or bulleted list markers people paste in: "1.", "2)", "-", "•". */
const BULLET_RE = /^\s*(?:\d{1,2}[.)]\s+|[-–—•*·]\s*)/

const SECTION_RE = {
  ingredients: /^ingredients?\b[\s:：–—-]*(.*)$/i,
  steps: /^(?:instructions?|directions?|steps|method|preparation)\b[\s:：–—-]*(.*)$/i,
}

export type ParsedLine = { text: string; group: string | null }
export type ParsedText = { ingredients: ParsedLine[]; steps: ParsedLine[] }

function stepScore(line: string): number {
  let s = 0
  if (VERB_RE.test(line)) s += 2
  if (TEMP_TIME_RE.test(line)) s += 2
  if (line.length > 90) s += 2
  else if (line.length > 55) s += 1
  if (line.trimEnd().endsWith('.') && line.length > 30) s += 1
  if (LEADING_QTY_RE.test(line)) s -= 2
  if (UNIT_RE.test(line) && line.length < 60) s -= 2
  if (line.length < 28) s -= 1
  return s
}

/** The split maximising ingredient-likeness before and step-likeness after. */
function splitBlock(lines: string[]): [string[], string[]] {
  const scores = lines.map(stepScore)
  let bestAt = lines.length
  let best: number | null = null
  for (let i = 0; i <= lines.length; i++) {
    let val = 0
    for (let j = 0; j < i; j++) val -= scores[j]
    for (let j = i; j < lines.length; j++) val += scores[j]
    if (best === null || val > best) {
      best = val
      bestAt = i
    }
  }
  return [lines.slice(0, bestAt), lines.slice(bestAt)]
}

const clean = (t: string) => t.replace(BULLET_RE, '').trim()

function isGroupHeader(line: string, next: string | undefined): boolean {
  const t = clean(line)
  if (!t || t.length > 45) return false
  if (LEADING_QTY_RE.test(t) || UNIT_RE.test(t)) return false
  if (t.endsWith(':')) return true
  // A short title-ish line directly above more content, e.g. "Dressing".
  return Boolean(next && t.split(/\s+/).length <= 4 && stepScore(t) < 0 && !/[.!?]$/.test(t))
}

export function parseRecipeText(raw: string): ParsedText {
  const out: ParsedText = { ingredients: [], steps: [] }
  const lines = raw.split('\n')

  let kind: 'ingredients' | 'steps' | null = null
  let group: string | null = null
  let pending: string[] = []
  let pendingGroup: string | null = null

  const flush = () => {
    if (!pending.length) return
    const [ing, steps] = splitBlock(pending)
    for (const text of ing) out.ingredients.push({ text, group: pendingGroup })
    for (const text of steps) out.steps.push({ text, group: pendingGroup })
    pending = []
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const t = rawLine.trim()
    if (!t) continue

    const ingMatch = t.match(SECTION_RE.ingredients)
    if (ingMatch) {
      flush()
      kind = 'ingredients'
      group = ingMatch[1]?.replace(/[\s:：–—-]+$/, '').trim() || null
      continue
    }
    const stepMatch = t.match(SECTION_RE.steps)
    if (stepMatch) {
      flush()
      kind = 'steps'
      group = stepMatch[1]?.replace(/[\s:：–—-]+$/, '').trim() || null
      continue
    }

    const next = lines.slice(i + 1).find((l) => l.trim())
    if (isGroupHeader(t, next)) {
      flush()
      group = clean(t).replace(/:$/, '').trim() || null
      pendingGroup = group
      kind = null
      continue
    }

    const text = clean(t)
    if (!text) continue

    if (kind === null) {
      pendingGroup = group
      pending.push(text)
    } else {
      out[kind].push({ text, group })
    }
  }

  flush()
  return out
}

/** Convenience for the form: back to newline text with "Group:" headers. */
export function linesToText(items: ParsedLine[]): string {
  const out: string[] = []
  let current: string | null = null
  for (const item of items) {
    if (item.group !== current) {
      if (out.length) out.push('')
      if (item.group) out.push(`${item.group}:`)
      current = item.group
    }
    out.push(item.text)
  }
  return out.join('\n')
}
