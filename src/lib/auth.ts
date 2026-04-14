import crypto from 'crypto';

/**
 * Lightweight auth layer for the admin surface.
 *
 * Design goals:
 *  - Zero new deps (uses Node's built-in crypto).
 *  - Gracefully falls back to "open" mode when nothing is configured, so
 *    local dev keeps working without a .env file.
 *  - Supports two credential types:
 *      1. HMAC-signed session cookie after a Google OAuth flow (for the
 *         /admin UI). Only emails in ADMIN_EMAILS are accepted.
 *      2. Static Bearer token (ADMIN_API_TOKEN) for external AI callers
 *         that can't do a browser OAuth dance.
 */

export const SESSION_COOKIE_NAME = 'pathoatlas-admin-session';
export const OAUTH_STATE_COOKIE = 'pathoatlas-oauth-state';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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

/** Sign a Google email into an opaque session cookie value. */
export function signSession(email: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${email}|${expires}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${hmac}`;
}

/** Verify a session cookie and return the email if valid + email still allow-listed. */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const [payloadB64, receivedHmac] = token.split('.');
    if (!payloadB64 || !receivedHmac) return null;
    const expected = crypto
      .createHmac('sha256', getSigningSecret())
      .update(payloadB64)
      .digest('base64url');
    // Constant-time comparison to resist timing attacks.
    const a = Buffer.from(receivedHmac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = Buffer.from(payloadB64, 'base64url').toString();
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
 * Resolve the canonical origin for the current request. Critical for OAuth
 * flows: the redirect_uri we hand to Google must **exactly** match what's
 * registered in Google Cloud Console, and behind a TLS-terminating proxy
 * the naive `new URL(request.url).origin` picks up `http://localhost:3000`
 * or the proxy's internal host instead of the public domain.
 *
 * Precedence (highest first):
 *   1. APP_URL env var — explicit, authoritative, works with any proxy stack.
 *      Always prefer this in production.
 *   2. X-Forwarded-Proto + X-Forwarded-Host — standard reverse-proxy pattern.
 *   3. X-Forwarded-Proto + Host header — partial header setup.
 *   4. new URL(request.url).origin — local dev with no proxy.
 */
export function getCanonicalOrigin(request: Request): string {
  // 1. Hard override via env var.
  const envUrl = process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // 2 & 3. Trust reverse-proxy headers when present.
  const proto = request.headers.get('x-forwarded-proto');
  const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (proto && fwdHost) {
    return `${proto}://${fwdHost}`;
  }
  if (fwdHost && fwdHost !== 'localhost' && !fwdHost.startsWith('127.')) {
    // Host header looks public but proxy didn't set proto — assume https.
    return `https://${fwdHost}`;
  }

  // 4. Local dev fallback.
  return new URL(request.url).origin;
}

/**
 * Decide whether a request is allowed to hit an admin endpoint.
 * Returns the email (session) or '__api_token__' (bearer) when allowed,
 * or null when rejected.
 */
export function authorize(req: { headers: Headers; cookies?: { get(name: string): { value: string } | undefined } }): string | null {
  // Dev mode: no auth configured, everything is open. Keeps local work fast.
  if (!isAuthEnabled()) return 'dev-mode';

  // 1. Session cookie (browser admin UI)
  const cookieVal = req.cookies?.get(SESSION_COOKIE_NAME)?.value;
  const sessionEmail = verifySession(cookieVal);
  if (sessionEmail) return sessionEmail;

  // 2. Bearer token (programmatic callers such as AI tools)
  const bearer = extractBearerToken(req.headers);
  const apiToken = getApiToken();
  if (bearer && apiToken && crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(apiToken))) {
    return '__api_token__';
  }

  return null;
}
