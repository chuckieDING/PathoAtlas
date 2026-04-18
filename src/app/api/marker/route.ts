import { NextResponse } from 'next/server';
import { getMarkersWithOrgans } from '@/lib/data';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/dataDir';

export const dynamic = 'force-dynamic';

// Single-marker lookup. Checks IHC markers first, then special stains.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';

  // Try IHC markers first
  const markers = getMarkersWithOrgans();
  const marker = markers.find((m) => m.id === id);
  if (marker) return NextResponse.json(marker);

  // Try special stains
  try {
    const stainPath = path.join(getDataDir(), 'special-stains.json');
    if (fs.existsSync(stainPath)) {
      const stains = JSON.parse(fs.readFileSync(stainPath, 'utf-8')) as any[];
      const stain = stains.find((s) => s.id === id);
      if (stain) return NextResponse.json({ ...stain, organs: [], _type: 'special-stain' });
    }
  } catch { /* ignore */ }

  return NextResponse.json(null, { status: 404 });
}
