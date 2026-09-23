# Recipe Box

The family recipe collection, moved off Google Docs: searchable, tagged,
plannable, and with a grocery list that fills itself from the week's meals.

43 recipes were imported from `Recipe Book.docx`.

## Running it locally

```bash
npm install
cp .env.example .env        # then fill in the three values
npm run db:migrate          # apply migrations
npm run db:seed             # import the 43 recipes
npm run dev                 # http://localhost:3100
```

Sign in with the value of `HOUSEHOLD_PASSWORD`. There are no individual
accounts by design: one password, one shared recipe box.

Postgres is used in dev and in production, so what runs locally is what
deploys. The easiest local database is a branch of the same Neon project
Vercel provisions — see below.

## The import

`scripts/parse-docx.py` turns the Word doc into `prisma/seed-data/recipes.json`.
The doc accumulated four different formats over the years, so the parser treats
`Ingredients` / `Instructions` headers as a *hint* rather than a requirement:
when a block has no labels it scores each line as ingredient-like or step-like
and picks the single split point that best separates them.

```bash
npm run import:docx        # re-parse the .docx
npm run db:seed            # wipe recipes and re-import
```

Re-seeding **deletes all recipes, tags, meal plans and grocery items**, so once
you start editing recipes in the app, stop re-seeding.

Hand-fixes live in `prisma/seed-data/corrections.json`, keyed by the title the
parser produced, so re-running the parser never clobbers them.

### What the import couldn't fix

14 recipes are flagged **"needs a look"** in the app. These aren't parser
failures — the source doc genuinely has no ingredient list or no instructions
for them (Guacamole, Green Smoothie and Protein Balls list ingredients only;
Basil Corn and both Baked Chicken Breast recipes are instructions only; Pizzas
is a heading and the word "Dough"). Nothing was invented to fill the gaps.
Filter to them with the "Needs a look" button on the recipes page.

One recipe had no title at all — the Cajun steak bites pasted in from
Instagram. It's named in `corrections.json`.

## Deploying to Vercel

Deployed from GitHub through Vercel's git integration, same as Links Up.
Postgres and photo storage are both already wired up in the code; what's left
is creating the accounts and pasting three values.

**1. Push to GitHub.** Make a new **private** repo (the recipes are family
data), then:

```bash
git remote add origin git@github.com:tylerfowler21/recipe-box.git
git push -u origin main
```

**2. Import it in Vercel.** New Project → pick the repo → Deploy. The first
build will fail until the environment variables below exist; that's expected.

**3. Add Postgres.** Project → Storage → Create Database → Postgres. Vercel
provisions a Neon database and injects `DATABASE_URL` into all environments
automatically.

**4. Add Blob storage.** Project → Storage → Create → Blob. This injects
`BLOB_READ_WRITE_TOKEN`. Without it the upload route falls back to the local
filesystem, which is read-only on Vercel, so uploads would fail.

**5. Set the two secrets.** Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `HOUSEHOLD_PASSWORD` | whatever everyone in the house will type |

**6. Migrate and seed the production database.** Copy `DATABASE_URL` from
Vercel's Storage tab, then from your machine:

```bash
DATABASE_URL="<the production url>" npm run db:migrate
DATABASE_URL="<the production url>" npm run db:seed
```

Then redeploy. Seeding is a one-time step — see the warning above about what
re-seeding destroys.

### Notes on migrations

`npm run db:migrate` sets `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true`, and
`prisma.config.ts` points the CLI at Neon's **direct** endpoint (the pooled
hostname without `-pooler`). Both are needed: the pooled endpoint runs pgbouncer
in transaction mode, which can't hold the session-level advisory lock Prisma
Migrate takes, and the failure surfaces as a misleading `P1002` connection
timeout. Disabling the lock is safe here because only one person ever runs a
migration. The running app still uses the pooled URL, which is what it should
use.

### Notes

`postinstall` runs `prisma generate`, because `src/generated` is gitignored and
Vercel builds from a clean clone.

The app is fully server-rendered and every route reads cookies, so nothing is
prerendered from the database. The Prisma client in `src/lib/prisma.ts` is
built lazily on first property access for that reason: `next build` imports
every route module to collect its config, and constructing a client at import
time would make `DATABASE_URL` a *build*-time requirement. A missing URL should
fail the request that needs it, not the build.

## How it's put together

| Path | What's there |
| --- | --- |
| `src/lib/prisma.ts` | The only place a Prisma client is constructed |
| `src/lib/queries.ts` | Reads — search, filters, week plan, grocery list |
| `src/lib/actions.ts` | Writes — every one re-checks auth |
| `src/lib/tagging.ts` | Keyword auto-tagging for imported recipes |
| `src/lib/auth.ts` | Shared-password session, HMAC cookie |
| `src/proxy.ts` | Optimistic redirect for signed-out visitors |
| `scripts/parse-docx.py` | The one-time Word import |

Search runs against a denormalised lowercase `searchText` column holding the
title, ingredients, tags and notes — one indexed `LIKE` instead of a fan-out of
joins. Anything that changes those fields has to rebuild it; `buildSearchText`
in `src/lib/recipes.ts` is the single place that's done.

Server Actions are reachable by direct POST, not just through the UI, so
`src/proxy.ts` is treated as a redirect convenience only and every action calls
`requireSession()` itself.

## Adding a recipe from a link

**Add from a link** (`/recipes/import`) takes a URL and fills the form in.

Recipe sites and food blogs publish `schema.org/Recipe` as JSON-LD, so title,
ingredients, steps, times, servings, photo and author are read straight off the
page. Verified against Simply Recipes, AllRecipes, BBC Good Food and Budget
Bytes.

