import type { SupabaseClient } from "@supabase/supabase-js";

import type { plans } from "@/db/schema";
import { supabase } from "@/lib/supabase";

export type Plan = typeof plans.$inferSelect;
export type CreatePlanInput = Omit<Plan, "id" | "userId" | "createdAt">;
export type UpdatePlanInput = Partial<CreatePlanInput>;

type PlanRow = {
  id: string;
  user_id: string;
  name: string;
  base_calories: number;
  base_protein: number;
  base_fat: number;
  base_carbs: number;
  target_calories: number;
  protein_ratio: number;
  week_duration: number;
  created_at: string;
};

type PlanRowPatch = Partial<Omit<PlanRow, "id" | "user_id" | "created_at">>;

export class PlansService {
  private static readonly TABLE = "plans";
  private static readonly COLUMNS =
    "id, user_id, name, base_calories, base_protein, base_fat, base_carbs, target_calories, protein_ratio, week_duration, created_at";

  constructor(private readonly client: SupabaseClient = supabase) {}

  public async list(): Promise<Plan[]> {
    const { data, error } = await this.table()
      .select(PlansService.COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as PlanRow[]).map(PlansService.rowToPlan);
  }

  public async get(id: string): Promise<Plan | null> {
    const { data, error } = await this.table()
      .select(PlansService.COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? PlansService.rowToPlan(data as PlanRow) : null;
  }

  public async create(input: CreatePlanInput): Promise<Plan> {
    const {
      data: { user },
      error: userError,
    } = await this.client.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Cannot create a plan without an authenticated user");

    const { data, error } = await this.table()
      .insert({ ...PlansService.inputToRow(input), user_id: user.id })
      .select(PlansService.COLUMNS)
      .single();

    if (error) throw error;
    return PlansService.rowToPlan(data as PlanRow);
  }

  public async update(id: string, patch: UpdatePlanInput): Promise<Plan> {
    const { data, error } = await this.table()
      .update(PlansService.inputToRow(patch))
      .eq("id", id)
      .select(PlansService.COLUMNS)
      .single();

    if (error) throw error;
    return PlansService.rowToPlan(data as PlanRow);
  }

  public async remove(id: string): Promise<void> {
    const { error } = await this.table().delete().eq("id", id);
    if (error) throw error;
  }

  private table() {
    return this.client.from(PlansService.TABLE);
  }

  public static rowToPlan(row: PlanRow): Plan {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      baseCalories: row.base_calories,
      baseProtein: row.base_protein,
      baseFat: row.base_fat,
      baseCarbs: row.base_carbs,
      targetCalories: row.target_calories,
      proteinRatio: row.protein_ratio,
      weekDuration: row.week_duration,
      createdAt: new Date(row.created_at),
    };
  }

  private static inputToRow(input: UpdatePlanInput): PlanRowPatch {
    const row: PlanRowPatch = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.baseCalories !== undefined) row.base_calories = input.baseCalories;
    if (input.baseProtein !== undefined) row.base_protein = input.baseProtein;
    if (input.baseFat !== undefined) row.base_fat = input.baseFat;
    if (input.baseCarbs !== undefined) row.base_carbs = input.baseCarbs;
    if (input.targetCalories !== undefined) row.target_calories = input.targetCalories;
    if (input.proteinRatio !== undefined) row.protein_ratio = input.proteinRatio;
    if (input.weekDuration !== undefined) row.week_duration = input.weekDuration;
    return row;
  }
}

export const plansService = new PlansService();
