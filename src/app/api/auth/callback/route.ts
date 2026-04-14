import { NextResponse } from 'next/server';
import { signSession, getAdminEmails, SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE, getCanonicalOrigin } from '@/lib/auth';

/**
 * Handles the Google OAuth redirect. Verifies the CSRF state, swaps the
 * authorization code for tokens at Google's endpoint, decodes the
 * id_token to pull out the user's email, enforces the admin allow-list,
 * and finally sets a signed session cookie before bouncing back to the
 * originally requested URL.
 *
 * All failure modes redirect back to /admin with an `auth_error` query
 * so the admin UI can render a human-friendly message.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Always use canonical origin (APP_URL env var when set) so the
  // redirect_uri we send to Google matches what's registered in GCP
  // regardless of how many reverse proxies we're behind.
  const origin = getCanonicalOrigin(request);
  const failureRedirect = (reason: string, extra?: string) =>
    NextResponse.redirect(
      `${origin}/admin?auth_error=${encodeURIComponent(reason)}${extra ? `&email=${encodeURIComponent(extra)}` : ''}`,
    );

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const err = searchParams.get('error');
  if (err) return failureRedirect(err);
  if (!code || !state) return failureRedirect('missing_code_or_state');

  // CSRF check: cookie-held state must equal the one Google echoed back.
  const stateCookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split('=')[1];
  if (!stateCookie || decodeURIComponent(stateCookie) !== state) {
    return failureRedirect('state_mismatch');
  }

  // Recover the original returnTo path that was packed into state.
  let returnTo = '/admin';
  try {
    const encoded = state.split(':')[1];
    const decoded = Buffer.from(encoded, 'base64url').toString();
    if (decoded.startsWith('/')) returnTo = decoded;
  } catch {
    /* ignore and fall back */
  }

  // Exchange code for tokens against Google's token endpoint.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return failureRedirect('token_exchange_failed');
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return failureRedirect('no_id_token');

  // Decode the id_token payload. We trust Google since we hit their HTTPS
  // token endpoint directly with our client secret — no signature check
  // needed for this trust flow.
  let email: string | undefined;
  try {
    const payloadB64 = tokens.id_token.split('.')[1];
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    ) as { email?: string; email_verified?: boolean };
    if (payload.email_verified === false) return failureRedirect('email_not_verified');
    email = payload.email;
  } catch {
    return failureRedirect('invalid_id_token');
  }
  if (!email) return failureRedirect('no_email');

  // Enforce the admin allow-list. If no list is configured we refuse
  // sign-in entirely — without an allow-list, enabling OAuth would
  // paradoxically open the admin to any Google user.
  const allowed = getAdminEmails();
  if (allowed.length === 0) return failureRedirect('no_admin_emails_configured');
  if (!allowed.includes(email.toLowerCase())) {
    return failureRedirect('not_authorized', email);
  }

  const session = signSession(email);
  const res = NextResponse.redirect(`${origin}${returnTo}`);
  res.cookies.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  // One-shot state cookie is consumed — clear it.
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
