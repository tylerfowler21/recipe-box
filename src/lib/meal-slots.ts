/**
 * The meals in a day, in the order they're eaten.
 *
 * One list drives both the picker and the sort, so a slot can't be offered in
 * the dropdown but rank as unknown when the day is rendered.
 */
export const MEAL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'other', label: 'Other' },
] as const

export type MealSlot = (typeof MEAL_SLOTS)[number]['value']

const RANK = new Map(MEAL_SLOTS.map((slot, i) => [slot.value, i]))

/** Anything unrecognised sorts last rather than disappearing. */
export function slotRank(slot: string): number {
  return RANK.get(slot as MealSlot) ?? MEAL_SLOTS.length
}

export function isMealSlot(value: string): value is MealSlot {
  return RANK.has(value as MealSlot)
}
