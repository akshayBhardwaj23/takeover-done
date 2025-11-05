import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { seedDefaultPlaybooks } from '@ai-ecom/db';

/**
 * Seed default playbooks for the current user
 * This can be called after user signs up or connects their first store
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from session
    const userId = (session as any).userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    await seedDefaultPlaybooks(userId);

    return NextResponse.json({
      success: true,
      message: 'Default playbooks created successfully',
    });
  } catch (error: any) {
    console.error('Error seeding playbooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed playbooks' },
      { status: 500 }
    );
  }
}

