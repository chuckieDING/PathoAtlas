import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (q.length < 1) return NextResponse.json([]);
  const results = searchAll(q);
  return NextResponse.json(results);
}
