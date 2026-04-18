import { NextResponse } from 'next/server';
import { getStagingSystems } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getStagingSystems());
}
