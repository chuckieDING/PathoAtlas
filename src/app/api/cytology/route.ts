import { readFileSync } from 'fs';
import { join } from 'path';

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

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'cytology.json');
    const data = readFileSync(filePath, 'utf-8');
    const systems: CytologySystem[] = JSON.parse(data);
    return Response.json(systems);
  } catch (error) {
    return Response.json(
      { error: '无法加载细胞病理学数据', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
