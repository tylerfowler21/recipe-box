#!/usr/bin/env python3
"""
One-time importer: turns the family "Recipe Book.docx" into structured JSON.

The doc accumulated four different formats over the years:
  1. "Ingredients" / "Instructions" headers          (front half)
  2. bold title, bare ingredient list, no headers    (GREEN SMOOTHIE, GUACAMOLE)
  3. bold title, ingredient list, then step list     (WHITE BREAD)
  4. no title, "-" bullets, emoji sub-headers        (pasted from Instagram)

So headers are treated as a hint, not a requirement: when a block has no labels
the parser scores each line as ingredient-like or step-like and finds the single
split point that best separates them. Anything it had to guess is recorded in
`_warnings` for human review rather than silently dropped.
"""
import json, os, re, sys, zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

INGREDIENTS_RE = re.compile(r'^ingredients?\b[\s:：–—-]*(.*)$', re.I)
STEPS_RE = re.compile(r'^(?:instructions?|directions?|steps|method)\b[\s:：–—-]*(.*)$', re.I)

FRACTIONS = '¼½¾⅓⅔⅛⅜⅝⅞'
UNIT_RE = re.compile(
    r'\b(?:c\.|cups?|tbsp?\.?|T\.|tablespoons?|tsp\.?|t\.|teaspoons?|oz\.?|ounces?|'
    r'lbs?\.?|pounds?|cloves?|cans?|packages?|pkg|pinch|dash|sticks?|box(?:es)?|'
    r'quarts?|pints?|gallons?|grams?|g\.|kg|ml|liters?|slices?|bunch|head)\b', re.I)
LEADING_QTY_RE = re.compile(rf'^\s*(?:[\d{FRACTIONS}]|\d+\s*/\s*\d+)')

VERBS = (r'mix|bake|preheat|pre-heat|add|stir|combine|cook|remove|let|serve|pour|place|heat|'
         r'roll|cut|spread|whisk|beat|knead|divide|fold|drain|boil|season|trim|flip|reduce|'
         r'toss|garnish|sprinkle|dice|peel|top|blend|chop|melt|grease|line|cover|refrigerate|'
         r'chill|freeze|thaw|marinate|simmer|saute|sauté|fry|grill|roast|broil|assemble|'
         r'transfer|repeat|set|bring|wash|rinse|drizzle|brush|layer|scoop|form|shape|punch')
VERB_RE = re.compile(rf'^\s*(?:{VERBS})\b', re.I)
TEMP_TIME_RE = re.compile(r'\b(?:\d+\s*°|\d+\s*degrees|at\s+\d{3}|for\s+\d+[\-–]?\d*\s*'
                          r'(?:min|minute|hour|second|sec)s?)\b', re.I)
EMOJI_RE = re.compile('[\U0001F300-\U0001FAFF☀-➿]')

# Some recipes use a bare cooking phase as a heading *inside* the bullet list
# ("Brine", "Rub", "Rest"). Matching an explicit verb list rather than "any
# short capitalised line" keeps single-word ingredients like "Salt" safe.
# Strictly cooking *actions*. Component names like "Topping", "Filling" or
# "Dough" are deliberately absent: those name a part of the dish that has its
# own ingredients, so forcing their contents to be steps loses the ingredients.
PHASE_RE = re.compile(
    r'^(?:brine|brush|rub|roast|rest|sear|marinate|prep|bake|fry|grill|'
    r'assemble|garnish|chill|freeze|thaw)$', re.I)


def read_paragraphs(path):
    z = zipfile.ZipFile(path)
    body = ET.fromstring(z.read('word/document.xml')).find(f'{W}body')
    paras = []
    for p in body.iter(f'{W}p'):
        pPr = p.find(f'{W}pPr')
        numbered = pPr is not None and pPr.find(f'{W}numPr') is not None
        text = ''.join(t.text or '' for t in p.iter(f'{W}t')).strip()
        bold = False
        r = p.find(f'{W}r')
        if r is not None:
            rPr = r.find(f'{W}rPr')
            bold = rPr is not None and rPr.find(f'{W}b') is not None
        paras.append({'text': re.sub(r'\s+', ' ', text), 'list': numbered,
                      'bold': bold and bool(text)})
    return paras


def step_score(line):
    """> 0 means the line reads like an instruction, < 0 like an ingredient."""
    s = 0
    if VERB_RE.match(line):            s += 2
    if TEMP_TIME_RE.search(line):      s += 2
    if len(line) > 90:                 s += 2
    elif len(line) > 55:               s += 1
    if line.rstrip().endswith('.') and len(line) > 30: s += 1
    if LEADING_QTY_RE.match(line):     s -= 2
    if UNIT_RE.search(line) and len(line) < 60: s -= 2
    if len(line) < 28:                 s -= 1
    return s


