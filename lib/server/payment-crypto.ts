import crypto from 'node:crypto';

/**
 * Derives a 256-bit encryption key from ENCRYPTION_KEY or JWT_SECRET.
 * Falls back to a deterministic server-only key for development/test environments.
 */
function getMasterEncryptionKey(): Buffer {
  const secret = (process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'tvo-flavours-secure-master-encryption-key-32b').trim();
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * Output format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  // 96-bit random IV recommended for AES-GCM
  const iv = crypto.randomBytes(12);
  const key = getMasterEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag(); // 128-bit authentication tag
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 * Validates the authentication tag to ensure authenticity and integrity.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format: must be iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const key = getMasterEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Masks a Razorpay Key ID for safe UI display.
 * Example: 'rzp_test_1234567890abcdef' -> 'rzp_test_••••cdef'
 */
export function maskKeyId(keyId: string): string {
  if (!keyId) return 'Not Configured';
  const clean = keyId.trim();
  if (clean.length <= 10) return '••••••••';
  const prefix = clean.startsWith('rzp_live_') ? 'rzp_live_' : (clean.startsWith('rzp_test_') ? 'rzp_test_' : clean.slice(0, 8));
  const suffix = clean.slice(-4);
  return `${prefix}••••${suffix}`;
}

/**
 * Validates Razorpay Key ID prefix against selected environment.
 */
export function validateKeyFormat(keyId: string, env: 'test' | 'live'): { valid: boolean; error?: string } {
  const clean = (keyId || '').trim();
  if (!clean) {
    return { valid: false, error: 'Razorpay Key ID is required.' };
  }

  if (env === 'test') {
    if (!clean.startsWith('rzp_test_')) {
      return { valid: false, error: 'In Test Mode, Razorpay Key ID must start with "rzp_test_".' };
    }
  } else if (env === 'live') {
    if (!clean.startsWith('rzp_live_')) {
      return { valid: false, error: 'In Live Mode, Razorpay Key ID must start with "rzp_live_".' };
    }
  }

  if (clean.length < 14) {
    return { valid: false, error: 'Razorpay Key ID is too short.' };
  }

  return { valid: true };
}
