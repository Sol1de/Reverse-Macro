import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const { colorScheme } = useColorScheme();
  const foreground = colorScheme === 'dark' ? '#fafafa' : '#0a0a0a';
  const muted = colorScheme === 'dark' ? '#a1a1a1' : '#737373';
  const primaryForeground = colorScheme === 'dark' ? '#0a0a0a' : '#fafafa';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full max-w-[480px]">
            <CardHeader className="items-center gap-1.5 border-b border-border pb-6">
              <View className="flex-row items-center gap-2">
                <Ionicons name="link" size={22} color={foreground} />
                <CardTitle className="text-2xl">Sign in</CardTitle>
              </View>
              <CardDescription>Enter your details to get started</CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              <View className="gap-1.5">
                <Label>Email</Label>
                <View className="relative justify-center">
                  <View className="absolute bottom-0 left-3 top-0 z-10 justify-center">
                    <Ionicons name="mail-outline" size={18} color={muted} />
                  </View>
                  <Input
                    className="h-12 pl-10"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View className="gap-1.5">
                <Label>Password</Label>
                <View className="relative justify-center">
                  <View className="absolute bottom-0 left-3 top-0 z-10 justify-center">
                    <Ionicons name="lock-closed-outline" size={18} color={muted} />
                  </View>
                  <Input
                    className="h-12 pl-10"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                </View>
              </View>

              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

              <View className="gap-3 pt-2">
                <Button size="lg" onPress={handleLogin} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={primaryForeground} />
                  ) : (
                    <>
                      <Text>Login</Text>
                      <Ionicons name="arrow-forward" size={16} color={primaryForeground} />
                    </>
                  )}
                </Button>

                <Link href="/sign-up" className="text-center">
                  <Text variant="muted">
                    No account yet? <Text variant="muted" className="underline">Sign up</Text>
                  </Text>
                </Link>
              </View>
            </CardContent>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
