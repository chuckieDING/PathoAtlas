import { NextResponse } from 'next/server';
import { getAllDiseases } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getAllDiseases());
}
