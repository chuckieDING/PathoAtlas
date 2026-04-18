import { NextResponse } from 'next/server';
import {
  signSession, signUserSession, getAdminEmails, isAdmin,
  SESSION_COOKIE_NAME, USER_SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE,
} from '@/lib/auth';
import { initUserOnLogin } from '@/lib/userStorage';

/**
 * Handles the Google OAuth redirect. Any verified Google user gets a
 * user-session cookie. Users on the ADMIN_EMAILS list additionally
 * get an admin-session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const failureRedirect = (reason: string, extra?: string) =>
    NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent(reason)}${extra ? `&email=${encodeURIComponent(extra)}` : ''}`,
    );

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const err = searchParams.get('error');
  if (err) return failureRedirect(err);
  if (!code || !state) return failureRedirect('missing_code_or_state');

  // CSRF check
  const stateCookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split('=')[1];
  if (!stateCookie || decodeURIComponent(stateCookie) !== state) {
    return failureRedirect('state_mismatch');
  }

  // Recover returnTo
  let returnTo = '/';
  try {
    const encoded = state.split(':')[1];
    const decoded = Buffer.from(encoded, 'base64url').toString();
    if (decoded.startsWith('/')) returnTo = decoded;
  } catch { /* fallback to / */ }

  // Exchange code for tokens
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

  // Decode id_token payload
  let email: string | undefined;
  let name = '';
  let picture = '';
  try {
    const payloadB64 = tokens.id_token.split('.')[1];
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    ) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
    if (payload.email_verified === false) return failureRedirect('email_not_verified');
    email = payload.email;
    name = payload.name || '';
    picture = payload.picture || '';
  } catch {
    return failureRedirect('invalid_id_token');
  }
  if (!email) return failureRedirect('no_email');

  // Initialize user storage on the server
  await initUserOnLogin(email, name, picture);

  // Set user session cookie (for all Google users)
  const userSession = await signUserSession(email, name, picture);
  const res = NextResponse.redirect(`${origin}${returnTo}`);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
  res.cookies.set(USER_SESSION_COOKIE_NAME, userSession, cookieOpts);

  // Additionally set admin session if user is on the admin allow-list
  if (isAdmin(email)) {
    const adminSession = await signSession(email);
    res.cookies.set(SESSION_COOKIE_NAME, adminSession, cookieOpts);
  }

  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
