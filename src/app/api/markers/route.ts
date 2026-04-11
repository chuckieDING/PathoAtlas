import { NextResponse } from 'next/server';
import { getMarkers } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getMarkers());
}
