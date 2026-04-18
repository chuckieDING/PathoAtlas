import { NextResponse, NextRequest } from 'next/server';
import { authorize, verifyUserSession, USER_SESSION_COOKIE_NAME, isAuthEnabled } from '@/lib/auth';

/**
 * Site-wide auth gate.
 *
 * - /api/admin/* → admin authorization (existing logic, unchanged)
 * - /api/user/*  → user session required (401 if not logged in)
 * - /api/auth/*, /login, /_next/*, static assets → pass through
 * - All other page routes → redirect to /login if no user session
 *
 * In dev mode (no auth configured), everything passes through.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin API routes — keep existing admin authorization
  if (pathname.startsWith('/api/admin/')) {
    const identity = await authorize({
      headers: request.headers,
      cookies: request.cookies,
    });
    if (identity) return NextResponse.next();
    return NextResponse.json(
      { error: 'unauthorized', hint: '需要管理员权限。' },
      { status: 401 },
    );
  }

  // Dev mode: no auth configured, skip all checks
  if (!isAuthEnabled()) return NextResponse.next();

  // Auth endpoints and login page — always accessible
  if (
    pathname.startsWith('/api/auth/') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Verify user session
  const token = request.cookies.get(USER_SESSION_COOKIE_NAME)?.value;
  const user = await verifyUserSession(token);

  if (!user) {
    // API routes get 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    // Dev mode: auto-login without Google OAuth
    if (process.env.NODE_ENV !== 'production') {
      const devLoginUrl = request.nextUrl.clone();
      devLoginUrl.pathname = '/api/auth/dev-login';
      devLoginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(devLoginUrl);
    }
    // Production: redirect to login page
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (images, diagrams, uploads)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|images/|diagrams/|uploads/).*)',
  ],
};