Instagram and Facebook are login-walled and block server-side fetching, so
there is no honest way to extract a recipe from them. Those keep the link and
ask you to paste the caption, which goes through `src/lib/recipe-text.ts` — the
same line-scoring parser that split the Word document. TikTok and YouTube sit in
between: both expose a public oEmbed endpoint, so the caption and thumbnail come
across without any API key.

### A note on fetching user-supplied URLs

`src/lib/import-url.ts` treats every pasted link as hostile. It resolves the
hostname and refuses private, loopback, link-local, CGNAT and multicast
addresses — including `169.254.169.254`, the cloud metadata endpoint — follows
redirects by hand so **every hop** is re-checked rather than just the first, and
caps body size and time. Without that, "paste a link" is an invitation for the
server to fetch anything on its private network.

## Scaling a recipe

Each recipe has a **Make ½× 1× 2× 3×** control that rescales the ingredient
list in place. The original amount stays visible in grey alongside.

Quantities are stored as free text ("1 1/2 cups flour", "⅓ c. butter", "3-4
peaches"), because that's how they were written down. `src/lib/scale.ts` finds
the quantity at the front of a line, multiplies it, and re-renders it in the
same style — halving `⅓` gives `⅙`, not a decimal. Lines with no leading
quantity ("Salt", "Dash of vanilla") are left alone: silently doubling "Salt"
would be wrong, and guessing at mid-sentence numbers does more harm than good.

Scaling is display-only and never saved.

## Meal planning

A meal can be several recipes. A pork salad and its dressing, a main and its
sides — they go in the same slot and render under one heading with a count,
rather than repeating "Dinner" down the day.

The add form stays open after each addition and keeps the slot it was set to,
because adding a dressing straight after the salad is the common case.

That form handles its own `onSubmit` rather than using the `action` prop.
React resets a form automatically once its action resolves, and that DOM reset
knocks a *controlled* `<select>` back to its first option without React's state
changing — so the slot silently reverted to breakfast and the second recipe of
a meal landed at the wrong time of day. Owning the submit means owning exactly
which fields get cleared.

## The grocery list

Two views of the same rows:

**By recipe** groups lines under the meal that put them there — it answers "why
is this on the list".

**Combined** merges them into one line per ingredient with the amounts added
up, and names the meals it's for on the right. That's the question you actually
have in the shop.

`src/lib/ingredients.ts` does the combining, and is deliberately conservative:
amounts are only summed when the ingredient names match *and* the units are
compatible. Anything it can't confidently total keeps its own line, and a line
whose total omits some unmeasured entries is marked `+more`. A wrong total is
worse than no total.

Two details it gets right that are easy to get wrong:

- **`T` is a tablespoon and `t` a teaspoon.** Lowercasing the unit before
  looking it up turns "10 T. butter" into ten teaspoons — a threefold error in
  the direction of not buying enough.
- **Totals are reported in the largest unit the recipes actually used** that
  still leaves at least one of it, so 16 tbsp of butter reads "1 cup" rather
  than a number nobody shops by.

Ticking off a combined line checks every underlying row in one action.

**Clear done** removes the ticked items — the normal "back from the shop"
move. **Clear all** empties the list outright and asks first, naming how many
items and how many of those you hadn't got yet, since there's no undo and it
sits next to the harmless one.

**Print** gives paper rather than a screenshot of the app: no cards or tinted
backgrounds, black text, hollow tick boxes you can mark with a pen, two columns
to halve the paper, and a dated heading. Whichever view is on screen is the one
that prints.

**Copy** puts the outstanding items on the clipboard as plain text. No grocery
service offers a public "add these to my cart" API — Walmart's developer
programme is for sellers, not shoppers — so a pasteable list is the honest
route into a store app, a notes app or a text message.

## Photo cleanup

Replacing a recipe's photo deletes the old one, and deleting a recipe deletes
its photo. Without that, every replaced image stays in the Blob store forever.

Only photos **this app stored** are ever deleted — `isManagedPhoto` in
`src/lib/blob.ts` checks the URL is a Vercel Blob host or a local dev upload,
so a pasted image URL is never touched. The hostname is parsed rather than
matched as a substring, so neither `evil.com/public.blob.vercel-storage.com/x`
nor `public.blob.vercel-storage.com.evil.com` slips through.

Cleanup runs *after* the save commits, never before: deleting first would drop
the old photo and leave nothing if the save then failed. It also swallows its
own errors, because an orphaned blob is untidy while a save that fails over a
cleanup hiccup is a real problem.

For orphans that predate this, or anything the automatic path missed:

```bash
npm run blobs:prune              # report only
npm run blobs:prune -- --apply   # actually delete
```

It needs `BLOB_READ_WRITE_TOKEN` in `.env`, copied from the Vercel project's
environment variables. Adding it locally also makes local uploads go to Blob
instead of `public/uploads`.

## Sharing a recipe

Every recipe has a **Share** button that mints a read-only public link:

```
https://<host>/share/<token>
```

Anyone with the link can read that one recipe without the household password.
They get no navigation and no way to reach the rest of the collection, and the
page is marked `noindex` so it won't turn up in search results.

The token is 32 random bytes — the link *is* the credential, so it has to be
unguessable even by someone who knows every recipe name. Links are listed on
the recipe with a view count, and **Revoke** turns one off. A revoked link
returns exactly the same 404 as a token that never existed, so revoking gives
nothing away. Revoked rows are kept rather than deleted, so a link that stopped
working can still be accounted for.

`/share/` is the one path `src/proxy.ts` lets through unauthenticated.

## Tags

Imported recipes were auto-tagged by keyword into 20 tags across four kinds
(course, main ingredient, cuisine, method). They're suggestions — every tag is
editable per recipe, and new recipes get suggested tags only when you leave the
Tags field blank.
