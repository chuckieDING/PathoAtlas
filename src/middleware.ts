import { NextResponse, NextRequest } from 'next/server';
import { authorize } from '@/lib/auth';

/**
 * Server-side gate for the admin API. The /admin page itself is client-side
 * rendered and checks auth via /api/auth/me, so we only need to lock down
 * the HTTP endpoints that mutate data or expose upload handlers.
 *
 * When auth is not configured (no GOOGLE_CLIENT_ID and no ADMIN_API_TOKEN),
 * `authorize()` returns a truthy "dev-mode" marker and the request passes
 * through unmodified — local dev keeps working out of the box.
 */
export function middleware(request: NextRequest) {
  const identity = authorize({
    headers: request.headers,
    cookies: request.cookies,
  });
  if (identity) return NextResponse.next();

  return NextResponse.json(
    {
      error: 'unauthorized',
      hint: '需要登录：浏览器访问 /admin 或通过 Authorization: Bearer <ADMIN_API_TOKEN> 调用 API。',
    },
    { status: 401 },
  );
}

// Only run middleware on admin mutation endpoints.
export const config = {
  matcher: ['/api/admin/:path*'],
};
