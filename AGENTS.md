# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
`CLAUDE.md` imports this file (`@AGENTS.md`); edit **this** file, not `CLAUDE.md`.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any Expo/React Native code. Do not rely on memory of older Expo APIs.

## What this is

**ReverseMacro** — a reverse-diet macro planner (Expo + Supabase). From a starting point (current daily macros), a calorie target, and a duration, the app generates a week-by-week progression table (kcal + protein/carbs/fat per day). It only *generates a plan* — it does not log daily food intake (explicitly out of scope).

Spec lives in [docs/scope.md](docs/scope.md) (cahier des charges). Task tracker is the **Kaneo backlog**, project "Reverse Macro" (slug `RM`) at backlog.slain.dev — reachable via the Kaneo MCP tools (project id `ibcvn93es430ungsw6fqewwl`). Numbered feature guides are in [docs/knowledge/](docs/knowledge/). Spec and tickets are written in **French**; code identifiers and UI strings are **English**.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`) — do not use npm despite README.

```bash
pnpm start          # expo start --tunnel
pnpm ios            # expo run:ios
pnpm android        # expo run:android
pnpm web            # expo start --web
pnpm lint           # expo lint (eslint-config-expo, flat config)
pnpm db:generate    # drizzle-kit generate — regenerate SQL migration from db/schema.ts
pnpm db:push        # drizzle-kit push — apply schema to the Postgres DB
```

No test runner is installed yet. Ticket RM-5 ("Tests unitaires `generateReversePlan`") will introduce one — pick the runner when starting that task.

## Environment variables

Two distinct sets — do not conflate them:

- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — read by the app client at runtime in [lib/supabase.ts](lib/supabase.ts). `EXPO_PUBLIC_`-prefixed vars are bundled into the client, so only the publishable/anon key belongs here.
- `DATABASE_URL` — direct Postgres connection string, used **only** by drizzle-kit ([drizzle.config.ts](drizzle.config.ts)) for migrations. Never import this into app code.

`.env` is gitignored; `.env.example` lists the required keys.

## Architecture

**Routing** is file-based (Expo Router v6, `typedRoutes` on). [app/_layout.tsx](app/_layout.tsx) mounts two route groups:

- `app/(auth)/` — unauthenticated zone: `sign-in`, `sign-up`.
- `app/(app)/(tabs)/` — authenticated zone with a bottom tab bar: `my-plans`, `new-plan`, `account`. Plan detail is a separate screen reached from My plans.

Session-based route guarding (redirect signed-out → `(auth)`, signed-in → `(app)`, persist across restarts) is **not yet implemented** — it's ticket RM-8. Session persistence itself is already wired: the Supabase client uses `AsyncStorage` and auto-refreshes on `AppState` foreground.

**The core domain logic is a pure function, `generateReversePlan`** (ticket RM-4, in progress — belongs in `lib/`). It takes current macros + target calories + duration + protein ratio and returns per-week daily quotas. It is UI-independent and the single source of truth for plan data. Critically: **the DB stores only the plan *parameters*; the detailed week-by-week table is recomputed client-side via `generateReversePlan` every time a plan opens.** Do not persist the expanded table.

**Data layer** is Drizzle ORM. [db/schema.ts](db/schema.ts) defines the `plans` table and its Row-Level-Security policies together, using the `drizzle-orm/supabase` helpers (`authUid`, `authenticatedRole`, `authUsers`). RLS is enabled and every policy scopes rows to `auth.uid() = user_id`, so a user only ever sees their own plans. Generated SQL lives in [drizzle/](drizzle/) — regenerate it with `pnpm db:generate` after editing the schema, never hand-edit migrations.

`plans` columns: `base_calories`, `base_protein`, `base_fat`, `base_carbs`, `target_calories`, `protein_ratio` (percent), `week_duration` (weeks). Note the schema uses English macro names (`fat`/`carbs`) while the French spec says *lipide*/*glucide* — same fields.

Note: app runtime talks to Supabase through `@supabase/supabase-js` (RLS-enforced, anon key). Drizzle/`postgres` are used for schema management only, not for app queries.

## Conventions

- Path alias `@/*` maps to the repo root (e.g. `@/lib/supabase`, `@/hooks/use-color-scheme`).
- File names are **kebab-case**, including components (`themed-text.tsx`, `use-color-scheme.ts`).
- New Architecture, React Compiler, and typed routes are enabled in [app.json](app.json) — keep them working; avoid patterns incompatible with the React Compiler.
- Theming goes through `constants/theme.ts` + the `use-color-scheme` / `use-theme-color` hooks. A shared design system (Button/Input/Card/Badge/Header) is planned in ticket RM-15; build reusable primitives there rather than styling ad hoc per screen.
- Feature tickets reference **Figma node ids** (e.g. Plan detail `1:304`, New plan `1:78`). On the New plan screen, Figma labels read "Fat" everywhere — that's a placeholder; the real inputs are protein / carbs / fat.
