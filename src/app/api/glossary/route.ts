import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/dataDir';

export async function GET() {
  const data = JSON.parse(
    fs.readFileSync(path.join(getDataDir(), 'glossary.json'), 'utf-8')
  );
  return NextResponse.json(data);
}
