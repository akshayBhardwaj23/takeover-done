# Shopify Integration Setup Guide

This guide walks you through connecting your Shopify store to Zyyp using the Custom App connection method.

## Overview

Zyyp uses **Custom App connections** which allow you to connect your Shopify store without OAuth. This means:

- ✅ **No tunnel required** - Works entirely on localhost
- ✅ **No OAuth setup** - Just create a Custom App in Shopify and copy the token
- ✅ **Full API access** - Read orders, customers, products, and more
- ✅ **Manual sync** - Sync orders on-demand or automatically on connection

## Prerequisites

- A Shopify store (development or production)
- Admin access to your Shopify store
- Access to Zyyp's Integrations page

## Step-by-Step Setup

### Step 1: Navigate to Shopify Admin

1. Log in to your **Shopify Admin**
2. Go to **Settings** (bottom left corner)
3. Click **Apps and sales channels**

### Step 2: Create a Custom App

1. Click **Develop apps** (top right corner)
2. Click **Create an app**
3. Enter a name for your app (e.g., "Zyyp Integration")
4. Click **Create app**

### Step 3: Configure API Scopes

1. Click **Configure Admin API scopes**
2. Select the following scopes (minimum required):
   - ✅ `read_orders` - To read order data
   - ✅ `read_customers` - To read customer information
   - ✅ `read_products` - To read product information (optional but recommended)
3. Click **Save**

### Step 4: Get Your Access Token

1. Go to the **API credentials** tab
2. Click **Install app** (if not already installed)
3. Click **Reveal token once** under Admin API access token
4. **Copy the token immediately** - It starts with `shpat_` and is only shown once!

⚠️ **Important**: If you don't copy the token now, you'll need to regenerate it.

### Step 5: Connect to Zyyp

1. Go to **Zyyp** → **Integrations** page
2. Find the **Shopify** card and click **Connect** (or **Add Another Store** if you already have a store)
3. Fill in the form:
   - **Store Subdomain**: Enter just the subdomain (e.g., if your store is `my-store.myshopify.com`, enter `my-store`)
   - **Admin API Access Token**: Paste the token you copied (starts with `shpat_`)
4. Click **Connect Store**

### Step 6: Wait for Initial Sync

- Zyyp will automatically sync the last **100 orders** from your store
- This includes orders from up to **2 years back** (beyond Shopify's default 60-day limit)
- You'll see a success message when the store is connected

## Adding Multiple Stores

If you're on a plan that supports multiple stores:

1. On the Integrations page, you'll see an **"Add Another Store"** card
2. Click it and follow the same setup steps
3. Each store's orders are kept separate and identified by store name

### Store Limits by Plan

| Plan | Max Stores |
|------|------------|
| Trial | 1 |
| Starter | 1 |
| Growth | 3 |
| Pro | 10 |
| Enterprise | Unlimited |

If you reach your limit, you'll see an error message prompting you to upgrade.

## Manual Order Sync

After connecting, you can manually sync orders anytime:

1. Go to **Integrations** page
2. Find your connected Shopify store
3. Click the **🔄 sync button** (refresh icon) on the store card
4. Wait for the sync to complete

## Viewing Orders

Once connected, your orders will appear in:

- **Inbox** → **Orders** tab
- Each order shows:
  - Order ID (last 6 digits)
  - Customer email (if available)
  - Order status (paid, pending, etc.)
  - Total amount
  - Order date

## Disconnecting a Store

If you need to disconnect a store:

1. Go to **Integrations** page
2. Find your Shopify store
3. Click **Remove**
4. Confirm the disconnection

⚠️ **Important**: After disconnecting in Zyyp, you should also:

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click **Develop apps**
3. Find your "Zyyp Integration" app
4. Click **Delete app** to fully revoke access

This ensures the access token is completely revoked.

## Troubleshooting

### "Invalid access token or subdomain"

- Double-check that you copied the entire token (it should start with `shpat_`)
- Verify your subdomain is correct (just the part before `.myshopify.com`)
- Make sure you selected the required API scopes in Shopify

### "You've reached your store limit"

- Check your current plan's store limit
- Disconnect an unused store if you've reached the limit
- Upgrade your plan to add more stores

### Orders not showing up

1. Click the **🔄 sync button** on your store card
2. Check if the store was just connected (initial sync may take a moment)
3. Verify the store has orders in Shopify Admin
4. Check that you have the `read_orders` scope enabled

### "Connection not found"

- Make sure you're logged into the correct Zyyp account
- Verify the store is connected in the Integrations page
- Try disconnecting and reconnecting the store

## Development Setup

For local development:

- ✅ **No tunnel required** - Custom App connections work on localhost
- ✅ **No OAuth setup** - Just create a Custom App in Shopify
- ✅ **Full functionality** - All features work without a public URL

Only webhooks require a tunnel, and those are optional for real-time updates.

## Security Notes

- Access tokens are encrypted at rest in Zyyp's database
- Tokens are only used for API calls to Shopify
- Each store's data is isolated by `connectionId`
- You can revoke access anytime by deleting the Custom App in Shopify

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify your Shopify Custom App has the correct scopes
3. Try disconnecting and reconnecting the store
4. Contact support with:
   - Your store domain
   - Any error messages you see
   - Steps you've already tried

---

**Last Updated**: Reflects Custom App connection method with manual token entry and plan-based store limits.

