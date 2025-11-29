'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import {createBrowserClient} from './client';
import {User, AuthChangeEvent, Session as SupabaseSession} from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  is_interviewer: boolean;
  is_admin: boolean;
  full_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Only create client if env vars are available and we're in the browser (skip during build/prerender)
  const supabase = useMemo(() => {
    // Skip during SSR/build - only create in browser
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Check if env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null;
    }
    
    try {
      return createBrowserClient();
    } catch (error) {
      // During build/prerender, env vars might not be available - that's okay
      console.warn('Supabase client creation failed:', error);
      return null;
    }
  }, []);

  const fetchUserProfile = useCallback(
    async (authUser: User | null): Promise<AuthUser | null> => {
      if (!authUser) return null;

      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store' as RequestCache,
        });

        if (response.ok) {
          const data = await response.json() as {user: AuthUser | null};
          return data.user;
        } else {
          // Only log if it's not a 401 (unauthorized is expected when not logged in)
          if (response.status !== 401) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(
              'Failed to fetch user profile:',
              response.status,
              errorData,
            );
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
      return null;
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const {
        data: {user: authUser},
      } = await supabase.auth.getUser();
      const profile = await fetchUserProfile(authUser);
      setUser(profile);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  }, [supabase, fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    // Initial load - check session and fetch profile ONCE if session exists
    const loadUser = async () => {
      if (!supabase) {
        if (mounted) {
          setLoading(false);
          setUser(null);
        }
        return;
      }

      try {
        const {
          data: {session},
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch profile ONCE on initial load
          const profile = await fetchUserProfile(session.user);
          if (mounted) {
            setUser(profile);
          }
        } else {
          // No session - clear user state
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    // Listen for auth state changes (only if supabase client is available)
    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: SupabaseSession | null) => {
      if (event === 'SIGNED_IN') {
        // User explicitly signed in - fetch fresh profile
        if (session?.user && mounted) {
          const profile = await fetchUserProfile(session.user);
          if (mounted) {
            setUser(profile);
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - cookies are handled automatically by @supabase/ssr
        // No action needed here
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear state
        if (mounted) {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{user, loading, signOut, refreshUser}}>
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
