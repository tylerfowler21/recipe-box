// No 'server-only' marker here: this module imports node:dns and node:net, so
// it cannot be bundled for the browser regardless, and the absence lets the
// SSRF guards be exercised directly by scripts/test-import.ts.
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { parseRecipeText, type ParsedLine } from '@/lib/recipe-text'

/**
 * Importing a recipe from a URL.
 *
 * Two very different cases hide behind "paste a link":
 *
 *   Recipe sites publish schema.org/Recipe as JSON-LD, so the whole recipe can
 *   be read directly. This covers most food blogs and the big recipe sites.
 *
 *   Instagram and Facebook are login-walled and block server-side fetching, so
 *   there is no honest way to extract a recipe from them. Those return a
 *   `needsPaste` result: the link is kept, and the caller asks the user to
 *   paste the caption, which goes through the same parser as the Word import.
 *
 * TikTok and YouTube sit in between — both expose a public oEmbed endpoint that
 * returns the caption or title without any credentials.
 */

export type ImportResult =
  | {
      kind: 'recipe'
      sourceUrl: string
      title: string
      description?: string
      ingredients: ParsedLine[]
      steps: ParsedLine[]
      prepMinutes?: number
      cookMinutes?: number
      servings?: string
      photoUrl?: string
      source?: string
    }
  | {
      kind: 'needsPaste'
      sourceUrl: string
      platform: string
      title?: string
      photoUrl?: string
      /** Caption text when the platform's oEmbed gave us one. */
      prefill?: string
    }
  | { kind: 'error'; message: string }

const SOCIAL_HOSTS: Record<string, string> = {
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'fb.watch': 'Facebook',
  'threads.net': 'Threads',
  'tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'pinterest.com': 'Pinterest',
  'x.com': 'X',
  'twitter.com': 'X',
}

/** oEmbed endpoints that work without any API key. */
const OEMBED: Record<string, (u: string) => string> = {
  TikTok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  YouTube: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
}

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3

function platformFor(hostname: string): string | undefined {
  const host = hostname.replace(/^www\./, '')
  for (const [domain, name] of Object.entries(SOCIAL_HOSTS)) {
    if (host === domain || host.endsWith(`.${domain}`)) return name
  }
  return undefined
}

/**
 * Rejects addresses that aren't on the public internet.
 *
 * Without this, pasting a link is a request for the server to fetch anything
 * it can reach — cloud metadata endpoints, databases on the private network,
 * localhost. Checked per redirect hop, because only the final address matters.
 */
function isPrivateAddress(addr: string): boolean {
  const v = isIP(addr)

  if (v === 4) {
    const p = addr.split('.').map(Number)
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true
    if (p[0] === 169 && p[1] === 254) return true // link-local, incl. cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
    if (p[0] === 192 && p[1] === 168) return true
    if (p[0] === 192 && p[1] === 0 && p[2] === 0) return true
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true // CGNAT
    if (p[0] === 198 && (p[1] === 18 || p[1] === 19)) return true // benchmarking
    if (p[0] >= 224) return true // multicast and reserved
    return false
  }

  if (v === 6) {
    const a = addr.toLowerCase()
    if (a === '::1' || a === '::') return true
    if (a.startsWith('fe8') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb'))
      return true // link-local
    if (a.startsWith('fc') || a.startsWith('fd')) return true // unique local
    // IPv4-mapped (::ffff:10.0.0.1) — re-check the embedded address.
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return false
  }

  return true // unparseable: refuse
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("That doesn't look like a valid link.")
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https links can be imported.')
  }
  if (url.username || url.password) {
    throw new Error('Links with embedded credentials are not allowed.')
  }

  const { address } = await lookup(url.hostname).catch(() => {
    throw new Error("Couldn't find that site.")
  })
  if (isPrivateAddress(address)) {
    throw new Error('That link points to a private address.')
  }
  return url
}

/** Fetches with redirects followed by hand, so every hop is re-validated. */
async function safeFetch(raw: string): Promise<{ body: string; finalUrl: string }> {
  let current = raw
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // Identify honestly; some sites serve different markup to bots.
          'user-agent': 'RecipeBox/1.0 (personal recipe importer)',
          accept: 'text/html,application/xhtml+xml,application/json',
        },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) throw new Error('That link redirected nowhere.')
        current = new URL(location, url).toString()
        continue
      }
      if (!res.ok) throw new Error(`That site responded with ${res.status}.`)

      const length = Number(res.headers.get('content-length') ?? 0)
      if (length > MAX_BYTES) throw new Error('That page is too large to read.')

      const body = await res.text()
      if (body.length > MAX_BYTES) throw new Error('That page is too large to read.')
      return { body, finalUrl: url.toString() }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('That link redirected too many times.')
}

/* ------------------------------------------------------------- JSON-LD ---- */

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function typeMatches(node: unknown, wanted: string): boolean {
  if (typeof node !== 'object' || node === null) return false
  const t = (node as Record<string, unknown>)['@type']
  return asArray(t).some((x) => typeof x === 'string' && x.toLowerCase() === wanted)
}

/** Walks the whole JSON-LD document, including @graph, for a Recipe node. */
function findRecipeNode(root: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [root]
  while (queue.length) {
    const node = queue.shift()
    if (Array.isArray(node)) {
      queue.push(...node)
      continue
    }
    if (typeof node !== 'object' || node === null) continue
    if (typeMatches(node, 'recipe')) return node as Record<string, unknown>
    queue.push(...Object.values(node as Record<string, unknown>))
  }
  return null
}

