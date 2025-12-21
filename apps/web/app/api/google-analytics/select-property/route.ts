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
    const { propertyId, propertyName, accountId, currency } = body;

    if (!propertyId || !propertyName) {
      return NextResponse.json(
        { error: 'Property ID and name are required' },
        { status: 400 },
      );
    }

    // Get temporary tokens from cookies
    const tempAccessToken = req.cookies.get('ga_temp_access_token')?.value;
    const tempRefreshToken = req.cookies.get('ga_temp_refresh_token')?.value;
    const tempUserId = req.cookies.get('ga_temp_user_id')?.value;

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
    const refreshToken = tempRefreshToken
      ? decryptSecure(tempRefreshToken)
      : null;

    // Try to fetch currency from GA4 property settings first
    let finalCurrency = currency || 'USD';

    if (!currency) {
      // First check existing connection for currency
      const existing = await prisma.connection.findFirst({
        where: {
          userId: user.id,
          type: 'GOOGLE_ANALYTICS' as any,
        },
      });

      if (existing?.metadata) {
        const existingMetadata = existing.metadata as Record<string, unknown>;
        if (
          existingMetadata.currency &&
          typeof existingMetadata.currency === 'string'
        ) {
          finalCurrency = existingMetadata.currency;
          console.log(
            '[GA Select Property] Using existing currency from metadata:',
            finalCurrency,
          );
        }
      }

      // If not found in existing connection, try to fetch from GA4 property
      if (finalCurrency === 'USD') {
        try {
          const cleanPropertyId = propertyId.replace(/^properties\//, '');
          const propertyRes = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/properties/${cleanPropertyId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (propertyRes.ok) {
            const propertyData = (await propertyRes.json()) as {
              currencyCode?: string;
            };
            if (propertyData.currencyCode) {
              finalCurrency = propertyData.currencyCode;
              console.log(
                '[GA Select Property] Fetched currency from GA4 property:',
                finalCurrency,
              );
            } else {
              console.log(
                '[GA Select Property] Property response does not include currencyCode, response:',
                JSON.stringify(propertyData).substring(0, 200),
              );
            }
          } else {
            const errorText = await propertyRes.text();
            console.warn(
              '[GA Select Property] Failed to fetch property for currency:',
              propertyRes.status,
              errorText.substring(0, 200),
            );
          }
        } catch (error) {
          console.warn(
            '[GA Select Property] Error fetching currency from GA4 property:',
            error,
          );
          // Continue with default USD
        }
      }
    }

    console.log('[GA Select Property] Final currency:', finalCurrency);

    // Check if connection already exists for this user
    const existing = await prisma.connection.findFirst({
      where: {
        userId: user.id,
        type: 'GOOGLE_ANALYTICS' as any,
      },
    });

    const metadata: Record<string, unknown> = {
      propertyId,
      propertyName,
      currency: finalCurrency, // Store currency in metadata
    };
    if (accountId) {
      metadata.accountId = accountId;
    }

    let connectionId: string;

    if (existing) {
      // Update existing connection - merge with existing metadata to preserve currency and other fields
      const existingMetadata =
        (existing.metadata as Record<string, unknown>) || {};
      const mergedMetadata = {
        ...existingMetadata, // Preserve existing fields (like currency)
        ...metadata, // Override with new property info
      };

      await prisma.connection.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptSecure(accessToken),
          refreshToken: refreshToken
            ? encryptSecure(refreshToken)
            : existing.refreshToken,
          metadata: mergedMetadata as any, // Use merged metadata to preserve currency
        },
      });
      connectionId = existing.id;
    } else {
      // Create new connection
      const newConnection = await prisma.connection.create({
        data: {
          type: 'GOOGLE_ANALYTICS' as any,
          accessToken: encryptSecure(accessToken),
          refreshToken: refreshToken ? encryptSecure(refreshToken) : null,
          userId: user.id,
          metadata: metadata as any,
        },
      });
      connectionId = newConnection.id;
    }

    // Try to log event (non-critical, continue if it fails)
    try {
      await logEvent(
        'google_analytics.connected',
        { userId: user.id, propertyId },
        'connection',
        connectionId,
      );
    } catch (logError) {
      console.warn('[GA Select Property] Failed to log event:', logError);
    }

    // Clear temporary cookies
    const res = NextResponse.json({ success: true, propertyId, propertyName });
    res.cookies.set('ga_temp_access_token', '', { maxAge: -1, path: '/' });
    res.cookies.set('ga_temp_refresh_token', '', { maxAge: -1, path: '/' });
    res.cookies.set('ga_temp_user_id', '', { maxAge: -1, path: '/' });

    return res;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[GA Select Property] Error:', errorMessage);
    console.error('[GA Select Property] Full error:', error);

    // Log to Sentry in production/staging
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ENVIRONMENT === 'staging'
    ) {
      Sentry.captureException(error, {
        tags: {
          component: 'google-analytics-select-property',
          operation: 'save-connection',
        },
      });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to save property selection' },
      { status: 500 },
    );
  }
}
