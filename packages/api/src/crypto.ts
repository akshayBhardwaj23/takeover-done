import crypto from 'node:crypto';

const KEY_HEX = process.env.ENCRYPTION_KEY || '';

function getKey(): Buffer | null {
  try {
    if (!KEY_HEX) return null;
    const key = Buffer.from(KEY_HEX, 'hex');
    if (key.length !== 32) return null; // AES-256
    return key;
  } catch {
    return null;
  }
}

export function encryptSecure(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // fallback: store as-is if no key
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecure(ciphertext: string): string {
  const key = getKey();
  if (!key) return ciphertext; // fallback
  const [ivHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !dataHex) return ciphertext;
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

