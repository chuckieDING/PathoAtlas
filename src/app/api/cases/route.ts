import { join } from 'path';
import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'cases.json');
    const data = await readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: '无法加载病例数据' }, { status: 500 });
  }
}
