import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {Database} from '@/types/database';
import {z} from 'zod';

export const dynamic = 'force-dynamic';

const createProfileSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable().optional(),
  isInterviewer: z.boolean().optional(),
});

// POST /api/users/create-profile - Create user profile (called after auth signup)
// IMPORTANT: is_admin is ALWAYS false - no auto-admin population
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    const serviceClient = createServiceClient();

    // Check if user already exists by ID first
    const {data: existingUserData} = await serviceClient
      .from('users')
      .select('*')
      .eq('id', validatedData.userId)
      .maybeSingle();
    let existingUser: Database['public']['Tables']['users']['Row'] | null =
      existingUserData as Database['public']['Tables']['users']['Row'] | null;

    // If not found by ID, check by email (in case of ID mismatch or duplicate)
    if (!existingUser && validatedData.email) {
      const {data: userByEmail} = await serviceClient
        .from('users')
        .select('*')
        .eq('email', validatedData.email)
        .maybeSingle();

      if (userByEmail) {
        const userByEmailTyped =
          userByEmail as Database['public']['Tables']['users']['Row'];
        existingUser = userByEmailTyped;
        console.log(
          `User found by email during signup: ${userByEmailTyped.id}`,
        );
      }
    }

    if (existingUser) {
      // User already exists - check if ID matches
      if (existingUser.id !== validatedData.userId) {
        // ID mismatch - this is a data integrity issue
        console.warn(
          `User found but ID mismatch during signup. Auth ID: ${validatedData.userId}, DB ID: ${existingUser.id}. Using existing user.`,
        );
        const userTyped =
          existingUser as Database['public']['Tables']['users']['Row'];
        return NextResponse.json({
          success: true,
          user: {
            id: userTyped.id,
            email: userTyped.email,
            is_interviewer: userTyped.is_interviewer,
            is_admin: userTyped.is_admin,
            full_name: userTyped.full_name,
          },
        });
      }

      // ID matches - update if needed
      // IMPORTANT: Never update is_admin via signup - it stays as is
      const updateData: Database['public']['Tables']['users']['Update'] = {
        email: validatedData.email,
        full_name: validatedData.fullName || null,
        is_interviewer: validatedData.isInterviewer || false,
        // Do NOT update is_admin - preserve existing value
      };

      // TypeScript inference issue with Supabase update - using type assertion as workaround
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const {data: updatedUser, error: updateError} = await (
        serviceClient.from('users') as any
      )
        .update(updateData)
        .eq('id', validatedData.userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user profile:', updateError);
        // Return existing user even if update fails
        const userTyped =
          existingUser as Database['public']['Tables']['users']['Row'];
        return NextResponse.json({
          success: true,
          user: {
            id: userTyped.id,
            email: userTyped.email,
            is_interviewer: userTyped.is_interviewer,
            is_admin: userTyped.is_admin,
            full_name: userTyped.full_name,
          },
        });
      }

      const userTyped =
        updatedUser as Database['public']['Tables']['users']['Row'];
      return NextResponse.json({
        success: true,
        user: {
          id: userTyped.id,
          email: userTyped.email,
          is_interviewer: userTyped.is_interviewer,
          is_admin: userTyped.is_admin,
          full_name: userTyped.full_name,
        },
      });
    }

    // Create new user profile
    // IMPORTANT: is_admin is ALWAYS false on creation
    const insertData: Database['public']['Tables']['users']['Insert'] = {
      id: validatedData.userId,
      email: validatedData.email,
      full_name: validatedData.fullName || null,
      is_interviewer: validatedData.isInterviewer || false,
      is_admin: false, // Never set admin via signup
    };

    // TypeScript inference issue with Supabase insert - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: newUser, error: insertError} = await (
      serviceClient.from('users') as any
    )
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      // Handle duplicate key errors gracefully
      if (
        insertError.code === '23505' ||
        insertError.message?.includes('duplicate') ||
        insertError.message?.includes('unique')
      ) {
        console.log(
          'User already exists (duplicate during signup), fetching existing user...',
        );

        // Try to fetch the existing user by email
        const {data: existingUserAfterError} = await serviceClient
          .from('users')
          .select('*')
          .eq('email', validatedData.email)
          .maybeSingle();

        if (existingUserAfterError) {
          const userTyped =
            existingUserAfterError as Database['public']['Tables']['users']['Row'];
          return NextResponse.json({
            success: true,
            user: {
              id: userTyped.id,
              email: userTyped.email,
              is_interviewer: userTyped.is_interviewer,
              is_admin: userTyped.is_admin,
              full_name: userTyped.full_name,
            },
          });
        }
      }

      console.error('Error creating user profile:', insertError);
      return NextResponse.json(
        {error: 'Failed to create user profile', details: insertError.message},
        {status: 500},
      );
    }

    const userTyped = newUser as Database['public']['Tables']['users']['Row'];
    return NextResponse.json({
      success: true,
      user: {
        id: userTyped.id,
        email: userTyped.email,
        is_interviewer: userTyped.is_interviewer,
        is_admin: userTyped.is_admin,
        full_name: userTyped.full_name,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/users/create-profile:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {error: 'Invalid request data', details: error.errors},
        {status: 400},
      );
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
