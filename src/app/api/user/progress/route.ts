import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSession, USER_SESSION_COOKIE_NAME, isAuthEnabled } from '@/lib/auth';
import { readUserData, writeUserData } from '@/lib/userStorage';

export const dynamic = 'force-dynamic';

const DEV_EMAIL = 'dev-mode@local';

async function getEmail(): Promise<string | null> {
  if (!isAuthEnabled()) return DEV_EMAIL;
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE_NAME)?.value;
  const user = await verifyUserSession(token);
  return user?.email ?? null;
}

export async function GET() {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const data = readUserData(email, 'progress.json', null);
  return NextResponse.json(data ?? {});
}

export async function PUT(request: Request) {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await request.json();
  writeUserData(email, 'progress.json', body);
  return NextResponse.json({ ok: true });
}
