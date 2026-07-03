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
pnpm test           # jest (jest-expo preset)
pnpm db:generate    # drizzle-kit generate — regenerate SQL migration from db/schema.ts
pnpm db:push        # drizzle-kit push — apply schema to the Postgres DB
```

Tests run on **jest** with the `jest-expo` preset (config in `package.json`, not a separate file). The `@/*` alias is mapped there via `moduleNameMapper`. Run a single file with `pnpm test lib/generate-reverse-plan.test.ts`, or a single case with `-t "<name>"`. Uses `@testing-library/react-native` for component tests.

## Environment variables

Two distinct sets — do not conflate them:

- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — read by the app client at runtime in [lib/supabase.ts](lib/supabase.ts). `EXPO_PUBLIC_`-prefixed vars are bundled into the client, so only the publishable/anon key belongs here.
- `KCAL_PER_GRAM_PROTEIN` / `KCAL_PER_GRAM_CARBS` / `KCAL_PER_GRAM_FAT` — macro→calorie conversion constants consumed by `generateReversePlan`. Not `EXPO_PUBLIC_`-prefixed.
- `DATABASE_URL` — direct Postgres connection string, used **only** by drizzle-kit ([drizzle.config.ts](drizzle.config.ts)) for migrations. Never import this into app code.

All non-Supabase-client vars are accessed through [env.ts](env.ts) — a typed `Env` singleton that reads `process.env` and **throws at construction** if any required key is missing. Import `@/env` rather than touching `process.env` directly, and add new required vars to that class. `.env` is gitignored; `.env.example` lists the required keys.

## Architecture

**Routing** is file-based (Expo Router v6, `typedRoutes` on). [app/_layout.tsx](app/_layout.tsx) mounts two route groups:

- `app/(auth)/` — unauthenticated zone: `sign-in`, `sign-up`.
- `app/(app)/(tabs)/` — authenticated zone with a bottom tab bar: `my-plans`, `new-plan`, `account`. Plan detail is a separate screen reached from My plans.

**Session-based route guarding is implemented** (RM-8). [lib/auth-context.tsx](lib/auth-context.tsx) exposes a `SessionProvider` + `useSession()` hook wrapping `supabase.auth`; it holds `{ session, isLoading }` and subscribes to `onAuthStateChange`. [app/_layout.tsx](app/_layout.tsx) gates the two groups with `<Stack.Protected guard={...}>` and holds the native splash (`SplashScreen.preventAutoHideAsync`) until `isLoading` clears. [app/index.tsx](app/index.tsx) is the entry redirect (→ `my-plans` if signed in, else `sign-in`). Session persistence rides on the Supabase client's `AsyncStorage` + `AppState` auto-refresh.

**The core domain logic is `generateReversePlan`** (RM-4, implemented in [lib/generate-reverse-plan.ts](lib/generate-reverse-plan.ts)). A thin functional wrapper over the `ReversePlanGenerator` class: given base macros + target calories + duration + protein ratio, it **linearly interpolates** weekly calories from base→target, holds protein at `proteinRatio`% of each week's kcal, and splits the remainder between carbs/fat by **preserving the base carb:fat kcal ratio** (defaults 50/50 when base is zero). Constructor validates inputs (finite, non-negative; ratio 0–100; integer weeks ≥ 1) and throws `RangeError`. It is UI-independent and the single source of truth for plan data. Critically: **the DB stores only the plan *parameters*; the week-by-week table is recomputed client-side every time a plan opens.** Do not persist the expanded table.

**Data layer** is Drizzle ORM. [db/schema.ts](db/schema.ts) defines the `plans` table and its Row-Level-Security policies together, using the `drizzle-orm/supabase` helpers (`authUid`, `authenticatedRole`, `authUsers`). RLS is enabled and every policy scopes rows to `auth.uid() = user_id`, so a user only ever sees their own plans. Generated SQL lives in [drizzle/](drizzle/) — regenerate it with `pnpm db:generate` after editing the schema, never hand-edit migrations.

`plans` columns: `base_calories`, `base_protein`, `base_fat`, `base_carbs`, `target_calories`, `protein_ratio` (percent), `week_duration` (weeks). Note the schema uses English macro names (`fat`/`carbs`) while the French spec says *lipide*/*glucide* — same fields.

Note: app runtime talks to Supabase through `@supabase/supabase-js` (RLS-enforced, anon key). Drizzle/`postgres` are used for schema management only, not for app queries.

## Conventions

- Path alias `@/*` maps to the repo root (e.g. `@/lib/supabase`, `@/hooks/use-color-scheme`).
- File names are **kebab-case**, including components (`themed-text.tsx`, `use-color-scheme.ts`).
- New Architecture, React Compiler, and typed routes are enabled in [app.json](app.json) — keep them working; avoid patterns incompatible with the React Compiler.
- **Styling is NativeWind v4 (Tailwind for RN) — use `className`, not ad-hoc `StyleSheet`.** Wired via `metro.config.js` (`withNativeWind`), `babel.config.js` (`jsxImportSource: 'nativewind'`), and `global.css` (imported once in `app/_layout.tsx`). Merge conditional classes with `cn()` from [lib/utils.ts](lib/utils.ts) (`clsx` + `tailwind-merge`).
- **The design system is react-native-reusables** (shadcn-style, built on `@rn-primitives/*`). Primitives live in `components/ui/` (`button`, `card`, `input`, `label`, `text`, …); `components.json` configures the RNR/shadcn CLI (style `new-york`, aliases `@/components`, `@/lib/utils`). Reuse and extend these rather than restyling per screen. `<PortalHost />` is mounted in the root layout for overlay primitives.
- **Colors are semantic HSL CSS variables**, not hardcoded hex: define/reference tokens like `bg-background`, `text-foreground`, `border-input` (see `tailwind.config.js` + the `:root` / `.dark:root` blocks in `global.css`). Dark mode is `class`-based, driven by the `use-color-scheme` hook and React Navigation's `ThemeProvider`. `constants/theme.ts` still feeds React Navigation's native theme.
- Feature tickets reference **Figma node ids** (e.g. Plan detail `1:304`, New plan `1:78`). On the New plan screen, Figma labels read "Fat" everywhere — that's a placeholder; the real inputs are protein / carbs / fat.
