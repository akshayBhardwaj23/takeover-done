import { NextRequest, NextResponse } from 'next/server';
import { decryptSecure } from '@ai-ecom/api';
// Import directly from the source file since it's not exported from the package
import { listAdAccounts } from '../../../../../../packages/api/src/meta-ads';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Get temporary tokens from cookies
    const tempAccessToken = req.cookies.get('meta_ads_temp_access_token')?.value;
    const tempRefreshToken = req.cookies.get('meta_ads_temp_refresh_token')?.value;

    if (!tempAccessToken) {
      return NextResponse.json(
        { error: 'OAuth session expired. Please reconnect.' },
        { status: 401 },
      );
    }

    // Decrypt tokens
    const accessToken = decryptSecure(tempAccessToken);
    const refreshToken = tempRefreshToken ? decryptSecure(tempRefreshToken) : null;

    // Fetch ad accounts using the temporary tokens
    const accounts = await listAdAccounts(accessToken, refreshToken);

    return NextResponse.json({ accounts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Meta Ads Accounts From Temp] Error:', errorMessage);
    console.error('[Meta Ads Accounts From Temp] Full error:', error);

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch ad accounts' },
      { status: 500 },
    );
  }
}

