import { NextResponse } from 'next/server';
import { getOrgan } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  const organ = getOrgan(id);
  if (!organ) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(organ);
}
