import { describe, it, expect } from 'vitest';
import {
  sanitizePlainText,
  sanitizeLimited,
  safeEmail,
  safeShopDomain,
  clampNumber,
} from '../validation';

describe('Validation utilities', () => {
  describe('sanitizePlainText', () => {
    it('should strip HTML tags', () => {
      expect(sanitizePlainText('<b>Hello</b>')).toBe('Hello');
      expect(sanitizePlainText('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should strip HTML entities', () => {
      expect(sanitizePlainText('Hello&nbsp;World')).toBe('HelloWorld');
      expect(sanitizePlainText('Price&nbsp;&nbsp;100')).toBe('Price100');
    });

    it('should handle null and undefined', () => {
      expect(sanitizePlainText(null)).toBe('');
      expect(sanitizePlainText(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizePlainText('  Hello  ')).toBe('Hello');
    });
  });

  describe('sanitizeLimited', () => {
    it('should limit string length', () => {
      const longString = 'a'.repeat(100);
      expect(sanitizeLimited(longString, 50).length).toBe(50);
    });

    it('should not truncate if within limit', () => {
      expect(sanitizeLimited('Hello', 100)).toBe('Hello');
    });

    it('should handle default max length', () => {
      const longString = 'a'.repeat(10000);
      expect(sanitizeLimited(longString).length).toBe(5000);
    });
  });

  describe('safeEmail', () => {
    it('should validate correct emails', () => {
      expect(safeEmail('test@example.com')).toBe('test@example.com');
      expect(safeEmail('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
    });

    it('should normalize emails to lowercase', () => {
      expect(safeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(safeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(safeEmail('notanemail')).toBeNull();
      expect(safeEmail('@nodomain.com')).toBeNull();
      expect(safeEmail('nodomain@')).toBeNull();
    });

    it('should handle null and undefined', () => {
      expect(safeEmail(null)).toBeNull();
      expect(safeEmail(undefined)).toBeNull();
    });
  });

  describe('safeShopDomain', () => {
    it('should validate correct Shopify domains', () => {
      expect(safeShopDomain('test.myshopify.com')).toBe('test.myshopify.com');
      expect(safeShopDomain('my-shop.myshopify.com')).toBe('my-shop.myshopify.com');
      expect(safeShopDomain('123shop.myshopify.com')).toBe('123shop.myshopify.com');
    });

    it('should normalize to lowercase', () => {
      expect(safeShopDomain('TEST.MYSHOPIFY.COM')).toBe('test.myshopify.com');
    });

    it('should trim whitespace', () => {
      expect(safeShopDomain('  test.myshopify.com  ')).toBe('test.myshopify.com');
    });

    it('should reject invalid domains', () => {
      expect(safeShopDomain('not-shopify.com')).toBeNull();
      expect(safeShopDomain('test.shopify.com')).toBeNull();
      expect(safeShopDomain('testmyshopify.com')).toBeNull();
      expect(safeShopDomain('https://test.myshopify.com')).toBeNull();
    });

    it('should reject domains starting with hyphen', () => {
      expect(safeShopDomain('-test.myshopify.com')).toBeNull();
    });

    it('should handle null and undefined', () => {
      expect(safeShopDomain(null)).toBeNull();
      expect(safeShopDomain(undefined)).toBeNull();
    });
  });

  describe('clampNumber', () => {
    it('should return value within range', () => {
      expect(clampNumber(5, 0, 10)).toBe(5);
      expect(clampNumber(15, 0, 10)).toBe(10);
      expect(clampNumber(-5, 0, 10)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(clampNumber(10, 0, 10)).toBe(10);
      expect(clampNumber(0, 0, 10)).toBe(0);
    });
  });
});

