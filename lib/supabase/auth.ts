import {createClient, createServiceClient} from './server';
import {Database} from '@/types/database';

export interface User {
  id: string;
  email: string;
  is_interviewer: boolean;
  is_admin: boolean;
  full_name?: string;
}

export async function requireAuth(): Promise<User> {
  try {
    const supabase = await createClient();

    const {
      data: {user: authUser},
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('Auth error in requireAuth:', authError?.message);
      throw new Error('Unauthorized');
    }

    // Get user from users table using service client (bypasses RLS)
    const serviceClient = createServiceClient();

    // First, try to fetch by ID (primary lookup)
    const {data: userData} = await serviceClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    let user: Database['public']['Tables']['users']['Row'] | null = userData as
      | Database['public']['Tables']['users']['Row']
      | null;

    // If not found by ID, try by email (in case of ID mismatch)
    if (!user && authUser.email) {
      const {data: userByEmail} = await serviceClient
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (userByEmail) {
        const userByEmailTyped =
          userByEmail as Database['public']['Tables']['users']['Row'];
        if (userByEmailTyped.id !== authUser.id) {
          console.warn(
            `User found by email but ID mismatch. Auth ID: ${authUser.id}, DB ID: ${userByEmailTyped.id}. Using existing DB record.`,
          );
        }
        user = userByEmailTyped;
      }
    }

    // If user still doesn't exist, try to create one
    if (!user) {
      // Double-check one more time before creating (race condition protection)
      const {data: doubleCheckUser} = await serviceClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (doubleCheckUser) {
        const userTyped =
          doubleCheckUser as Database['public']['Tables']['users']['Row'];
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
        const {data: emailCheckUser} = await serviceClient
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        if (emailCheckUser) {
          const userTyped =
            emailCheckUser as Database['public']['Tables']['users']['Row'];
          console.warn(
            `User found by email during creation check. Using existing user.`,
          );
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
      const insertData: Database['public']['Tables']['users']['Insert'] = {
        id: authUser.id, // Always use Auth ID as source of truth
        email: authUser.email!,
        is_interviewer: false,
        is_admin: false, // Never auto-populate admin
        full_name: authUser.user_metadata?.full_name || null,
      };

      // TypeScript inference issue with Supabase insert - using type assertion as workaround
      const {data: newUser, error: createError} =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (serviceClient.from('users') as any)
          .insert([insertData])
          .select()
          .single();

      if (createError) {
        // Handle duplicate key errors - user was created between our check and insert
        if (
          createError.code === '23505' ||
          createError.message?.includes('duplicate') ||
          createError.message?.includes('unique')
        ) {
          console.log(
            'User created between check and insert, fetching existing user...',
          );

          // Final fetch attempt - user must exist now
          const {data: finalUser} = await serviceClient
            .from('users')
            .select('*')
            .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
            .maybeSingle();

          if (finalUser) {
            const finalUserTyped =
              finalUser as Database['public']['Tables']['users']['Row'];
            return {
              id: finalUserTyped.id,
              email: finalUserTyped.email,
              is_interviewer: finalUserTyped.is_interviewer,
              is_admin: finalUserTyped.is_admin,
              full_name: finalUserTyped.full_name || undefined,
            };
          }

          console.error(
            'Duplicate key error but user not found after multiple attempts:',
            {
              authUserId: authUser.id,
              email: authUser.email,
              error: createError.message,
            },
          );
          throw new Error(
            `User profile creation failed: ${createError.message}`,
          );
        }

        console.error('Failed to create user profile:', createError);
        throw new Error(
          `Failed to create user profile: ${
            createError.message || 'Unknown error'
          }`,
        );
      }

      if (!newUser) {
        console.error('User creation returned no data');
        throw new Error('Failed to create user profile: No data returned');
      }

      const newUserTyped =
        newUser as Database['public']['Tables']['users']['Row'];
      return {
        id: newUserTyped.id,
        email: newUserTyped.email,
        is_interviewer: newUserTyped.is_interviewer,
        is_admin: newUserTyped.is_admin,
        full_name: newUserTyped.full_name || undefined,
      };
    }

    const userTyped = user as Database['public']['Tables']['users']['Row'];
    return {
      id: userTyped.id,
      email: userTyped.email,
      is_interviewer: userTyped.is_interviewer,
      is_admin: userTyped.is_admin,
      full_name: userTyped.full_name || undefined,
    };
  } catch (error: unknown) {
    // Re-throw Unauthorized errors as-is
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw error;
    }
    // Log and re-throw other errors
    console.error('Unexpected error in requireAuth:', error);
    throw new Error('Unauthorized');
  }
}

export async function requireInterviewee(): Promise<User> {
  const user = await requireAuth();
  return user;
}

export async function requireInterviewer(): Promise<User> {
  const user = await requireAuth();

  if (!user.is_interviewer && !user.is_admin) {
    throw new Error('Forbidden: Interviewer access required');
  }

  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();

  if (!user.is_admin) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}
