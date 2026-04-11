import { NextResponse } from 'next/server';
import { getOrgan } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  const organ = getOrgan(id);
  if (!organ) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(organ);
}