def split_block(lines):
    """Find the split point that best separates ingredients (before) from steps (after)."""
    scores = [step_score(l) for l in lines]
    best_i, best_val = len(lines), None
    for i in range(len(lines) + 1):
        val = sum(-s for s in scores[:i]) + sum(s for s in scores[i:])
        if best_val is None or val > best_val:
            best_val, best_i = val, i
    return lines[:best_i], lines[best_i:]


def is_title(p):
    t = p['text']
    return p['bold'] and t and len(t) <= 60 and not t.rstrip().endswith('.')


def title_text(t):
    return re.sub(r'[\s:：–—-]+$', '', t).strip()


def clean(t):
    return re.sub(r'^[\-–—•*]\s*', '', t).strip()


def is_group_header(p, nxt):
    t = clean(p['text'])
    if not t or len(t) > 45:
        return False
    if p['list']:
        # Inside a list, only an exact cooking-phase word counts as a heading.
        return bool(PHASE_RE.match(t.rstrip(':')) and nxt and nxt['list'])
    if LEADING_QTY_RE.match(t) or UNIT_RE.search(t):
        return False
    if t.endswith(':'):
        return True
    if EMOJI_RE.search(t) and len(t.split()) <= 6:
        return True
    if nxt and (nxt['list'] or nxt['text'].startswith('-')) and len(t.split()) <= 5 \
            and step_score(t) < 0 and not LEADING_QTY_RE.match(t):
        return True
    return False


def parse(paras):
    recipes, cur = [], None

    def new_recipe(title):
        return {'title': title, 'ingredients': [], 'steps': [], '_blocks': [], '_warnings': []}

    def flush():
        if cur is None:
            return
        # Resolve every deferred block, one group at a time.
        for group, lines in cur.pop('_blocks'):
            if group and PHASE_RE.match(group.rstrip(':')):
                # The group is named after a cooking action ("Roast", "Brine"),
                # so its contents are instructions no matter how they read.
                ing, steps = [], lines
            else:
                ing, steps = split_block(lines)
            for l in ing:
                cur['ingredients'].append({'text': l, 'group': group})
            for l in steps:
                cur['steps'].append({'text': l, 'group': group})
            label = f'sub-section {group!r}' if group else 'unlabelled block'
            cur['_warnings'].append(
                f'{label}: split into {len(ing)} ingredient(s) / {len(steps)} step(s) by heuristic')
        if not cur['ingredients']:
            cur['_warnings'].append('NO INGREDIENTS')
        if not cur['steps']:
            cur['_warnings'].append('NO STEPS')
        recipes.append(cur)

    kind, group, pending = None, None, []
    gap = 0

    def stash():
        nonlocal pending
        if pending:
            cur['_blocks'].append((group, pending))
            pending = []

    for i, p in enumerate(paras):
        nxt = next((q for q in paras[i + 1:] if q['text']), None)
        t = p['text']

        if is_title(p):
            if cur is not None:
                stash(); flush()
            cur = new_recipe(title_text(t))
            kind, group, pending = None, None, []
            gap = 0
            continue

        if not t:
            gap += 1
            continue

        # An untitled block after a wide gap is a new recipe, not a continuation.
        has_content = bool(cur and (cur['ingredients'] or cur['steps'] or len(pending) >= 3))
        if gap >= 4 and has_content and is_group_header(p, nxt):
            stash(); flush()
            cur = new_recipe('UNTITLED')
            cur['_warnings'].append('no bold title in source — needs a name')
            kind, group, pending = None, None, []
        gap = 0
        if cur is None:
            # Untitled leading content (the Instagram paste) still deserves a home.
            cur = new_recipe('UNTITLED')
            cur['_warnings'].append('no bold title in source — needs a name')
            kind, group, pending = None, None, []

        m = INGREDIENTS_RE.match(t)
        if m:
            stash()
            kind, group = 'ingredients', (m.group(1).strip(' :–—-') or None)
            continue
        m = STEPS_RE.match(t)
        if m:
            stash()
            kind, group = 'steps', (m.group(1).strip(' :–—-') or None)
            continue

        if is_group_header(p, nxt):
            stash()
            group, kind = t.rstrip(': ').strip(), None
            continue

        line = clean(t)
        if not line:
            continue
        if kind is None:
            pending.append(line)
        else:
            cur[kind].append({'text': line, 'group': group})

    if cur is not None:
        stash(); flush()
    return recipes


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else '/Users/tylerfowler/Downloads/Recipe Book.docx'
    out = sys.argv[2] if len(sys.argv) > 2 else 'prisma/seed-data/recipes.json'
    recipes = parse(read_paragraphs(src))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    clean_n = sum(1 for r in recipes if not r['_warnings'])
    print(f'{len(recipes)} recipes -> {out}  ({clean_n} clean, {len(recipes)-clean_n} to review)')
    for r in recipes:
        if r['_warnings']:
            print(f"  - {r['title'][:45]}: {'; '.join(r['_warnings'])}")
