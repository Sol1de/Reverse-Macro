class Env {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    KCAL_PER_GRAM_PROTEIN: number;
    KCAL_PER_GRAM_CARBS: number;
    KCAL_PER_GRAM_FAT: number;

    constructor() {
        this.EXPO_PUBLIC_SUPABASE_URL = Env.requiredString(
            process.env.EXPO_PUBLIC_SUPABASE_URL,
            "EXPO_PUBLIC_SUPABASE_URL"
        );
        this.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Env.requiredString(
            process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        );
        this.KCAL_PER_GRAM_PROTEIN = Env.requiredNumber(
            process.env.EXPO_PUBLIC_KCAL_PER_GRAM_PROTEIN,
            "EXPO_PUBLIC_KCAL_PER_GRAM_PROTEIN"
        );
        this.KCAL_PER_GRAM_CARBS = Env.requiredNumber(
            process.env.EXPO_PUBLIC_KCAL_PER_GRAM_CARBS,
            "EXPO_PUBLIC_KCAL_PER_GRAM_CARBS"
        );
        this.KCAL_PER_GRAM_FAT = Env.requiredNumber(
            process.env.EXPO_PUBLIC_KCAL_PER_GRAM_FAT,
            "EXPO_PUBLIC_KCAL_PER_GRAM_FAT"
        );
    }

    private static requiredString(value: string | undefined, name: string): string {
        if (!value) {
            throw new Error(`${name} is not defined`);
        }

        return value;
    }

    private static requiredNumber(value: string | undefined, name: string): number {
        return parseFloat(Env.requiredString(value, name));
    }
}

const env = new Env();
export default env;
