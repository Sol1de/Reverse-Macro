class Env {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    DATABASE_URL: string;
    KCAL_PER_GRAM_PROTEIN: number;
    KCAL_PER_GRAM_CARBS: number;
    KCAL_PER_GRAM_FAT: number;

    constructor() {
        this.EXPO_PUBLIC_SUPABASE_URL = Env.requiredString("EXPO_PUBLIC_SUPABASE_URL");
        this.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Env.requiredString("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
        this.DATABASE_URL = Env.requiredString("DATABASE_URL");
        this.KCAL_PER_GRAM_PROTEIN = Env.requiredNumber("KCAL_PER_GRAM_PROTEIN");
        this.KCAL_PER_GRAM_CARBS = Env.requiredNumber("KCAL_PER_GRAM_CARBS");
        this.KCAL_PER_GRAM_FAT = Env.requiredNumber("KCAL_PER_GRAM_FAT");
    }

    private static requiredString(name: string): string {
        const value = process.env[name];

        if (!value) {
            throw new Error(`${name} is not defined`);
        }

        return value;
    }

    private static requiredNumber(name: string): number {
        return parseFloat(Env.requiredString(name));
    }
}

const env = new Env();
export default env;
