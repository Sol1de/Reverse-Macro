import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/lib/plans-service';

export default function MyPlansScreen() {
  const router = useRouter();
  const { data: plans, isLoading, isError, error, refetch } = usePlans();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <BrandHeader />

      <View className="flex-1">
        <ScrollView
          contentContainerClassName="gap-3 px-4 pb-28 pt-5"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h2" className="border-b-0 pb-0">
            My plans
          </Text>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator />
            </View>
          ) : isError ? (
            <View className="items-center gap-3 py-16">
              <Text variant="muted" className="text-center">
                {(error as Error)?.message ?? 'Could not load your plans.'}
              </Text>
              <Button variant="outline" size="sm" onPress={() => refetch()}>
                <Text>Retry</Text>
              </Button>
            </View>
          ) : !plans || plans.length === 0 ? (
            <EmptyState onCreate={() => router.push('/(app)/(tabs)/new-plan')} />
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPress={() => router.push(`/(app)/(tabs)/plan-detail?id=${plan.id}`)}
              />
            ))
          )}
        </ScrollView>

        <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background px-4 pb-6 pt-3">
          <Button size="lg" onPress={() => router.push('/(app)/(tabs)/new-plan')}>
            <Text>New plan</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PlanCard({ plan, onPress }: { plan: Plan; onPress: () => void }) {
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1a1' : '#737373';
  const isSurplus = plan.targetCalories >= plan.baseCalories;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-80">
      <Card className="gap-4 border-0 bg-secondary py-5">
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-lg font-semibold">{plan.name}</Text>
          <Ionicons name="chevron-forward" size={20} color={muted} />
        </View>

        <View className="gap-2 px-5">
          <View className="flex-row justify-between">
            <Text variant="muted">Target Calories</Text>
            <Text variant="muted">Duration</Text>
          </View>
          <View className="flex-row justify-between">
            <View className="flex-row items-baseline gap-1.5">
              <Text className="font-medium">{formatKcal(plan.baseCalories)}</Text>
              <Ionicons name="arrow-forward" size={13} color={muted} />
              <Text className={isSurplus ? 'font-semibold text-green-500' : 'font-semibold text-red-500'}>
                {formatKcal(plan.targetCalories)}
              </Text>
              <Text variant="muted" className="text-xs">
                kcal
              </Text>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-semibold">{plan.weekDuration}</Text>
              <Text variant="muted" className="text-xs">
                wks
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="items-center gap-3 py-24">
      <Ionicons name="clipboard-outline" size={40} color="#737373" />
      <Text variant="large" className="text-center">
        No plans yet
      </Text>
      <Text variant="muted" className="max-w-[280px] text-center">
        Create your first reverse-diet plan to see a week-by-week macro progression.
      </Text>
      <Button variant="outline" size="sm" className="mt-1" onPress={onCreate}>
        <Text>Create a plan</Text>
      </Button>
    </View>
  );
}

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}
