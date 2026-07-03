# `plans` table + RLS (Drizzle ORM) — Design

Kaneo ticket: [Schéma DB `plans` + RLS](https://backlog.slain.dev/dashboard/workspace/NvSAhqcNphPc0Np1mvHSHmjvAHFOU0CT/project/ibcvn93es430ungsw6fqewwl/task/tuiycn4sf680fh1bfr8enont) (task #3, project `ibcvn93es430ungsw6fqewwl`).

## Context

The Supabase backend is already initialized (client in [lib/supabase.ts](../../../lib/supabase.ts), email/password auth). This ticket creates the `plans` table, which stores the raw parameters of a reverse-diet plan (the week-by-week detail is recomputed client-side, see [docs/scope.md](../../scope.md)), with RLS enabled so each user only sees their own plans.

## ORM choice: Drizzle ORM

Drizzle is the most common ORM in the Supabase + React Native/Expo ecosystem, because:
- Native support for schema-as-code on Postgres and for RLS (`pgPolicy`, Supabase's predefined roles via `drizzle-orm/supabase`).
- `drizzle-kit` handles migration generation and application without requiring a Postgres driver to run from the React Native bundle (Hermes has no native `pg` driver): Drizzle is a tooling-only dependency (Node, local/CI), never part of the app.
- The app's runtime queries keep going through `supabase-js` (already in place), which enforces RLS via the session JWT — no changes to `lib/supabase.ts`.

Alternative rejected: Prisma (native binary incompatible with Hermes/RN, would need a server/edge-function layer for runtime execution — out of scope and out of the current stack).

## `plans` table schema

File `db/schema.ts`, columns:

| Column | Type | Constraint |
|---|---|---|
| `id` | uuid | PK, `defaultRandom()` |
| `user_id` | uuid | FK → `auth.users(id)`, `onDelete: cascade`, not null |
| `name` | text | not null |
| `base_calories` | integer | not null |
| `base_protein` | integer | not null |
| `base_fat` | integer | not null |
| `base_carbs` | integer | not null |
| `target_calories` | integer | not null |
| `protein_ratio` | integer | not null |
| `week_duration` | integer | not null |
| `created_at` | timestamptz | not null, `defaultNow()` |

`user_id` isn't listed in the spec ([docs/scope.md](../../scope.md)) but is required to enforce ownership-based RLS — added here.

## RLS

- `.enableRLS()` on the table (stable API of `drizzle-orm@0.45.x`; `.withRLS()` only exists on the v1 beta branch, not used here).
- 4 `pgPolicy` entries (select / insert / update / delete), role `authenticatedRole` (import from `drizzle-orm/supabase`), condition `auth.uid() = user_id` on `using` (and `withCheck` for insert/update).

## Migrations & execution

- `drizzle.config.ts` at the repo root, `dialect: "postgresql"`, `schema: "./db/schema.ts"`, `out: "./drizzle"`, `dbCredentials.url` = `process.env.DATABASE_URL`.
- npm scripts: `db:generate` (`drizzle-kit generate`) and `db:push` (`drizzle-kit push`).
- `DATABASE_URL`: direct Postgres connection string from Supabase, in the local `.env` (gitignored), **without** the `EXPO_PUBLIC_` prefix — that prefix would inline the Postgres user/password into the client bundle via Expo, exposing direct database access that fully bypasses RLS. `.env.example` only gets the empty key.
- `drizzle-orm` and `drizzle-kit` are devDependencies: used only by the migration CLI (Node), never imported from `app/`, so never bundled by Metro.
- Generated SQL migrations are committed under `drizzle/` (versioned schema history).

## Out of scope

- Application CRUD (lib/plans.ts, "My plans" / "New plan" screens): separate ticket.
- Automated tests: no test framework in place yet; manual verification only (see below).

## Verification

- `drizzle-kit push` succeeds against the Supabase database.
- `plans` table visible in the Supabase Table Editor with the correct columns/types.
- RLS enabled + 4 policies visible under Database > Policies.
- Logged in as a user, a `supabase.from("plans").select()` query only returns that user's rows (manual test: insert two rows with different `user_id` values).
