import {NextRequest, NextResponse} from 'next/server';
import {requireAuth} from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

// GET /api/users/me - Get current user profile
export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({user});
  } catch (error: unknown) {
    console.error('Error in GET /api/users/me:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (
      errorMessage === 'Unauthorized' ||
      errorMessage.includes('Unauthorized')
    ) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please log in to access this resource',
        },
        {status: 401},
      );
    }

    // Return more detailed error in development
    const finalErrorMessage =
      process.env.NODE_ENV === 'development'
        ? errorMessage || 'Internal server error'
        : 'Internal server error';

    return NextResponse.json({error: finalErrorMessage}, {status: 500});
  }
}
