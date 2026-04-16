import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME, isAuthEnabled, isGoogleConfigured } from '@/lib/auth';

/**
 * Returns the current admin identity, if any. The admin page uses this to
 * decide whether to render the sign-in screen or the editor.
 *
 * Shape:
 *   { authRequired: false, email: null }   // dev mode, no auth configured
 *   { authRequired: true,  email: '...' }  // signed in
 *   401 { error, googleConfigured: bool }  // auth required but not signed in
 */
export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ authRequired: false, email: null });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const email = await verifySession(token);
  if (!email) {
    return NextResponse.json(
      {
        error: 'unauthenticated',
        authRequired: true,
        googleConfigured: isGoogleConfigured(),
      },
      { status: 401 },
    );
  }
  return NextResponse.json({ authRequired: true, email });
}
