import { NextResponse } from 'next/server';
import { getMarkersWithOrgans } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getMarkersWithOrgans());
}
