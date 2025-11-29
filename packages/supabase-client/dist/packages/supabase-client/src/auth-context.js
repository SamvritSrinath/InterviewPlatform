'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_1 = require("./client");
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const supabase = (0, client_1.createBrowserClient)();
    const fetchUserProfile = (0, react_1.useCallback)(async (authUser) => {
        if (!authUser)
            return null;
        try {
            const response = await fetch('/api/users/me', {
                credentials: 'include',
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                return data.user;
            }
            else {
                // Only log if it's not a 401 (unauthorized is expected when not logged in)
                if (response.status !== 401) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('Failed to fetch user profile:', response.status, errorData);
                }
            }
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
        }
        return null;
    }, []);
    const refreshUser = (0, react_1.useCallback)(async () => {
        try {
            const { data: { user: authUser }, } = await supabase.auth.getUser();
            const profile = await fetchUserProfile(authUser);
            setUser(profile);
        }
        catch (error) {
            console.error('Error refreshing user:', error);
            setUser(null);
        }
    }, [supabase, fetchUserProfile]);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        // Initial load - check session and fetch profile ONCE if session exists
        const loadUser = async () => {
            try {
                const { data: { session }, } = await supabase.auth.getSession();
                if (session === null || session === void 0 ? void 0 : session.user) {
                    // Fetch profile ONCE on initial load
                    const profile = await fetchUserProfile(session.user);
                    if (mounted) {
                        setUser(profile);
                    }
                }
                else {
                    // No session - clear user state
                    if (mounted) {
                        setUser(null);
                    }
                }
            }
            catch (error) {
                console.error('Error loading user:', error);
                if (mounted) {
                    setUser(null);
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        loadUser();
        // Listen for auth state changes
        const { data: { subscription }, } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                // User explicitly signed in - fetch fresh profile
                if ((session === null || session === void 0 ? void 0 : session.user) && mounted) {
                    const profile = await fetchUserProfile(session.user);
                    if (mounted) {
                        setUser(profile);
                    }
                }
            }
            else if (event === 'TOKEN_REFRESHED') {
                // Token refreshed - cookies are handled automatically by @supabase/ssr
                // No action needed here
            }
            else if (event === 'SIGNED_OUT') {
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
    return ((0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: { user, loading, signOut, refreshUser }, children: children }));
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
//# sourceMappingURL=auth-context.js.map