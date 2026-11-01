import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export interface ResetMail {
  action: 'password-reset';
  requestId: string;
  to: string;
  otp: string;
  issuedAt: number;
  expiresAt: number;
}
export const passwordStamp = (hash: string) =>
  createHash('sha256').update(hash).digest('hex');
export const resetKey = (label: string, value: string, secret: string) =>
  createHmac('sha256', secret).update(`${label}\n${value}`).digest('hex');
export const otpDigest = (id: string, code: string, secret: string) =>
  resetKey('campushr-otp-v1', `${id}:${code}`, secret);
const key = (secret: string) =>
  Buffer.from(
    hkdfSync('sha256', secret, 'campushr-reset-v1', 'mail-encryption', 32),
  );
export function sealResetMail(mail: ResetMail, secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(mail), 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString('base64url'))
    .join('.');
}
export function openResetMail(value: string, secret: string): ResetMail {
  const [iv, tag, encrypted] = value
    .split('.')
    .map((v) => Buffer.from(v, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(secret), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      'utf8',
    ),
  ) as ResetMail;
}
