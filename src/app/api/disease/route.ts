import { NextResponse } from 'next/server';
import { getDisease } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organ = searchParams.get('organ') || '';
  const id = searchParams.get('id') || '';
  const disease = getDisease(organ, id);
  if (!disease) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(disease);
}
