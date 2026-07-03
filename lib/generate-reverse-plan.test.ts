// Mock `@/env` with a factory so the module's load-time env validation never
// runs in the test environment (course pattern: `jest.mock(path, factory)`).
// Uses the real kcal-per-gram constants (4 / 4 / 9) so assertions are meaningful.
jest.mock("@/env", () => ({
  __esModule: true,
  default: {
    KCAL_PER_GRAM_PROTEIN: 4,
    KCAL_PER_GRAM_CARBS: 4,
    KCAL_PER_GRAM_FAT: 9,
  },
}));

import {
  generateReversePlan,
  type ReversePlanInput,
} from "@/lib/generate-reverse-plan";

const baseInput: ReversePlanInput = {
  baseCalories: 2000,
  baseProtein: 150,
  baseCarbs: 200,
  baseFat: 50,
  targetCalories: 2400,
  proteinRatio: 30,
  weekDuration: 4,
};

describe("generateReversePlan", () => {
  describe("cas nominal, montée régulière départ → cible", () => {
    it("produit une entrée par semaine, numérotées 1..N", () => {
      const plan = generateReversePlan({ ...baseInput, weekDuration: 4 });
      expect(plan).toHaveLength(4);
      expect(plan.map((w) => w.week)).toEqual([1, 2, 3, 4]);
    });

    it("interpole linéairement les calories de départ vers la cible", () => {
      const plan = generateReversePlan({
        ...baseInput,
        baseCalories: 2000,
        targetCalories: 2400,
        weekDuration: 4,
      });
      expect(plan.map((w) => w.calories)).toEqual([2100, 2200, 2300, 2400]);
    });

    it("fait strictement croître les calories chaque semaine", () => {
      const plan = generateReversePlan(baseInput);
      for (let i = 1; i < plan.length; i++) {
        expect(plan[i].calories).toBeGreaterThan(plan[i - 1].calories);
      }
    });

    it("atteint exactement la cible la dernière semaine", () => {
      const plan = generateReversePlan(baseInput);
      expect(plan[plan.length - 1].calories).toBe(baseInput.targetCalories);
    });
  });

  describe("bornes", () => {
    it("durée = 1 semaine : une seule ligne, calées sur la cible", () => {
      const plan = generateReversePlan({ ...baseInput, weekDuration: 1 });
      expect(plan).toHaveLength(1);
      expect(plan[0].week).toBe(1);
      expect(plan[0].calories).toBe(baseInput.targetCalories);
    });

    it("cible = départ : plan plat (calories et macros constantes)", () => {
      const plan = generateReversePlan({
        ...baseInput,
        baseCalories: 2200,
        targetCalories: 2200,
        weekDuration: 3,
      });
      expect(plan).toHaveLength(3);
      for (const week of plan) {
        expect(week.calories).toBe(2200);
        expect(week).toMatchObject({
          calories: plan[0].calories,
          protein: plan[0].protein,
          carbs: plan[0].carbs,
          fat: plan[0].fat,
        });
      }
    });
  });

  describe("répartition P/C/L selon le ratio protéine", () => {
    it("dérive protéine du ratio et scinde glucides/lipides selon la base", () => {
      const plan = generateReversePlan({
        baseCalories: 2000,
        baseProtein: 150,
        baseCarbs: 200,
        baseFat: 50,
        targetCalories: 2000,
        proteinRatio: 30,
        weekDuration: 1,
      });

      expect(plan[0]).toEqual({
        week: 1,
        calories: 2000,
        protein: 150,
        carbs: 224,
        fat: 56,
      });
    });

    it("reconstitue les calories à partir des grammes de macros (4/4/9)", () => {
      const week = generateReversePlan({
        baseCalories: 2000,
        baseProtein: 150,
        baseCarbs: 200,
        baseFat: 50,
        targetCalories: 2000,
        proteinRatio: 30,
        weekDuration: 1,
      })[0];

      const reconstructed = week.protein * 4 + week.carbs * 4 + week.fat * 9;
      expect(reconstructed).toBeCloseTo(week.calories, -1);
    });

    it("répartit glucides/lipides 50/50 quand la base n'a ni glucides ni lipides", () => {
      const week = generateReversePlan({
        baseCalories: 1000,
        baseProtein: 100,
        baseCarbs: 0,
        baseFat: 0,
        targetCalories: 1000,
        proteinRatio: 40,
        weekDuration: 1,
      })[0];
      expect(week.protein).toBe(100);
      expect(week.carbs).toBe(75);
      expect(week.fat).toBe(33);
    });

    it("un ratio protéine plus élevé augmente les grammes de protéine", () => {
      const common = {
        baseCalories: 2000,
        baseProtein: 150,
        baseCarbs: 200,
        baseFat: 50,
        targetCalories: 2000,
        weekDuration: 1,
      };
      const low = generateReversePlan({ ...common, proteinRatio: 20 })[0];
      const high = generateReversePlan({ ...common, proteinRatio: 40 })[0];
      expect(high.protein).toBeGreaterThan(low.protein);
    });
  });

  describe("validation des entrées", () => {
    it("rejette un ratio protéine > 100", () => {
      expect(() =>
        generateReversePlan({ ...baseInput, proteinRatio: 120 }),
      ).toThrow(RangeError);
    });

    it("rejette une durée < 1", () => {
      expect(() =>
        generateReversePlan({ ...baseInput, weekDuration: 0 }),
      ).toThrow(RangeError);
    });

    it("rejette une durée non entière", () => {
      expect(() =>
        generateReversePlan({ ...baseInput, weekDuration: 2.5 }),
      ).toThrow(RangeError);
    });

    it("rejette une valeur négative", () => {
      expect(() =>
        generateReversePlan({ ...baseInput, baseCalories: -100 }),
      ).toThrow(RangeError);
    });

    it("rejette une valeur non finie", () => {
      expect(() =>
        generateReversePlan({ ...baseInput, targetCalories: Number.NaN }),
      ).toThrow(RangeError);
    });
  });
});
