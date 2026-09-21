/**
 * Keyword auto-tagging for imported recipes.
 *
 * The source doc has no categories at all, so without this the import lands as
 * one flat list of 43 titles — which is the problem we're trying to solve. These
 * are suggestions: every tag stays editable per-recipe in the UI.
 */

type Rule = { tag: string; any: RegExp }

const w = (...words: string[]) => new RegExp(`\\b(?:${words.join('|')})\\b`, 'i')

const TITLE_RULES: Rule[] = [
  { tag: 'Dessert', any: w('cake', 'cookie', 'cookies', 'brownie', 'bars?', 'cobbler', 'crisp', 'pie', 'frosting', 'smores', 's.?mores') },
  { tag: 'Bread', any: w('bread', 'rolls?', 'dough', 'crepes?') },
  { tag: 'Sauce', any: w('sauce', 'dressing', 'gravy', 'butter', 'guacamole', 'salsa') },
  { tag: 'Salad', any: w('salad') },
  { tag: 'Soup', any: w('soup', 'chili', 'stew') },
  { tag: 'Breakfast', any: w('breakfast', 'egg', 'eggs', 'pancake', 'waffle', 'smoothie', 'crepes?') },
  { tag: 'Drink', any: w('smoothie', 'shake', 'lemonade', 'punch') },
  { tag: 'Snack', any: w('protein balls', 'nuggets', 'hot pockets') },
  { tag: 'Side', any: w('corn', 'fries', 'potato', 'potatoes', 'rice', 'beans', 'asparagus', 'veggies') },
]

const CONTENT_RULES: Rule[] = [
  { tag: 'Chicken', any: w('chicken') },
  { tag: 'Beef', any: w('beef', 'steak', 'brisket', 'ground beef') },
  { tag: 'Pork', any: w('pork', 'bacon', 'ham', 'sausage') },
  { tag: 'Seafood', any: w('shrimp', 'salmon', 'fish', 'tuna', 'crab') },
  { tag: 'Pasta', any: w('pasta', 'noodles?', 'fettuccine', 'lasagna', 'spaghetti') },
  { tag: 'Mexican', any: w('tostadas?', 'enchiladas?', 'taco', 'salsa', 'cilantro', 'tortillas?', 'guacamole', 'costa vida') },
  { tag: 'Italian', any: w('lasagna', 'alfredo', 'ricotta', 'pizza', 'marinara', 'pesto', 'spaghetti', 'fettuccine') },
  { tag: 'Asian', any: w('sesame', 'soy sauce', 'thai', 'chinese', 'wonton', 'hoisin', 'teriyaki') },
]

const METHOD_RULES: Rule[] = [
  { tag: 'Air Fryer', any: w('air fryer') },
  { tag: 'Instant Pot', any: w('instant pot', 'pressure cooker') },
  { tag: 'Slow Cooker', any: w('slow cooker', 'crock ?pot') },
  { tag: 'Grill', any: w('grill', 'grilled') },
]

/** Slug -> kind, so the filter UI can group tags under headings. */
export const TAG_KINDS: Record<string, string> = {
  dessert: 'course', bread: 'course', sauce: 'course', salad: 'course',
  soup: 'course', breakfast: 'course', drink: 'course', snack: 'course', side: 'course',
  'main-dish': 'course',
  chicken: 'main-ingredient', beef: 'main-ingredient', pork: 'main-ingredient',
  seafood: 'main-ingredient', pasta: 'main-ingredient', vegetarian: 'main-ingredient',
  mexican: 'cuisine', italian: 'cuisine', asian: 'cuisine',
  'air-fryer': 'method', 'instant-pot': 'method', 'slow-cooker': 'method', grill: 'method',
  quick: 'method',
}

const MEAT = w('chicken', 'beef', 'steak', 'pork', 'bacon', 'ham', 'sausage', 'shrimp',
  'salmon', 'fish', 'tuna', 'turkey', 'meat')

export function suggestTags(title: string, ingredients: string[], steps: string[]): string[] {
  const tags = new Set<string>()
  const titleText = title
  const allText = [title, ...ingredients, ...steps].join('\n')

  for (const r of TITLE_RULES) if (r.any.test(titleText)) tags.add(r.tag)
  for (const r of CONTENT_RULES) if (r.any.test(allText)) tags.add(r.tag)
  for (const r of METHOD_RULES) if (r.any.test(allText)) tags.add(r.tag)

  // Vegetarian only when nothing meaty appears anywhere, and only for food
  // (a frosting isn't usefully "vegetarian").
  const isSweet = tags.has('Dessert') || tags.has('Drink')
  if (!MEAT.test(allText) && !isSweet && ingredients.length > 0) tags.add('Vegetarian')

  // Anything with a short, simple method reads as a weeknight option.
  if (steps.length > 0 && steps.length <= 4 && ingredients.length <= 8) tags.add('Quick')

  // Fall back to a course so nothing is left uncategorised.
  const courses = ['Dessert', 'Bread', 'Sauce', 'Salad', 'Soup', 'Breakfast', 'Drink', 'Snack', 'Side']
  if (!courses.some((c) => tags.has(c))) tags.add('Main Dish')

  return [...tags]
}
