jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import type { SupabaseClient } from "@supabase/supabase-js";
import { PlansService } from "@/lib/plans-service";

type BuilderResult = { data: unknown; error: unknown };

function makeBuilder(result: BuilderResult) {
  const builder: Record<string, unknown> = {};
  const methods = ["select", "order", "eq", "insert", "update", "delete", "maybeSingle", "single"];
  for (const m of methods) {
    builder[m] = jest.fn(() => builder);
  }
  builder.then = (resolve: (r: BuilderResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder as Record<string, jest.Mock> & { then: unknown };
}

function makeService(result: BuilderResult, user: { id: string } | null = { id: "u1" }) {
  const builder = makeBuilder(result);
  const from = jest.fn(() => builder);
  const getUser = jest.fn().mockResolvedValue({ data: { user }, error: null });
  const client = { from, auth: { getUser } } as unknown as SupabaseClient;
  const service = new PlansService(client);
  return { service, builder, from, getUser };
}

const ROW = {
  id: "p1",
  user_id: "u1",
  name: "Bulk",
  base_calories: 2000,
  base_protein: 150,
  base_fat: 50,
  base_carbs: 200,
  target_calories: 2400,
  protein_ratio: 30,
  week_duration: 8,
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("PlansService.rowToPlan", () => {
  it("maps snake_case DB columns to the camelCase Plan type", () => {
    expect(PlansService.rowToPlan(ROW)).toEqual({
      id: "p1",
      userId: "u1",
      name: "Bulk",
      baseCalories: 2000,
      baseProtein: 150,
      baseFat: 50,
      baseCarbs: 200,
      targetCalories: 2400,
      proteinRatio: 30,
      weekDuration: 8,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });
  });

  it("parses created_at into a Date", () => {
    expect(PlansService.rowToPlan(ROW).createdAt).toBeInstanceOf(Date);
  });
});

describe("PlansService#list", () => {
  it("queries the plans table newest-first and maps every row", async () => {
    const { service, builder, from } = makeService({ data: [ROW], error: null });
    const plans = await service.list();
    expect(from).toHaveBeenCalledWith("plans");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(plans).toHaveLength(1);
    expect(plans[0].baseCalories).toBe(2000);
  });

  it("throws when supabase returns an error", async () => {
    const { service } = makeService({ data: null, error: new Error("rls denied") });
    await expect(service.list()).rejects.toThrow("rls denied");
  });
});

describe("PlansService#get", () => {
  it("returns the mapped plan when found", async () => {
    const { service, builder } = makeService({ data: ROW, error: null });
    const plan = await service.get("p1");
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(plan?.id).toBe("p1");
  });

  it("returns null when the plan does not exist", async () => {
    const { service } = makeService({ data: null, error: null });
    expect(await service.get("missing")).toBeNull();
  });
});

describe("PlansService#create", () => {
  const input = {
    name: "Bulk",
    baseCalories: 2000,
    baseProtein: 150,
    baseFat: 50,
    baseCarbs: 200,
    targetCalories: 2400,
    proteinRatio: 30,
    weekDuration: 8,
  };

  it("inserts snake_case params plus the authenticated user_id", async () => {
    const { service, builder } = makeService({ data: ROW, error: null }, { id: "u1" });
    const plan = await service.create(input);
    expect(builder.insert).toHaveBeenCalledWith({
      name: "Bulk",
      base_calories: 2000,
      base_protein: 150,
      base_fat: 50,
      base_carbs: 200,
      target_calories: 2400,
      protein_ratio: 30,
      week_duration: 8,
      user_id: "u1",
    });
    expect(plan.id).toBe("p1");
  });

  it("throws when there is no authenticated user", async () => {
    const { service } = makeService({ data: ROW, error: null }, null);
    await expect(service.create(input)).rejects.toThrow("authenticated user");
  });
});

describe("PlansService#update", () => {
  it("sends only the provided fields, mapped to snake_case", async () => {
    const { service, builder } = makeService({ data: { ...ROW, name: "Cut" }, error: null });
    const plan = await service.update("p1", { name: "Cut", targetCalories: 1800 });
    expect(builder.update).toHaveBeenCalledWith({ name: "Cut", target_calories: 1800 });
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
    expect(plan.name).toBe("Cut");
  });
});

describe("PlansService#remove", () => {
  it("deletes by id", async () => {
    const { service, builder } = makeService({ data: null, error: null });
    await service.remove("p1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("throws when supabase returns an error", async () => {
    const { service } = makeService({ data: null, error: new Error("nope") });
    await expect(service.remove("p1")).rejects.toThrow("nope");
  });
});
