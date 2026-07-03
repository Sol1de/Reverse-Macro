# Plans Table + RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `plans` Postgres table on Supabase with row-level security, defined as Drizzle ORM schema-as-code and applied via `drizzle-kit`.

**Architecture:** `db/schema.ts` is the single source of truth for the `plans` table (columns + RLS policies). `drizzle-kit` (config in `drizzle.config.ts`, driven by `DATABASE_URL`) generates a SQL migration into `drizzle/` and pushes it directly to the Supabase Postgres instance. The app's runtime code (`lib/supabase.ts`, `supabase-js`) is untouched — it keeps querying through the anon key and is protected by the RLS policies created here.

**Tech Stack:** Drizzle ORM 0.45.x, drizzle-kit 0.31.x, Postgres (Supabase), TypeScript.

## Global Constraints

- Column names in English (`docs/superpowers/specs/2026-07-03-plans-table-rls-design.md`): `name`, `base_calories`, `base_protein`, `base_fat`, `base_carbs`, `target_calories`, `protein_ratio`, `week_duration`.
- `DATABASE_URL` must NOT carry the `EXPO_PUBLIC_` prefix — that prefix makes Expo inline the value into the client bundle, leaking direct Postgres credentials.
- `drizzle-orm` / `drizzle-kit` are devDependencies only — never imported from `app/`.
- RLS via `.enableRLS()` (stable API on drizzle-orm 0.45.x) — not `.withRLS()` (v1 beta only, not installed).
- No project-wide automated test framework exists yet; verification for this ticket is manual (documented per task).

---

### Task 1: Install Drizzle deps and add config + npm scripts

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `drizzle.config.ts`
- Modify: `.env.example` (add empty `DATABASE_URL` key)

**Interfaces:**
- Produces: `drizzle.config.ts` default export consumed by the `drizzle-kit` CLI; npm scripts `db:generate` and `db:push` used by later tasks.

- [ ] **Step 1: Install dependencies**

Run: `npm install -D drizzle-orm@^0.45.2 drizzle-kit@^0.31.10`

Expected: both packages added to `devDependencies` in `package.json`, lockfile updated.

- [ ] **Step 2: Add npm scripts**

Edit `package.json`, inside `"scripts"`, add:

```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push"
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL env var");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

- [ ] **Step 4: Install `dotenv`**

Run: `npm install -D dotenv`

Expected: `dotenv` added to `devDependencies` (needed so `drizzle.config.ts` can read `.env` when the CLI runs outside Expo's own env loading).

- [ ] **Step 5: Add `DATABASE_URL` to `.env.example`**

Edit `.env.example`, append:

```
DATABASE_URL=
```

- [ ] **Step 6: Verify `.env` already has the correctly named var**

Run: `grep '^DATABASE_URL=' .env`
Expected: one match, value is the Supabase direct Postgres connection string (already renamed from `EXPO_PUBLIC_DATABASE_URL` earlier in this session).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts .env.example
git commit -m "chore: add drizzle-kit config and db migration scripts"
```

---

### Task 2: Write the `plans` schema with RLS policies

**Files:**
- Create: `db/schema.ts`

**Interfaces:**
- Consumes: `drizzle.config.ts` (Task 1) points `schema` at this file.
- Produces: `plans` table export consumed by `drizzle-kit generate` in Task 3. No app code imports this file (schema-as-code only).

- [ ] **Step 1: Write `db/schema.ts`**

```ts
import { sql } from "drizzle-orm";
import { integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

export const plans = pgTable(
  "plans",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text().notNull(),
    baseCalories: integer("base_calories").notNull(),
    baseProtein: integer("base_protein").notNull(),
    baseFat: integer("base_fat").notNull(),
    baseCarbs: integer("base_carbs").notNull(),
    targetCalories: integer("target_calories").notNull(),
    proteinRatio: integer("protein_ratio").notNull(),
    weekDuration: integer("week_duration").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy("plans_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("plans_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("plans_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("plans_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `db/schema.ts`.

- [ ] **Step 3: Commit**

```bash
git add db/schema.ts
git commit -m "feat: define plans table schema with owner-only RLS policies"
```

---

### Task 3: Generate and push the migration

**Files:**
- Create: `drizzle/0000_*.sql` (generated, exact name chosen by drizzle-kit)
- Create: `drizzle/meta/` (generated metadata, committed alongside)

**Interfaces:**
- Consumes: `db/schema.ts` (Task 2), `drizzle.config.ts` (Task 1), `DATABASE_URL` from `.env`.
- Produces: live `plans` table + RLS policies on the Supabase Postgres instance.

- [ ] **Step 1: Generate the migration**

Run: `npm run db:generate`
Expected: a new file under `drizzle/`, e.g. `drizzle/0000_<name>.sql`, containing `CREATE TABLE "plans"`, `ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY`, and 4 `CREATE POLICY` statements referencing `auth.uid()`.

- [ ] **Step 2: Review the generated SQL**

Read the generated file and confirm:
- All 8 business columns present with the English names from Task 2.
- `user_id` has `REFERENCES "auth"."users"("id") ON DELETE CASCADE`.
- RLS enabled and exactly 4 policies (select/insert/update/delete), each scoped to `auth.uid() = user_id` (or matching `withCheck`).

- [ ] **Step 3: Push the migration to Supabase**

Run: `npm run db:push`
Expected: command reports the table and policies were created successfully against the Supabase Postgres instance (interactive prompt may ask to confirm creating the table — accept).

- [ ] **Step 4: Verify in Supabase dashboard**

- Table Editor: `plans` table exists with all columns/types matching Task 2.
- Database > Policies: `plans` shows RLS enabled and 4 policies (`plans_select_own`, `plans_insert_own`, `plans_update_own`, `plans_delete_own`).

- [ ] **Step 5: Manual RLS check**

- In the SQL Editor, insert two rows into `plans` with two different `user_id` values (using two existing `auth.users` ids, or temporarily disabling RLS as `postgres` role for the insert only).
- Using the app (or Supabase JS client with a real user session), call `supabase.from("plans").select()` while authenticated as one of those users.
- Expected: only the row matching that user's `id` is returned.

- [ ] **Step 6: Commit**

```bash
git add drizzle/
git commit -m "feat: apply plans table migration to Supabase"
```
