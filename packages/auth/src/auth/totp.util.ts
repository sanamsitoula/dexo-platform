import * as crypto from 'crypto';

/**
 * RFC 6238 TOTP (and RFC 4226 HOTP) implemented with node:crypto only.
 * SHA1, 6 digits, 30-second time step, ±1 step verification tolerance.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Generate a new random base32 secret (default 20 bytes = 160 bits, per RFC 4226). */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

/** RFC 4226 HOTP: HMAC-SHA1 + dynamic truncation, 6 digits. */
export function hotp(secretBase32: string, counter: number, digits = 6): string {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  // Write the counter as a big-endian 64-bit int (JS-safe for realistic counters)
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    10 ** digits;
  return code.toString().padStart(digits, '0');
}

/** RFC 6238 TOTP for a given unix-ms timestamp (default: now). */
export function totp(secretBase32: string, timeMs = Date.now(), stepSeconds = 30): string {
  return hotp(secretBase32, Math.floor(timeMs / 1000 / stepSeconds));
}

/** Verify a 6-digit TOTP code with ±`window` step tolerance (default ±1 = 90s). */
export function verifyTotp(
  secretBase32: string,
  code: string,
  window = 1,
  timeMs = Date.now(),
  stepSeconds = 30,
): boolean {
  const normalized = (code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(timeMs / 1000 / stepSeconds);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secretBase32, counter + i);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(normalized))) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI for authenticator apps (manual entry or QR encoding). */
export function buildOtpauthUrl(secretBase32: string, accountName: string, issuer = 'Dexo'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
