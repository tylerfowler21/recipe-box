# Recipe Box

The family recipe collection, moved off Google Docs: searchable, tagged,
plannable, and with a grocery list that fills itself from the week's meals.

43 recipes were imported from `Recipe Book.docx`.

## Running it locally

```bash
npm install
npx prisma migrate dev     # creates prisma/dev.db
npm run db:seed            # imports the 43 recipes
npm run dev                # http://localhost:3100
```

Sign in with the value of `HOUSEHOLD_PASSWORD` in `.env` (currently
`change-me` — **change it**). There are no individual accounts by design:
one password, one shared recipe box.

`.env` needs three values:

```env
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="..."        # already generated; any 32+ random bytes
HOUSEHOLD_PASSWORD="..."    # what everyone types to get in
```

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

## Deploying so it works on phones

Two things must change first, and both need an account I can't create for you:

**1. Swap SQLite for Postgres.** SQLite writes to a local file, which a
serverless host either loses on every deploy or can't write at all.

- Create a Postgres database (Neon and Vercel Postgres both have free tiers).
- `npm install @prisma/adapter-pg pg` and drop `@prisma/adapter-better-sqlite3`.
- In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`.
- In `src/lib/prisma.ts`, swap `PrismaBetterSqlite3` for `PrismaPg`.
- Delete `prisma/migrations/` and run `npx prisma migrate dev --name init`.
- Re-run `npm run db:seed` against the new database.

The schema deliberately avoids SQLite-only and Postgres-only column types, so
nothing else needs touching.

> When you build the `PrismaPg` adapter, pass the schema explicitly:
> `new PrismaPg(config, { schema })`. Prisma's query engine emits fully
> qualified table names from the **adapter's** schema and ignores any
> `search_path` or `?schema=` in the connection string — so a correct-looking
> URL is not isolation. Keep `src/lib/prisma.ts` as the only place a client is
> constructed.

**2. Move photo uploads off the local disk.** `src/app/api/upload/route.ts`
writes to `public/uploads`, which is read-only on Vercel. Swap the `writeFile`
call for `put()` from `@vercel/blob` (or any object store) and return its URL —
the rest of the app only ever handles a URL string, so nothing else changes.
Pasting an image URL already works everywhere.

Then set `DATABASE_URL`, `SESSION_SECRET` and `HOUSEHOLD_PASSWORD` in the
host's environment and deploy.

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
