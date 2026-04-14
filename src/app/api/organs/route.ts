import { NextResponse } from 'next/server';
import { getOrgans } from '@/lib/data';

// Force dynamic so admin writes are reflected immediately without restart.
export const dynamic = 'force-dynamic';

// Bulk listing of organ systems. The markers page uses this to render the
// "按器官筛选" chip row with proper names, colors and icons without having
// to bundle the organs.json file into the client.
export async function GET() {
  return NextResponse.json(getOrgans());
}
