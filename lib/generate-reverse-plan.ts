import env from "@/env";

export type ReversePlanInput = {
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  targetCalories: number;
  proteinRatio: number;
  weekDuration: number;
};

export type WeekQuota = {
  week: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MacroGrams = {
  protein: number;
  carbs: number;
  fat: number;
};

export class ReversePlanGenerator {
  private readonly baseCalories: number;
  private readonly targetCalories: number;
  private readonly proteinRatio: number;
  private readonly weekDuration: number;
  private readonly carbShare: number;

  constructor(input: ReversePlanInput) {
    ReversePlanGenerator.validate(input);

    this.baseCalories = input.baseCalories;
    this.targetCalories = input.targetCalories;
    this.proteinRatio = input.proteinRatio;
    this.weekDuration = input.weekDuration;
    this.carbShare = ReversePlanGenerator.computeCarbShare(input.baseCarbs, input.baseFat);
  }

  public generate(): WeekQuota[] {
    const weeks: WeekQuota[] = [];
    for (let week = 1; week <= this.weekDuration; week++) {
      weeks.push(this.quotaForWeek(week));
    }
    return weeks;
  }

  private caloriesForWeek(week: number): number {
    return this.baseCalories + ((this.targetCalories - this.baseCalories) * week) / this.weekDuration;
  }

  private splitMacros(weekKcal: number): MacroGrams {
    const proteinKcal = (weekKcal * this.proteinRatio) / 100;
    const remainingKcal = weekKcal - proteinKcal;
    const carbsKcal = remainingKcal * this.carbShare;
    const fatKcal = remainingKcal * (1 - this.carbShare);

    return {
      protein: proteinKcal / env.KCAL_PER_GRAM_PROTEIN,
      carbs: carbsKcal / env.KCAL_PER_GRAM_CARBS,
      fat: fatKcal / env.KCAL_PER_GRAM_FAT,
    };
  }

  private quotaForWeek(week: number): WeekQuota {
    const weekKcal = this.caloriesForWeek(week);
    const macros = this.splitMacros(weekKcal);

    return {
      week,
      calories: Math.round(weekKcal),
      protein: Math.round(macros.protein),
      carbs: Math.round(macros.carbs),
      fat: Math.round(macros.fat),
    };
  }

  private static computeCarbShare(baseCarbs: number, baseFat: number): number {
    const baseCarbsKcal = baseCarbs * env.KCAL_PER_GRAM_CARBS;
    const baseFatKcal = baseFat * env.KCAL_PER_GRAM_FAT;
    const baseCarbsFatKcal = baseCarbsKcal + baseFatKcal;

    return baseCarbsFatKcal === 0 ? 0.5 : baseCarbsKcal / baseCarbsFatKcal;
  }

  private static validate(input: ReversePlanInput): void {
    ReversePlanGenerator.assertFiniteNonNegative(input.baseCalories, "baseCalories");
    ReversePlanGenerator.assertFiniteNonNegative(input.baseProtein, "baseProtein");
    ReversePlanGenerator.assertFiniteNonNegative(input.baseCarbs, "baseCarbs");
    ReversePlanGenerator.assertFiniteNonNegative(input.baseFat, "baseFat");
    ReversePlanGenerator.assertFiniteNonNegative(input.targetCalories, "targetCalories");
    ReversePlanGenerator.assertFiniteNonNegative(input.proteinRatio, "proteinRatio");
    if (input.proteinRatio > 100) {
      throw new RangeError(`proteinRatio must be between 0 and 100 (received ${input.proteinRatio})`);
    }
    if (!Number.isInteger(input.weekDuration) || input.weekDuration < 1) {
      throw new RangeError(`weekDuration must be an integer >= 1 (received ${input.weekDuration})`);
    }
  }

  private static assertFiniteNonNegative(value: number, name: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite, non-negative number (received ${value})`);
    }
  }
}

export function generateReversePlan(input: ReversePlanInput): WeekQuota[] {
  return new ReversePlanGenerator(input).generate();
}
