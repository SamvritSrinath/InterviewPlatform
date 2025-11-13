'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {createClient} from './client';
import {User} from '@supabase/supabase-js';

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
  const supabase = createClient();

  const fetchUserProfile = useCallback(
    async (authUser: User | null): Promise<AuthUser | null> => {
      if (!authUser) return null;

      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
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

    // Listen for auth state changes
    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    await supabase.auth.signOut();
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
