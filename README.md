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

### Notes

`postinstall` runs `prisma generate`, because `src/generated` is gitignored and
Vercel builds from a clean clone.

The app is fully server-rendered and every route reads cookies, so there is
nothing to revalidate on a schedule and no build-time database access — the
build succeeds without `DATABASE_URL` set.

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

## Tags

Imported recipes were auto-tagged by keyword into 20 tags across four kinds
(course, main ingredient, cuisine, method). They're suggestions — every tag is
editable per recipe, and new recipes get suggested tags only when you leave the
Tags field blank.
