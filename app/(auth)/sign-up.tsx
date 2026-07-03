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

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
  const { colorScheme } = useColorScheme();
  const foreground = colorScheme === 'dark' ? '#fafafa' : '#0a0a0a';
  const muted = colorScheme === 'dark' ? '#a1a1a1' : '#737373';
  const primaryForeground = colorScheme === 'dark' ? '#0a0a0a' : '#fafafa';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
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
                <CardTitle className="text-2xl">Sign up</CardTitle>
              </View>
              <CardDescription>Enter your details to get started</CardDescription>
            </CardHeader>

            {success ? (
              <CardContent className="items-center gap-2">
                <Ionicons name="mail-unread-outline" size={28} color={foreground} />
                <Text className="text-lg font-semibold">Check your email</Text>
                <Text variant="muted" className="text-center">
                  We sent a confirmation link to {email.trim()}. Confirm your address to finish
                  creating your account.
                </Text>
                <Link href="/sign-in" className="pt-2 text-center">
                  <Text variant="muted">
                    Back to <Text variant="muted" className="underline">Sign in</Text>
                  </Text>
                </Link>
              </CardContent>
            ) : (
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
                      autoComplete="password-new"
                    />
                  </View>
                </View>

                <View className="gap-1.5">
                  <Label>Confirm Password</Label>
                  <View className="relative justify-center">
                    <View className="absolute bottom-0 left-3 top-0 z-10 justify-center">
                      <Ionicons name="sync-outline" size={18} color={muted} />
                    </View>
                    <Input
                      className="h-12 pl-10"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="••••••••"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password-new"
                    />
                  </View>
                </View>

                {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

                <View className="gap-3 pt-2">
                  <Button size="lg" onPress={handleRegister} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color={primaryForeground} />
                    ) : (
                      <>
                        <Text>Register</Text>
                        <Ionicons name="arrow-forward" size={16} color={primaryForeground} />
                      </>
                    )}
                  </Button>

                  <Link href="/sign-in" className="text-center">
                    <Text variant="muted">
                      Already have an account?{' '}
                      <Text variant="muted" className="underline">Sign in</Text>
                    </Text>
                  </Link>
                </View>
              </CardContent>
            )}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
