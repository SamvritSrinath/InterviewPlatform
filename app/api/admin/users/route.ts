import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {requireAdmin} from '@/lib/supabase/auth';
import {Database} from '@/types/database';
import {z} from 'zod';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  is_interviewer: z.boolean().optional(),
  is_admin: z.boolean().optional(),
});

// GET /api/admin/users - Get all users (admin only)
export async function GET() {
  try {
    await requireAdmin();
    const serviceClient = createServiceClient();

    const {data: users, error} = await serviceClient
      .from('users')
      .select('id, email, full_name, is_interviewer, is_admin, created_at')
      .order('created_at', {ascending: false});

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({error: 'Failed to fetch users'}, {status: 500});
    }

    return NextResponse.json({users: users || []});
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    if (
      error instanceof Error &&
      (error.message === 'Forbidden: Admin access required' ||
        error.message === 'Unauthorized')
    ) {
      return NextResponse.json({error: error.message}, {status: 403});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}

// PATCH /api/admin/users - Update user role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const serviceClient = createServiceClient();

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Ensure at least one field is being updated
    if (
      validatedData.is_interviewer === undefined &&
      validatedData.is_admin === undefined
    ) {
      return NextResponse.json(
        {error: 'At least one field must be provided for update'},
        {status: 400},
      );
    }

    const updateData: Database['public']['Tables']['users']['Update'] = {
      ...(validatedData.is_interviewer !== undefined && {
        is_interviewer: validatedData.is_interviewer,
      }),
      ...(validatedData.is_admin !== undefined && {
        is_admin: validatedData.is_admin,
      }),
    };

    // TypeScript inference issue with Supabase update - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: user, error} = await (serviceClient.from('users') as any)
      .update(updateData)
      .eq('id', validatedData.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({error: 'Failed to update user'}, {status: 500});
    }

    return NextResponse.json({user});
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {error: 'Invalid request data', details: error.errors},
        {status: 400},
      );
    }
    if (
      error instanceof Error &&
      (error.message === 'Forbidden: Admin access required' ||
        error.message === 'Unauthorized')
    ) {
      return NextResponse.json({error: error.message}, {status: 403});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
