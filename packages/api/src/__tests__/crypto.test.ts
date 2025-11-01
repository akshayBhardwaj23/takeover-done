import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptSecure, decryptSecure } from '../crypto';

describe('Crypto utilities', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key (32 bytes for AES-256)
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
  });

  afterEach(() => {
    if (originalKey) {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  describe('encryptSecure', () => {
    it('should encrypt plaintext and return hex format', () => {
      const plaintext = 'test-secret-data';
      const encrypted = encryptSecure(plaintext);

      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different output for same input (nonce)', () => {
      const plaintext = 'same-input';
      const encrypted1 = encryptSecure(plaintext);
      const encrypted2 = encryptSecure(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return plaintext when no key is set', () => {
      delete process.env.ENCRYPTION_KEY;
      const plaintext = 'test-data';
      const encrypted = encryptSecure(plaintext);

      expect(encrypted).toBe(plaintext);
    });
  });

  describe('decryptSecure', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'test-secret-data';
      const encrypted = encryptSecure(plaintext);
      const decrypted = decryptSecure(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryptSecure(plaintext);
      const decrypted = decryptSecure(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'test@#$%^&*()_+{}[]|\\:";\'<>?,./';
      const encrypted = encryptSecure(plaintext);
      const decrypted = decryptSecure(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍';
      const encrypted = encryptSecure(plaintext);
      const decrypted = decryptSecure(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return plaintext when no key is set', () => {
      delete process.env.ENCRYPTION_KEY;
      const plaintext = 'test-data';
      const encrypted = encryptSecure(plaintext);
      const decrypted = decryptSecure(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return as-is for invalid format', () => {
      expect(decryptSecure('invalid-format')).toBe('invalid-format');
      expect(decryptSecure('no-colon')).toBe('no-colon');
      expect(decryptSecure(':missing-parts')).toBe(':missing-parts');
    });
  });

  describe('round-trip encryption', () => {
    it('should successfully encrypt and decrypt complex data', () => {
      const testCases = [
        'simple',
        'with spaces',
        'with-special-chars!@#$%',
        '1234567890',
        'A'.repeat(1000), // long string
        'multi\nline\nstring',
        JSON.stringify({ key: 'value', nested: { data: 123 } }),
      ];

      testCases.forEach((plaintext) => {
        const encrypted = encryptSecure(plaintext);
        const decrypted = decryptSecure(encrypted);
        expect(decrypted).toBe(plaintext);
      });
    });
  });
});

