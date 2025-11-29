export interface AuthUser {
    id: string;
    email: string;
    is_interviewer: boolean;
    is_admin: boolean;
    full_name?: string;
}
export declare function requireAuth(): Promise<AuthUser>;
export declare function requireInterviewee(): Promise<AuthUser>;
export declare function requireInterviewer(): Promise<AuthUser>;
export declare function requireAdmin(): Promise<AuthUser>;
