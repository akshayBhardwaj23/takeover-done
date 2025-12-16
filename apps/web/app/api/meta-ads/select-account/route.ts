import { NextRequest, NextResponse } from 'next/server';
import { prisma, logEvent } from '@ai-ecom/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { decryptSecure, encryptSecure } from '@ai-ecom/api';
import * as Sentry from '@sentry/nextjs';

// Prisma requires Node.js runtime (cannot run on Edge)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adAccountId, adAccountName } = body;

    if (!adAccountId || !adAccountName) {
      return NextResponse.json(
        { error: 'Ad account ID and name are required' },
        { status: 400 },
      );
    }

    // Get temporary tokens from cookies
    const tempAccessToken = req.cookies.get('meta_ads_temp_access_token')?.value;
    const tempRefreshToken = req.cookies.get('meta_ads_temp_refresh_token')?.value;
    const tempUserId = req.cookies.get('meta_ads_temp_user_id')?.value;
    const tempExpiresIn = req.cookies.get('meta_ads_temp_expires_in')?.value;

    if (!tempAccessToken || !tempUserId) {
      return NextResponse.json(
        { error: 'OAuth session expired. Please reconnect.' },
        { status: 401 },
      );
    }

    // Verify user session matches cookie
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
    }

    // Verify user ID matches
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.id !== tempUserId) {
      return NextResponse.json(
        { error: 'User mismatch. Please reconnect.' },
        { status: 403 },
      );
    }

    // Decrypt tokens
    const accessToken = decryptSecure(tempAccessToken);
    const refreshToken = tempRefreshToken ? decryptSecure(tempRefreshToken) : null;

    // Check if connection already exists for this user
    const existing = await prisma.connection.findFirst({
      where: {
        userId: user.id,
        type: 'META_ADS' as any,
      },
    });

    const metadata: Record<string, unknown> = {
      adAccountId,
      adAccountName,
    };
    
    if (refreshToken) {
      metadata.exchangeToken = refreshToken;
    }
    
    if (tempExpiresIn) {
      metadata.tokenExpiresAt = new Date(
        Date.now() + parseInt(tempExpiresIn, 10) * 1000,
      ).toISOString();
    }

    let connectionId: string;

    if (existing) {
      // Update existing connection
      await prisma.connection.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptSecure(accessToken),
          refreshToken: refreshToken
            ? encryptSecure(refreshToken)
            : existing.refreshToken,
          metadata: metadata,
        },
      });
      connectionId = existing.id;
    } else {
      // Create new connection
      const newConnection = await prisma.connection.create({
        data: {
          type: 'META_ADS' as any,
          accessToken: encryptSecure(accessToken),
          refreshToken: refreshToken ? encryptSecure(refreshToken) : null,
          userId: user.id,
          metadata: metadata,
        },
      });
      connectionId = newConnection.id;
    }

    // Try to log event (non-critical, continue if it fails)
    try {
      await logEvent(
        'meta_ads.connected',
        { userId: user.id, adAccountId },
        'connection',
        connectionId,
      );
    } catch (logError) {
      console.warn('[Meta Ads Select Account] Failed to log event:', logError);
    }

    // Clear temporary cookies
    const res = NextResponse.json({ success: true, adAccountId, adAccountName });
    res.cookies.set('meta_ads_temp_access_token', '', { maxAge: -1, path: '/' });
    res.cookies.set('meta_ads_temp_refresh_token', '', { maxAge: -1, path: '/' });
    res.cookies.set('meta_ads_temp_user_id', '', { maxAge: -1, path: '/' });
    res.cookies.set('meta_ads_temp_expires_in', '', { maxAge: -1, path: '/' });

    return res;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Meta Ads Select Account] Error:', errorMessage);
    console.error('[Meta Ads Select Account] Full error:', error);

    // Log to Sentry in production/staging
    if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'staging') {
      Sentry.captureException(error, {
        tags: { component: 'meta-ads-select-account', operation: 'save-connection' },
      });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to save ad account selection' },
      { status: 500 },
    );
  }
}

