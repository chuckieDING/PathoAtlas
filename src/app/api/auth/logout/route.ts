import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, USER_SESSION_COOKIE_NAME } from '@/lib/auth';

/** Clears both user and admin session cookies. Idempotent. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = { httpOnly: true, path: '/', maxAge: 0 };
  res.cookies.set(SESSION_COOKIE_NAME, '', opts);
  res.cookies.set(USER_SESSION_COOKIE_NAME, '', opts);
  return res;
}
