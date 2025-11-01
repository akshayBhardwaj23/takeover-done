import { describe, it, expect, beforeEach } from 'vitest';
import { testPrisma } from './setup';
import {
  ensureSubscription,
  getCurrentUsageRecord,
  incrementEmailSent,
  incrementEmailReceived,
  incrementAISuggestion,
  canSendEmail,
  getUsageSummary,
  getUsageHistory,
  PLAN_LIMITS,
} from '../usage';

describe('Usage tracking', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await testPrisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  describe('ensureSubscription', () => {
    it('should create a trial subscription for new users', async () => {
      const subscription = await ensureSubscription(testUserId);

      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(testUserId);
      expect(subscription.planType).toBe('TRIAL');
      expect(subscription.status).toBe('active');
      expect(subscription.currentPeriodEnd.getTime()).toBeGreaterThan(
        subscription.currentPeriodStart.getTime(),
      );
    });

    it('should return existing subscription if already exists', async () => {
      const sub1 = await ensureSubscription(testUserId);
      const sub2 = await ensureSubscription(testUserId);

      expect(sub1.id).toBe(sub2.id);
    });
  });

  describe('getCurrentUsageRecord', () => {
    it('should create usage record for current period', async () => {
      const subscription = await ensureSubscription(testUserId);
      const usage = await getCurrentUsageRecord(subscription.id);

      expect(usage).toBeDefined();
      expect(usage.subscriptionId).toBe(subscription.id);
      expect(usage.emailsSent).toBe(0);
      expect(usage.emailsReceived).toBe(0);
      expect(usage.aiSuggestions).toBe(0);
    });

    it('should return existing record if already exists', async () => {
      const subscription = await ensureSubscription(testUserId);
      const usage1 = await getCurrentUsageRecord(subscription.id);
      const usage2 = await getCurrentUsageRecord(subscription.id);

      expect(usage1.id).toBe(usage2.id);
    });
  });

  describe('incrementEmailSent', () => {
    it('should increment email count', async () => {
      const subscription = await ensureSubscription(testUserId);
      await incrementEmailSent(testUserId);

      const usage = await testPrisma.usageRecord.findUnique({
        where: { id: (await getCurrentUsageRecord(subscription.id)).id },
      });

      expect(usage?.emailsSent).toBe(1);

      await incrementEmailSent(testUserId);
      const updatedUsage = await testPrisma.usageRecord.findUnique({
        where: { id: (await getCurrentUsageRecord(subscription.id)).id },
      });

      expect(updatedUsage?.emailsSent).toBe(2);
    });
  });

  describe('incrementEmailReceived', () => {
    it('should increment received email count', async () => {
      const subscription = await ensureSubscription(testUserId);
      await incrementEmailReceived(testUserId);

      const usage = await testPrisma.usageRecord.findUnique({
        where: { id: (await getCurrentUsageRecord(subscription.id)).id },
      });

      expect(usage?.emailsReceived).toBe(1);
    });
  });

  describe('incrementAISuggestion', () => {
    it('should increment AI suggestion count', async () => {
      const subscription = await ensureSubscription(testUserId);
      await incrementAISuggestion(testUserId);

      const usage = await testPrisma.usageRecord.findUnique({
        where: { id: (await getCurrentUsageRecord(subscription.id)).id },
      });

      expect(usage?.aiSuggestions).toBe(1);
    });
  });

  describe('canSendEmail', () => {
    it('should allow email for trial plan within limits', async () => {
      const limitCheck = await canSendEmail(testUserId);

      expect(limitCheck.allowed).toBe(true);
      expect(limitCheck.current).toBe(0);
      expect(limitCheck.limit).toBe(PLAN_LIMITS.TRIAL.emailsPerMonth);
      expect(limitCheck.percentage).toBe(0);
    });

    it('should disallow when limit reached', async () => {
      const subscription = await ensureSubscription(testUserId);
      const usage = await getCurrentUsageRecord(subscription.id);

      // Set emails to limit
      await testPrisma.usageRecord.update({
        where: { id: usage.id },
        data: { emailsSent: PLAN_LIMITS.TRIAL.emailsPerMonth },
      });

      const limitCheck = await canSendEmail(testUserId);

      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.current).toBe(PLAN_LIMITS.TRIAL.emailsPerMonth);
    });

    it('should allow unlimited for enterprise plan', async () => {
      // Create enterprise subscription
      await testPrisma.subscription.create({
        data: {
          userId: testUserId,
          planType: 'ENTERPRISE',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const limitCheck = await canSendEmail(testUserId);

      expect(limitCheck.allowed).toBe(true);
      expect(limitCheck.limit).toBe(-1);
    });
  });

  describe('getUsageSummary', () => {
    it('should return correct usage summary', async () => {
      // Send some emails
      await incrementEmailSent(testUserId);
      await incrementEmailSent(testUserId);
      await incrementEmailReceived(testUserId);
      await incrementAISuggestion(testUserId);

      const summary = await getUsageSummary(testUserId);

      expect(summary.planType).toBe('TRIAL');
      expect(summary.emailsSent).toBe(2);
      expect(summary.emailsReceived).toBe(1);
      expect(summary.aiSuggestions).toBe(1);
      expect(summary.emailLimit).toBe(PLAN_LIMITS.TRIAL.emailsPerMonth);
      expect(summary.canSendEmail).toBe(true);
      expect(summary.emailUsagePercentage).toBeGreaterThan(0);
    });

    it('should return correct percentage', async () => {
      const subscription = await ensureSubscription(testUserId);
      const usage = await getCurrentUsageRecord(subscription.id);

      // Set emails to 50% of limit
      const halfLimit = Math.floor(PLAN_LIMITS.TRIAL.emailsPerMonth / 2);
      await testPrisma.usageRecord.update({
        where: { id: usage.id },
        data: { emailsSent: halfLimit },
      });

      const summary = await getUsageSummary(testUserId);

      expect(summary.emailUsagePercentage).toBeCloseTo(50, 0);
    });
  });

  describe('getUsageHistory', () => {
    it('should return empty array for new user', async () => {
      const history = await getUsageHistory(testUserId);

      expect(history).toBeDefined();
      expect(history.length).toBe(0);
    });

    it('should return usage records', async () => {
      await incrementEmailSent(testUserId);

      const history = await getUsageHistory(testUserId);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('periodStart');
      expect(history[0]).toHaveProperty('periodEnd');
      expect(history[0]).toHaveProperty('emailsSent');
      expect(history[0]).toHaveProperty('emailsReceived');
      expect(history[0]).toHaveProperty('aiSuggestions');
    });
  });
});

