/**
 * Lightweight auth layer for the admin surface.
 *
 * Design goals:
 *  - Zero new deps (uses the Web Crypto API, compatible with Edge Runtime).
 *  - Gracefully falls back to "open" mode when nothing is configured, so
 *    local dev keeps working without a .env file.
 *  - Supports two credential types:
 *      1. HMAC-signed session cookie after a Google OAuth flow (for the
 *         /admin UI). Only emails in ADMIN_EMAILS are accepted.
 *      2. Static Bearer token (ADMIN_API_TOKEN) for external AI callers
 *         that can't do a browser OAuth dance.
 */

export const SESSION_COOKIE_NAME = 'pathoatlas-admin-session';
export const USER_SESSION_COOKIE_NAME = 'pathoatlas-user-session';
export const OAUTH_STATE_COOKIE = 'pathoatlas-oauth-state';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

/** Comma-separated allow-list of Google emails permitted to sign in. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Static token presented via `Authorization: Bearer` by programmatic callers. */
export function getApiToken(): string {
  return process.env.ADMIN_API_TOKEN || '';
}

/** True when Google OAuth credentials are present and should be enforced. */
export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** True when any form of auth is configured; false = open local-dev mode. */
export function isAuthEnabled(): boolean {
  return isGoogleConfigured() || !!getApiToken();
}

function getSigningSecret(): string {
  // AUTH_SECRET is preferred; fall back to GOOGLE_CLIENT_SECRET so users with
  // Google configured but no AUTH_SECRET still get deterministic signing.
  return (
    process.env.AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'pathoatlas-dev-fallback-secret-do-not-use-in-prod'
  );
}

function toBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64url(sig);
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, fromBase64url(signature), encoder.encode(data));
}

/** Constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) result |= aBuf[i] ^ bBuf[i];
  return result === 0;
}

/** Sign a Google email into an opaque session cookie value. */
export async function signSession(email: string): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${email}|${expires}`;
  const payloadB64 = toBase64url(encoder.encode(payload).buffer as ArrayBuffer);
  const hmac = await hmacSign(payloadB64);
  return `${payloadB64}.${hmac}`;
}

/** Verify a session cookie and return the email if valid + email still allow-listed. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const [payloadB64, receivedHmac] = token.split('.');
    if (!payloadB64 || !receivedHmac) return null;
    const valid = await hmacVerify(payloadB64, receivedHmac);
    if (!valid) return null;
    const payload = new TextDecoder().decode(fromBase64url(payloadB64));
    const [email, expiresStr] = payload.split('|');
    const expires = parseInt(expiresStr, 10);
    if (!email || Number.isNaN(expires) || expires < Date.now()) return null;
    // Re-check allow-list on every verification so revoking an email takes
    // effect immediately without waiting for the cookie to expire.
    const allowed = getAdminEmails();
    if (allowed.length > 0 && !allowed.includes(email.toLowerCase())) return null;
    return email;
  } catch {
    return null;
  }
}

/** Extract `Bearer <token>` from an Authorization header. */
export function extractBearerToken(headers: Headers): string | null {
  const h = headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Decide whether a request is allowed to hit an admin endpoint.
 * Returns the email (session) or '__api_token__' (bearer) when allowed,
 * or null when rejected.
 */
export async function authorize(req: { headers: Headers; cookies?: { get(name: string): { value: string } | undefined } }): Promise<string | null> {
  // Dev mode: no auth configured, everything is open. Keeps local work fast.
  if (!isAuthEnabled()) return 'dev-mode';

  // 1. Session cookie (browser admin UI)
  const cookieVal = req.cookies?.get(SESSION_COOKIE_NAME)?.value;
  const sessionEmail = await verifySession(cookieVal);
  if (sessionEmail) return sessionEmail;

  // 2. Bearer token (programmatic callers such as AI tools)
  const bearer = extractBearerToken(req.headers);
  const apiToken = getApiToken();
  if (bearer && apiToken && timingSafeEqual(bearer, apiToken)) {
    return '__api_token__';
  }

  return null;
}

// ── User Session (for all Google users, not just admins) ─────

export interface UserSessionPayload {
  email: string;
  name: string;
  picture: string;
}

/** Sign a user session cookie containing profile info. */
export async function signUserSession(email: string, name: string, picture: string): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${email}|${name}|${picture}|${expires}`;
  const payloadB64 = toBase64url(encoder.encode(payload).buffer as ArrayBuffer);
  const hmac = await hmacSign(payloadB64);
  return `${payloadB64}.${hmac}`;
}

/** Verify a user session cookie. Returns profile info or null. No admin allow-list check. */
export async function verifyUserSession(token: string | undefined | null): Promise<UserSessionPayload | null> {
  if (!token) return null;
  try {
    const [payloadB64, receivedHmac] = token.split('.');
    if (!payloadB64 || !receivedHmac) return null;
    const valid = await hmacVerify(payloadB64, receivedHmac);
    if (!valid) return null;
    const payload = new TextDecoder().decode(fromBase64url(payloadB64));
    const parts = payload.split('|');
    if (parts.length < 4) return null;
    const expires = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(expires) || expires < Date.now()) return null;
    const email = parts[0];
    const name = parts[1];
    const picture = parts.slice(2, parts.length - 1).join('|');
    if (!email) return null;
    return { email, name, picture };
  } catch {
    return null;
  }
}

/** Check if an email is in the admin allow-list. */
export function isAdmin(email: string): boolean {
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
