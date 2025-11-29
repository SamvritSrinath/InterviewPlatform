"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireInterviewee = requireInterviewee;
exports.requireInterviewer = requireInterviewer;
exports.requireAdmin = requireAdmin;
const server_1 = require("./server");
async function requireAuth() {
    var _a, _b, _c;
    try {
        const supabase = await (0, server_1.createServerClient)();
        const { data: { user: authUser }, error: authError, } = await supabase.auth.getUser();
        if (authError || !authUser) {
            console.error('Auth error in requireAuth:', authError === null || authError === void 0 ? void 0 : authError.message);
            throw new Error('Unauthorized');
        }
        // Get user from users table using service client (bypasses RLS)
        const serviceClient = (0, server_1.createServiceClient)();
        // First, try to fetch by ID (primary lookup)
        const { data: userData } = await serviceClient
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
        let user = userData;
        // If not found by ID, try by email (in case of ID mismatch)
        if (!user && authUser.email) {
            const { data: userByEmail } = await serviceClient
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .maybeSingle();
            if (userByEmail) {
                const userByEmailTyped = userByEmail;
                if (userByEmailTyped.id !== authUser.id) {
                    console.warn(`User found by email but ID mismatch. Auth ID: ${authUser.id}, DB ID: ${userByEmailTyped.id}. Using existing DB record.`);
                }
                user = userByEmailTyped;
            }
        }
        // If user still doesn't exist, try to create one
        if (!user) {
            // Double-check one more time before creating (race condition protection)
            const { data: doubleCheckUser } = await serviceClient
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();
            if (doubleCheckUser) {
                const userTyped = doubleCheckUser;
                return {
                    id: userTyped.id,
                    email: userTyped.email,
                    is_interviewer: userTyped.is_interviewer,
                    is_admin: userTyped.is_admin,
                    full_name: userTyped.full_name || undefined,
                };
            }
            // Also check by email one more time
            if (authUser.email) {
                const { data: emailCheckUser } = await serviceClient
                    .from('users')
                    .select('*')
                    .eq('email', authUser.email)
                    .maybeSingle();
                if (emailCheckUser) {
                    const userTyped = emailCheckUser;
                    console.warn(`User found by email during creation check. Using existing user.`);
                    return {
                        id: userTyped.id,
                        email: userTyped.email,
                        is_interviewer: userTyped.is_interviewer,
                        is_admin: userTyped.is_admin,
                        full_name: userTyped.full_name || undefined,
                    };
                }
            }
            // Now create user - we've verified it doesn't exist
            // IMPORTANT: is_admin is always false - no auto-admin population
            const insertData = {
                id: authUser.id, // Always use Auth ID as source of truth
                email: authUser.email,
                is_interviewer: false,
                is_admin: false, // Never auto-populate admin
                full_name: ((_a = authUser.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) || null,
            };
            // TypeScript inference issue with Supabase insert - using type assertion as workaround
            const { data: newUser, error: createError } = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
             serviceClient.from('users')
                .insert([insertData])
                .select()
                .single();
            if (createError) {
                // Handle duplicate key errors - user was created between our check and insert
                if (createError.code === '23505' ||
                    ((_b = createError.message) === null || _b === void 0 ? void 0 : _b.includes('duplicate')) ||
                    ((_c = createError.message) === null || _c === void 0 ? void 0 : _c.includes('unique'))) {
                    console.log('User created between check and insert, fetching existing user...');
                    // Final fetch attempt - user must exist now
                    const { data: finalUser } = await serviceClient
                        .from('users')
                        .select('*')
                        .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
                        .maybeSingle();
                    if (finalUser) {
                        const finalUserTyped = finalUser;
                        return {
                            id: finalUserTyped.id,
                            email: finalUserTyped.email,
                            is_interviewer: finalUserTyped.is_interviewer,
                            is_admin: finalUserTyped.is_admin,
                            full_name: finalUserTyped.full_name || undefined,
                        };
                    }
                    console.error('Duplicate key error but user not found after multiple attempts:', {
                        authUserId: authUser.id,
                        email: authUser.email,
                        error: createError.message,
                    });
                    throw new Error(`User profile creation failed: ${createError.message}`);
                }
                console.error('Failed to create user profile:', createError);
                throw new Error(`Failed to create user profile: ${createError.message || 'Unknown error'}`);
            }
            if (!newUser) {
                console.error('User creation returned no data');
                throw new Error('Failed to create user profile: No data returned');
            }
            const newUserTyped = newUser;
            return {
                id: newUserTyped.id,
                email: newUserTyped.email,
                is_interviewer: newUserTyped.is_interviewer,
                is_admin: newUserTyped.is_admin,
                full_name: newUserTyped.full_name || undefined,
            };
        }
        const userTyped = user;
        return {
            id: userTyped.id,
            email: userTyped.email,
            is_interviewer: userTyped.is_interviewer,
            is_admin: userTyped.is_admin,
            full_name: userTyped.full_name || undefined,
        };
    }
    catch (error) {
        // Re-throw Unauthorized errors as-is
        if (error instanceof Error && error.message === 'Unauthorized') {
            throw error;
        }
        // Log and re-throw other errors
        console.error('Unexpected error in requireAuth:', error);
        throw new Error('Unauthorized');
    }
}
async function requireInterviewee() {
    const user = await requireAuth();
    return user;
}
async function requireInterviewer() {
    const user = await requireAuth();
    if (!user.is_interviewer && !user.is_admin) {
        throw new Error('Forbidden: Interviewer access required');
    }
    return user;
}
async function requireAdmin() {
    const user = await requireAuth();
    if (!user.is_admin) {
        throw new Error('Forbidden: Admin access required');
    }
    return user;
}
//# sourceMappingURL=auth.js.map