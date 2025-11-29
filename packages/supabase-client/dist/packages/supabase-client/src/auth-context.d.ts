import { ReactNode } from 'react';
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
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
