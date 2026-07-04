import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import env from '@/env';
import { useCreatePlan, usePlan, useUpdatePlan } from '@/hooks/use-plans';
import type { CreatePlanInput } from '@/lib/plans-service';

const DEFAULT_PROTEIN_RATIO = 35;

export default function NewPlanScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primaryForeground = isDark ? '#0a0a0a' : '#fafafa';
  const trackFilled = isDark ? '#fafafa' : '#0a0a0a';
  const trackEmpty = isDark ? '#404040' : '#d4d4d4';

  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { data: editingPlan } = usePlan(id);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const [name, setName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [weeks, setWeeks] = useState('');
  const [proteinRatio, setProteinRatio] = useState(DEFAULT_PROTEIN_RATIO);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingPlan) return;
    setName(editingPlan.name);
    setProtein(String(editingPlan.baseProtein));
    setCarbs(String(editingPlan.baseCarbs));
    setFat(String(editingPlan.baseFat));
    setTargetCalories(String(editingPlan.targetCalories));
    setWeeks(String(editingPlan.weekDuration));
    setProteinRatio(editingPlan.proteinRatio);
  }, [editingPlan]);

  const currentCalories = useMemo(() => {
    const p = toNumber(protein);
    const c = toNumber(carbs);
    const f = toNumber(fat);
    if (p === null || c === null || f === null) return null;
    return Math.round(
      p * env.KCAL_PER_GRAM_PROTEIN + c * env.KCAL_PER_GRAM_CARBS + f * env.KCAL_PER_GRAM_FAT
    );
  }, [protein, carbs, fat]);

  const isPending = createPlan.isPending || updatePlan.isPending;

  function handleSubmit() {
    setError(null);

    const p = toNumber(protein);
    const c = toNumber(carbs);
    const f = toNumber(fat);
    const target = toNumber(targetCalories);
    const duration = toNumber(weeks);

    if (!name.trim()) return setError('Please give your plan a name.');
    if (p === null || c === null || f === null)
      return setError('Current macros must be valid numbers.');
    if (target === null || target <= 0) return setError('Target calories must be greater than 0.');
    if (duration === null || !Number.isInteger(duration) || duration < 1)
      return setError('Duration must be a whole number of weeks (at least 1).');

    const base = Math.round(
      p * env.KCAL_PER_GRAM_PROTEIN + c * env.KCAL_PER_GRAM_CARBS + f * env.KCAL_PER_GRAM_FAT
    );

    const input: CreatePlanInput = {
      name: name.trim(),
      baseCalories: base,
      baseProtein: p,
      baseCarbs: c,
      baseFat: f,
      targetCalories: target,
      proteinRatio,
      weekDuration: duration,
    };

    if (isEditing && id) {
      updatePlan.mutate(
        { id, patch: input },
        {
          onSuccess: () => router.replace(`/(app)/(tabs)/plan-detail?id=${id}`),
          onError: (err) => setError((err as Error).message),
        }
      );
    } else {
      createPlan.mutate(input, {
        onSuccess: (plan) => {
          resetForm();
          router.replace(`/(app)/(tabs)/plan-detail?id=${plan.id}`);
        },
        onError: (err) => setError((err as Error).message),
      });
    }
  }

  function resetForm() {
    setName('');
    setProtein('');
    setCarbs('');
    setFat('');
    setTargetCalories('');
    setWeeks('');
    setProteinRatio(DEFAULT_PROTEIN_RATIO);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <BrandHeader />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-6 px-4 pb-10 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h2" className="border-b-0 pb-0">
            {isEditing ? 'Edit plan' : 'New plan'}
          </Text>

          <View className="gap-1.5">
            <Label>Plan name</Label>
            <Input
              className="h-12 bg-secondary"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Bulking Season"
              autoCapitalize="words"
            />
          </View>

          <View className="gap-3">
            <Text variant="small" className="uppercase tracking-wide text-muted-foreground">
              Current macros
            </Text>
            <View className="flex-row gap-3">
              <MacroField label="Protein" value={protein} onChangeText={setProtein} />
              <MacroField label="Carbs" value={carbs} onChangeText={setCarbs} />
              <MacroField label="Fat" value={fat} onChangeText={setFat} />
            </View>
            {currentCalories !== null ? (
              <Text variant="muted" className="text-xs">
                ≈ {currentCalories.toLocaleString('en-US')} kcal / day at current macros
              </Text>
            ) : null}
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-3">
              <Text variant="small" className="uppercase tracking-wide text-muted-foreground">
                Target
              </Text>
              <View className="gap-1.5">
                <Label>Calories</Label>
                <Input
                  className="h-12 bg-secondary"
                  value={targetCalories}
                  onChangeText={setTargetCalories}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View className="flex-1 gap-3">
              <Text variant="small" className="uppercase tracking-wide text-muted-foreground">
                Duration
              </Text>
              <View className="gap-1.5">
                <Label>Weeks</Label>
                <Input
                  className="h-12 bg-secondary"
                  value={weeks}
                  onChangeText={setWeeks}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text variant="small" className="uppercase tracking-wide text-muted-foreground">
              Percentage ratio
            </Text>
            <Card className="gap-2 border-0 bg-secondary py-4">
              <View className="flex-row items-center justify-between px-4">
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-foreground" />
                  <Text>Protein</Text>
                </View>
                <Text className="font-semibold">{proteinRatio}%</Text>
              </View>
              <View className="px-2">
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={proteinRatio}
                  onValueChange={setProteinRatio}
                  minimumTrackTintColor={trackFilled}
                  maximumTrackTintColor={trackEmpty}
                  thumbTintColor={trackFilled}
                />
              </View>
            </Card>
          </View>

          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <Button size="lg" onPress={handleSubmit} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator color={primaryForeground} />
            ) : (
              <Text>{isEditing ? 'Save changes' : 'Generate plan'}</Text>
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View className="flex-1 gap-1.5">
      <Label>{label}</Label>
      <Input
        className="h-12 bg-secondary text-center"
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        keyboardType="number-pad"
      />
    </View>
  );
}

function toNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const normalized = trimmed.replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
