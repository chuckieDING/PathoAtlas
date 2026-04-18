import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyUserSession, USER_SESSION_COOKIE_NAME,
  isAuthEnabled, isGoogleConfigured, isAdmin,
} from '@/lib/auth';

/**
 * Returns the current user identity.
 *
 * Shape:
 *   { email, name, picture, isAdmin }   — signed in
 *   { authRequired: false }             — dev mode (no auth configured)
 *   401 { error: 'unauthenticated' }    — not signed in
 */
export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({
      authRequired: false,
      email: 'dev-mode@local',
      name: 'Dev User',
      picture: '',
      isAdmin: true,
    });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;
  const user = await verifyUserSession(token);
  if (!user) {
    return NextResponse.json(
      {
        error: 'unauthenticated',
        authRequired: true,
        googleConfigured: isGoogleConfigured(),
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authRequired: true,
    email: user.email,
    name: user.name,
    picture: user.picture,
    isAdmin: isAdmin(user.email),
  });
}
