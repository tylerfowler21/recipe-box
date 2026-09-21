export function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'recipe'
}

/**
 * Flattens everything worth matching on into one lowercase string.
 *
 * Search then costs a single LIKE against an indexed column instead of joining
 * ingredients and tags on every keystroke. Callers must rebuild this whenever a
 * recipe's title, ingredients, tags or notes change.
 */
export function buildSearchText(r: {
  title: string
  ingredients: string[]
  tags: string[]
  notes?: string | null
  description?: string | null
}) {
  return [r.title, r.description ?? '', r.notes ?? '', ...r.ingredients, ...r.tags]
    .join(' \n ')
    .toLowerCase()
}

/** Splits ingredients/steps into their named sub-sections, preserving order. */
export function groupBySection<T extends { group: string | null }>(items: T[]) {
  const sections: { name: string | null; items: T[] }[] = []
  for (const item of items) {
    const last = sections[sections.length - 1]
    if (last && last.name === item.group) last.items.push(item)
    else sections.push({ name: item.group, items: [item] })
  }
  return sections
}

export function formatTotalTime(prep?: number | null, cook?: number | null) {
  const total = (prep ?? 0) + (cook ?? 0)
  if (!total) return null
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}
