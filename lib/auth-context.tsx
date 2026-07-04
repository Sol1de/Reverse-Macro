import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      currentUserId.current = data.session?.user?.id ?? null;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id ?? null;

      if (currentUserId.current !== undefined && currentUserId.current !== nextUserId) {
        queryClient.clear();
      }
      currentUserId.current = nextUserId;

      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
