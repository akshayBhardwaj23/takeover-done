import { NextRequest, NextResponse } from 'next/server';
import { decryptSecure } from '@ai-ecom/api';
import { listGA4Properties } from '@ai-ecom/api/src/google-analytics';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Get temporary tokens from cookies
    const tempAccessToken = req.cookies.get('ga_temp_access_token')?.value;
    const tempRefreshToken = req.cookies.get('ga_temp_refresh_token')?.value;

    if (!tempAccessToken) {
      return NextResponse.json(
        { error: 'OAuth session expired. Please reconnect.' },
        { status: 401 },
      );
    }

    // Decrypt tokens
    const accessToken = decryptSecure(tempAccessToken);
    const refreshToken = tempRefreshToken ? decryptSecure(tempRefreshToken) : null;

    // Fetch properties
    const properties = await listGA4Properties(accessToken, refreshToken);

    return NextResponse.json({ properties });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GA Properties from Temp] Error:', errorMessage);
    console.error('[GA Properties from Temp] Full error:', error);

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch properties' },
      { status: 500 },
    );
  }
}

