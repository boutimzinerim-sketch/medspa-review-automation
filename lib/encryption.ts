import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('ENCRYPTION_KEY env var is required');
  return crypto.scryptSync(secret, 'reviewflow-salt', 32);
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = cipher.update(text, 'utf-8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  const [ivHex, data] = encrypted.split(':');
  if (!ivHex || !data) throw new Error('Invalid encrypted format');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  return decipher.update(data, 'hex', 'utf-8') + decipher.final('utf-8');
}