/** "PT1H30M" -> 90. Recipe sites use ISO 8601 durations. */
function isoDurationToMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const m = value.match(/^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?/)
  if (!m) return undefined
  const days = Number(m[1] ?? 0)
  const hours = Number(m[2] ?? 0)
  const mins = Number(m[3] ?? 0)
  const total = Math.round(days * 1440 + hours * 60 + mins)
  return total > 0 ? total : undefined
}

function textOf(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    if (typeof o.text === 'string') return o.text
    if (typeof o.name === 'string') return o.name
  }
  return ''
}

/** Instructions come as a string, a list of steps, or sections of steps. */
function flattenInstructions(value: unknown): ParsedLine[] {
  const out: ParsedLine[] = []

  for (const node of asArray(value)) {
    if (typeMatches(node, 'howtosection')) {
      const section = node as Record<string, unknown>
      const name = typeof section.name === 'string' ? section.name : null
      for (const child of asArray(section.itemListElement)) {
        const text = textOf(child).trim()
        if (text) out.push({ text, group: name })
      }
      continue
    }
    const text = textOf(node).trim()
    if (!text) continue
    // A single blob of prose: let the text parser break it into steps.
    if (out.length === 0 && asArray(value).length === 1 && text.length > 200) {
      const parsed = parseRecipeText(text)
      const merged = [...parsed.ingredients, ...parsed.steps]
      if (merged.length > 1) return merged
    }
    out.push({ text, group: null })
  }
  return out
}

function firstImage(value: unknown): string | undefined {
  for (const node of asArray(value)) {
    if (typeof node === 'string' && node.startsWith('http')) return node
    if (typeof node === 'object' && node !== null) {
      const url = (node as Record<string, unknown>).url
      if (typeof url === 'string' && url.startsWith('http')) return url
    }
  }
  return undefined
}

function extractJsonLdRecipe(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim())
      const recipe = findRecipeNode(parsed)
      if (recipe) return recipe
    } catch {
      // Malformed JSON-LD is common; try the next block.
    }
  }
  return null
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  return html.match(re)?.[1]
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

/* ---------------------------------------------------------------- main ---- */

export async function importFromUrl(raw: string): Promise<ImportResult> {
  let platform: string | undefined
  try {
    const parsed = new URL(raw.trim())
    platform = platformFor(parsed.hostname)
  } catch {
    return { kind: 'error', message: "That doesn't look like a valid link." }
  }

  // Platforms with a public oEmbed: grab the caption, then hand over for paste.
  if (platform && OEMBED[platform]) {
    try {
      const res = await fetch(OEMBED[platform](raw.trim()), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        return {
          kind: 'needsPaste',
          sourceUrl: raw.trim(),
          platform,
          title: typeof data.title === 'string' ? data.title.slice(0, 200) : undefined,
          photoUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
          prefill: typeof data.title === 'string' ? data.title : undefined,
        }
      }
    } catch {
      // oEmbed is best-effort; fall through to a plain paste prompt.
    }
    return { kind: 'needsPaste', sourceUrl: raw.trim(), platform }
  }

  // Login-walled platforms: don't pretend. Ask for the caption.
  if (platform) {
    return { kind: 'needsPaste', sourceUrl: raw.trim(), platform }
  }

  let html: string
  let finalUrl: string
  try {
    const res = await safeFetch(raw.trim())
    html = res.body
    finalUrl = res.finalUrl
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Could not read that link.' }
  }

  const node = extractJsonLdRecipe(html)
  if (!node) {
    // No structured recipe. Offer what the page's own metadata gives us and
    // let the user paste the rest, rather than failing outright.
    const title = metaContent(html, 'og:title') ?? html.match(/<title[^>]*>([^<]+)</i)?.[1]
    return {
      kind: 'needsPaste',
      sourceUrl: finalUrl,
      platform: new URL(finalUrl).hostname.replace(/^www\./, ''),
      title: title ? stripTags(title).slice(0, 200) : undefined,
      photoUrl: metaContent(html, 'og:image'),
    }
  }

  const ingredients = asArray(node.recipeIngredient)
    .map((i) => stripTags(String(i)))
    .filter(Boolean)
    .map((text) => ({ text, group: null }))

  const steps = flattenInstructions(node.recipeInstructions)
    .map((s) => ({ ...s, text: stripTags(s.text) }))
    .filter((s) => s.text)

  // author is variously a string, a Person object, or an array of either.
  const author = asArray(node.author).map(textOf).filter(Boolean)[0]
  const source = author || new URL(finalUrl).hostname.replace(/^www\./, '')

  const yieldValue = asArray(node.recipeYield)[0]

  return {
    kind: 'recipe',
    sourceUrl: finalUrl,
    title: stripTags(textOf(node.name)) || 'Untitled recipe',
    description: node.description ? stripTags(String(node.description)).slice(0, 500) : undefined,
    ingredients,
    steps,
    prepMinutes: isoDurationToMinutes(node.prepTime),
    cookMinutes: isoDurationToMinutes(node.cookTime) ?? isoDurationToMinutes(node.totalTime),
    servings: yieldValue ? stripTags(String(yieldValue)).slice(0, 50) : undefined,
    photoUrl: firstImage(node.image),
    source,
  }
}
