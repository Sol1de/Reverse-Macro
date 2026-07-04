import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useSession } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { session } = useSession();
  const { colorScheme } = useColorScheme();
  const primaryForeground = colorScheme === 'dark' ? '#0a0a0a' : '#fafafa';

  const [loading, setLoading] = useState(false);
  const email = session?.user?.email ?? '—';

  async function handleLogout() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      Alert.alert('Could not sign out', error.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <BrandHeader />

      <View className="flex-1 px-4 pt-5">
        <Text variant="h2" className="mb-6 border-b-0 pb-0">
          Account
        </Text>

        <Card className="gap-1 border-0 bg-secondary py-4">
          <View className="px-4">
            <Text variant="muted" className="text-xs">
              Email
            </Text>
            <Text className="text-base">{email}</Text>
          </View>
        </Card>
      </View>

      <View className="px-4 pb-6">
        <Button size="lg" onPress={handleLogout} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={primaryForeground} />
          ) : (
            <>
              <Text>Logout</Text>
              <Ionicons name="log-out-outline" size={18} color={primaryForeground} />
            </>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
