import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/app-header';
import { PlanActionsMenu } from '@/components/plan-actions-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { usePlan } from '@/hooks/use-plans';
import { generateReversePlan, type WeekQuota } from '@/lib/generate-reverse-plan';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: plan, isLoading, isError, error } = usePlan(id);

  const weeks = useMemo<WeekQuota[]>(() => {
    if (!plan) return [];
    return generateReversePlan({
      baseCalories: plan.baseCalories,
      baseProtein: plan.baseProtein,
      baseCarbs: plan.baseCarbs,
      baseFat: plan.baseFat,
      targetCalories: plan.targetCalories,
      proteinRatio: plan.proteinRatio,
      weekDuration: plan.weekDuration,
    });
  }, [plan]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/my-plans'));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <DetailHeader
        title={plan?.name ?? 'Plan'}
        onBack={goBack}
        right={plan ? <PlanActionsMenu plan={plan} onDeleted={goBack} /> : undefined}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError || !plan ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text variant="muted" className="text-center">
            {(error as Error)?.message ?? 'This plan could not be found.'}
          </Text>
          <Button variant="outline" size="sm" onPress={goBack}>
            <Text>Back to My plans</Text>
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-4 pb-8 pt-5" showsVerticalScrollIndicator={false}>
          <Text variant="large" className="mb-1">
            Weekly Progression
          </Text>
          {weeks.map((week) => (
            <WeekCard key={week.week} week={week} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function WeekCard({ week }: { week: WeekQuota }) {
  return (
    <Card className="gap-3 border-0 bg-secondary py-4">
      <View className="flex-row items-baseline justify-between px-4">
        <Text className="text-lg font-semibold">Week {week.week}</Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="font-semibold">{week.calories.toLocaleString('en-US')}</Text>
          <Text variant="muted" className="text-xs">
            kcal
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2 px-4">
        <Badge variant="outline">
          <Text>P: {week.protein}g</Text>
        </Badge>
        <Badge variant="outline">
          <Text>C: {week.carbs}g</Text>
        </Badge>
        <Badge variant="outline">
          <Text>F: {week.fat}g</Text>
        </Badge>
      </View>
    </Card>
  );
}
