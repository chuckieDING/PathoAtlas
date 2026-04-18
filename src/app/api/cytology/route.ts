import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDataDir } from '@/lib/dataDir';

interface CytologySystem {
  id: string;
  nameZh: string;
  nameEn: string;
  description: string;
  categories: Array<{
    id: string;
    nameZh: string;
    nameEn: string;
    criteria: string;
    malignancyRisk: string;
    management: string;
    notes: string;
  }>;
}

let cachedSystems: CytologySystem[] | null = null;

export async function GET() {
  try {
    if (!cachedSystems) {
      const filePath = join(getDataDir(), 'cytology.json');
      const data = await readFile(filePath, 'utf-8');
      cachedSystems = JSON.parse(data);
    }
    return Response.json(cachedSystems);
  } catch {
    return Response.json(
      { error: '无法加载细胞病理学数据' },
      { status: 500 }
    );
  }
}
