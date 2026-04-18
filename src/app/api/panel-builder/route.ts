import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/dataDir';

export async function GET() {
  const filePath = path.join(getDataDir(), 'panel-builder.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return NextResponse.json(data);
}
