import { NextResponse } from 'next/server';
import { getDifferentials } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getDifferentials());
}
