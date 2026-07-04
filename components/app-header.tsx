import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

function useForeground() {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? '#fafafa' : '#0a0a0a';
}

type BrandHeaderProps = {
  right?: ReactNode;
  className?: string;
};

export function BrandHeader({ right, className }: BrandHeaderProps) {
  const foreground = useForeground();

  return (
    <View
      className={cn(
        'flex-row items-center justify-between border-b border-border px-4 py-3',
        className
      )}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="infinite" size={24} color={foreground} />
        <Text className="text-xl font-bold">ReverseMacro</Text>
      </View>
      {right ? <View>{right}</View> : <View className="w-6" />}
    </View>
  );
}

type DetailHeaderProps = {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  className?: string;
};

export function DetailHeader({ title, onBack, right, className }: DetailHeaderProps) {
  const foreground = useForeground();

  return (
    <View
      className={cn(
        'flex-row items-center justify-between border-b border-border px-4 py-3',
        className
      )}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="w-10 active:opacity-60"
      >
        <Ionicons name="arrow-back" size={24} color={foreground} />
      </Pressable>
      <Text className="flex-1 text-center text-lg font-bold" numberOfLines={1}>
        {title}
      </Text>
      <View className="w-10 items-end">{right}</View>
    </View>
  );
}
