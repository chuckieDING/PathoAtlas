import { NextResponse } from 'next/server';
import { getMarkersWithOrgans } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

// Single-marker lookup. Returns the augmented record (with organs[])
// so the detail page gets the same shape as the list endpoint.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  const markers = getMarkersWithOrgans();
  const marker = markers.find((m) => m.id === id);
  if (!marker) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(marker);
}
