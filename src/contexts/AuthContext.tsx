import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfileAndUpdateAccess = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await (supabase as any)
      .from('profiles_codeapp')
      .select('id, user_id, nome, apelido, idade, onboarding_completo, moedas, primeiro_acesso, ultimo_acesso, created_at, updated_at, foto_url, materias_favoritas')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    const profileData = data as Profile | null;
    const now = new Date().toISOString();
    const updateData: { ultimo_acesso: string; primeiro_acesso?: string } = { ultimo_acesso: now };
    if (!profileData?.primeiro_acesso) updateData.primeiro_acesso = now;

    await (supabase as any)
      .from('profiles_codeapp')
      .update(updateData)
      .eq('user_id', userId);

    return profileData
      ? { ...profileData, ultimo_acesso: now, ...(!profileData.primeiro_acesso && { primeiro_acesso: now }) }
      : null;
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await (supabase as any)
      .from('profiles_codeapp')
      .select('id, user_id, nome, apelido, idade, onboarding_completo, moedas, primeiro_acesso, ultimo_acesso, created_at, updated_at, foto_url, materias_favoritas')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return data || false;
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Token inválido/expirado: limpa a sessão para forçar novo login
      if (sessionError || (session && !session.user)) {
        await supabase.auth.signOut();
        session = null;
      }

      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const [profileData, adminStatus] = await Promise.all([
          fetchProfileAndUpdateAccess(session.user.id),
          checkAdminRole(session.user.id),
        ]);

        if (!isMounted) return;

        setProfile(profileData);
        setIsAdmin(adminStatus);
      }

      setIsLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        // Refresh token inválido: força logout
        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        // TOKEN_REFRESHED e INITIAL_SESSION não requerem re-fetch de perfil
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(session);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer async calls com setTimeout para evitar deadlock
          setTimeout(async () => {
            if (!isMounted) return;

            try {
              const [profileData, adminStatus] = await Promise.all([
                fetchProfileAndUpdateAccess(session.user.id),
                checkAdminRole(session.user.id),
              ]);

              if (!isMounted) return;

              setProfile(profileData);
              setIsAdmin(adminStatus);
            } catch (error) {
              console.error('Error fetching user data:', error);
            }

            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'codeup://',
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
