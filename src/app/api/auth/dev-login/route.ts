import { NextResponse } from 'next/server';
import {
  signUserSession, signSession, isAdmin,
  getAdminEmails, USER_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME,
} from '@/lib/auth';
import { initUserOnLogin } from '@/lib/userStorage';

/**
 * Dev-only auto-login endpoint.
 * Automatically signs in as the first ADMIN_EMAIL (or a fallback dev account)
 * without going through Google OAuth. Only works in non-production.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-login is disabled in production' }, { status: 403 });
  }

  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') || '/';

  // Pick the dev identity: first admin email, or a fallback
  const admins = getAdminEmails();
  const email = admins[0] || 'dev@pathoatlas.local';
  const name = email.split('@')[0];
  const picture = '';

  // Initialize user storage
  await initUserOnLogin(email, name, picture);

  // Sign session cookies
  const userSession = await signUserSession(email, name, picture);
  const cookieOpts = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };

  const res = NextResponse.redirect(`${origin}${returnTo}`);
  res.cookies.set(USER_SESSION_COOKIE_NAME, userSession, cookieOpts);

  if (isAdmin(email)) {
    const adminSession = await signSession(email);
    res.cookies.set(SESSION_COOKIE_NAME, adminSession, cookieOpts);
  }

  return res;
}
