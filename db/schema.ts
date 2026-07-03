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
