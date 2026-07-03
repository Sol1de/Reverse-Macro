import { Redirect } from 'expo-router';

import { useSession } from '@/lib/auth-context';

export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  return <Redirect href={session ? '/(app)/(tabs)/my-plans' : '/(auth)/sign-in'} />;
}
