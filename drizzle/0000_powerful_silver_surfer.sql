CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_calories" integer NOT NULL,
	"base_protein" integer NOT NULL,
	"base_fat" integer NOT NULL,
	"base_carbs" integer NOT NULL,
	"target_calories" integer NOT NULL,
	"protein_ratio" integer NOT NULL,
	"week_duration" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "plans_select_own" ON "plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "plans"."user_id");--> statement-breakpoint
CREATE POLICY "plans_insert_own" ON "plans" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "plans"."user_id");--> statement-breakpoint
CREATE POLICY "plans_update_own" ON "plans" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "plans"."user_id") WITH CHECK ((select auth.uid()) = "plans"."user_id");--> statement-breakpoint
CREATE POLICY "plans_delete_own" ON "plans" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "plans"."user_id");