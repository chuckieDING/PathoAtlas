import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { OAUTH_STATE_COOKIE, isGoogleConfigured } from '@/lib/auth';

/**
 * Kicks off Google OAuth. Generates a CSRF state that also encodes the
 * caller's intended return URL, then redirects to Google.
 */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth 未配置：请在环境变量中设置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' },
      { status: 500 },
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') || '/admin';

  // State = random nonce + base64url(returnTo). The callback verifies the
  // nonce against a cookie to block CSRF-based login fixation, then decodes
  // returnTo to bounce the user back where they started.
  const nonce = crypto.randomBytes(16).toString('base64url');
  const state = `${nonce}:${Buffer.from(returnTo).toString('base64url')}`;

  const redirectUri = `${origin}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    // select_account ensures users can switch between Google accounts easily.
    prompt: 'select_account',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  });
  return res;
}
