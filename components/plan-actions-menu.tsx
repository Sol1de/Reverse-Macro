import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useDeletePlan, useUpdatePlan } from '@/hooks/use-plans';
import type { Plan } from '@/lib/plans-service';

type PlanActionsMenuProps = {
  plan: Plan;
  onDeleted?: () => void;
};

export function PlanActionsMenu({ plan, onDeleted }: PlanActionsMenuProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const foreground = colorScheme === 'dark' ? '#fafafa' : '#0a0a0a';

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(plan.name);

  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  function openRename() {
    setName(plan.name);
    setMenuOpen(false);
    setRenameOpen(true);
  }

  function openEdit() {
    setMenuOpen(false);
    router.push(`/(app)/(tabs)/new-plan?id=${plan.id}`);
  }

  function confirmDelete() {
    setMenuOpen(false);
    Alert.alert('Delete plan', `Delete “${plan.name}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePlan.mutate(plan.id, {
            onSuccess: () => onDeleted?.(),
            onError: (error) =>
              Alert.alert('Could not delete plan', (error as Error).message),
          });
        },
      },
    ]);
  }

  function submitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === plan.name) {
      setRenameOpen(false);
      return;
    }
    updatePlan.mutate(
      { id: plan.id, patch: { name: trimmed } },
      {
        onSuccess: () => setRenameOpen(false),
        onError: (error) => Alert.alert('Could not rename plan', (error as Error).message),
      }
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Plan actions"
        className="active:opacity-60"
      >
        <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={foreground} />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setMenuOpen(false)}>
          <View className="mt-16 mr-4 items-end">
            <View className="w-56 overflow-hidden rounded-xl border border-border bg-popover">
              <MenuItem icon="create-outline" label="Rename" onPress={openRename} color={foreground} />
              <View className="h-px bg-border" />
              <MenuItem icon="options-outline" label="Edit parameters" onPress={openEdit} color={foreground} />
              <View className="h-px bg-border" />
              <MenuItem icon="trash-outline" label="Delete" onPress={confirmDelete} destructive />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-[420px] gap-4 rounded-xl border border-border bg-card p-5">
            <Text className="text-lg font-semibold">Rename plan</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Plan name"
              autoFocus
              className="h-12"
            />
            <View className="flex-row justify-end gap-2">
              <Button variant="ghost" onPress={() => setRenameOpen(false)} disabled={updatePlan.isPending}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={submitRename} disabled={updatePlan.isPending}>
                {updatePlan.isPending ? (
                  <ActivityIndicator color={colorScheme === 'dark' ? '#0a0a0a' : '#fafafa'} />
                ) : (
                  <Text>Save</Text>
                )}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
};

function MenuItem({ icon, label, onPress, color, destructive }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={18} color={destructive ? '#ef4444' : color} />
      <Text className={destructive ? 'text-destructive' : undefined}>{label}</Text>
    </Pressable>
  );
}
