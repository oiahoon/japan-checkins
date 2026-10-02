import {createHmac, timingSafeEqual, randomBytes, createHash} from 'node:crypto';
export type Session = { purpose: 'session' | 'oauth'; sub: string; exp: number; state?: string; verifier?: string; role?: 'admin'|'viewer'; version?: string; provider?: 'password'|'github' };
export const nonce = () => randomBytes(32).toString('base64url');
export const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export function signSession(value: Session, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function verifySession(token: string | undefined, secret: string, purpose: Session['purpose'], owner: string, now = Date.now()): Session | null {
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (value.purpose !== purpose || value.sub !== owner || !Number.isFinite(value.exp) || value.exp <= now) return null;
    return value;
  } catch { return null; }
}
export const sessionCookie = (secure: boolean) => secure ? '__Host-travel-session' : 'travel-session';
export const oauthCookie = (secure: boolean) => secure ? '__Host-travel-oauth' : 'travel-oauth';
