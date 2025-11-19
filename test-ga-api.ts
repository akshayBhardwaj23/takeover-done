/**
 * Test script to directly test Google Analytics API calls
 * Run with: npx tsx test-ga-api.ts
 * Make sure to set DATABASE_URL and ENCRYPTION_KEY env vars
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { decryptSecure } from './packages/api/src/crypto.js';

const prisma = new PrismaClient();

async function testGAApi() {
  try {
    console.log('🔍 Testing Google Analytics API...\n');

    // Get the first GA connection
    const connection = await prisma.connection.findFirst({
      where: {
        type: 'GOOGLE_ANALYTICS' as any,
      },
    });

    if (!connection) {
      console.error('❌ No Google Analytics connection found');
      return;
    }

    console.log('✅ Connection found:', {
      id: connection.id,
      userId: connection.userId,
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken,
      metadata: connection.metadata,
    });

    const accessToken = decryptSecure(connection.accessToken);
    const refreshToken = connection.refreshToken
      ? decryptSecure(connection.refreshToken)
      : null;

    console.log('\n📡 Testing API calls...\n');

    // Test 1: List accounts
    console.log('1️⃣ Testing: List Accounts');
    const accountsRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accounts',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log('   Status:', accountsRes.status, accountsRes.statusText);

    if (!accountsRes.ok) {
      const errorText = await accountsRes.text();
      console.error('   ❌ Failed:', errorText);
      return;
    }

    const accountsData = await accountsRes.json();
    console.log('   ✅ Success! Accounts:', JSON.stringify(accountsData, null, 2));

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      console.log('   ⚠️  No accounts found');
      return;
    }

    // Test 2: List properties for first account
    const firstAccount = accountsData.accounts[0];
    const accountName = firstAccount.name;
    const accountId = accountName.replace('accounts/', '');

    console.log(`\n2️⃣ Testing: List Properties for Account ${accountId}`);
    const propertiesRes = await fetch(
      `https://analyticsadmin.googleapis.com/v1beta/${accountName}/properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log('   Status:', propertiesRes.status, propertiesRes.statusText);

    if (!propertiesRes.ok) {
      const errorText = await propertiesRes.text();
      console.error('   ❌ Failed:', errorText);
      return;
    }

    const propertiesData = await propertiesRes.json();
    console.log('   ✅ Success! Properties:', JSON.stringify(propertiesData, null, 2));

    if (!propertiesData.properties || propertiesData.properties.length === 0) {
      console.log('   ⚠️  No properties found in this account');
      return;
    }

    // Test 3: Fetch analytics data for first property
    const firstProperty = propertiesData.properties[0];
    const propertyName = firstProperty.name;
    const propertyId = propertyName.replace('properties/', '');

    console.log(`\n3️⃣ Testing: Fetch Analytics Data for Property ${propertyId}`);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const analyticsRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
        }),
      },
    );

    console.log('   Status:', analyticsRes.status, analyticsRes.statusText);
    console.log('   Date Range:', { startDate, endDate });

    if (!analyticsRes.ok) {
      const errorText = await analyticsRes.text();
      console.error('   ❌ Failed:', errorText);
      return;
    }

    const analyticsData = await analyticsRes.json();
    console.log('   ✅ Success! Analytics Data:', JSON.stringify(analyticsData, null, 2));

    // Test 4: Try token refresh if we have refresh token
    if (refreshToken) {
      console.log('\n4️⃣ Testing: Token Refresh');
      const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.log('   ⚠️  Missing GOOGLE_ANALYTICS_CLIENT_ID or GOOGLE_ANALYTICS_CLIENT_SECRET');
      } else {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        console.log('   Status:', refreshRes.status, refreshRes.statusText);

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          console.log('   ✅ Token refreshed successfully');
          console.log('   New access token (first 20 chars):', refreshData.access_token?.substring(0, 20) + '...');
        } else {
          const errorText = await refreshRes.text();
          console.error('   ❌ Token refresh failed:', errorText);
        }
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Account ID: ${accountId}`);
    console.log(`   - Property ID: ${propertyId}`);
    console.log(`   - Property Name: ${firstProperty.displayName || propertyId}`);
    console.log(`   - Total Properties: ${propertiesData.properties.length}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testGAApi();

