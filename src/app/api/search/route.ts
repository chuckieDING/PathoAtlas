import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (q.length < 1) return NextResponse.json([]);
  const results = searchAll(q);
  return NextResponse.json(results);
}
