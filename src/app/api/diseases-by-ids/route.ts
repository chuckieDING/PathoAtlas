import { NextResponse } from 'next/server';
import { getAllDiseases } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);
  const all = getAllDiseases();
  const results = ids.map(id => all.find(d => d.id === id)).filter(Boolean)
    .map(d => ({ id: d!.id, nameZh: d!.nameZh, nameEn: d!.nameEn, organ: d!.organ }));
  return NextResponse.json(results);
}
