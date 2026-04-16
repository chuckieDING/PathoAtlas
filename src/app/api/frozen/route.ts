import { join } from 'path';
import { readFile } from 'fs/promises';

interface FrozenSection {
  id: string;
  nameZh: string;
  nameEn: string;
  indication: string;
  clinicalScenario: string;
  intraoperativeApproach: string[];
  diagnosticTrap: string[];
  typicalErrors: string[];
  reportingTemplate: string;
}

let cachedFrozen: FrozenSection[] | null = null;

export async function GET() {
  try {
    if (!cachedFrozen) {
      const filePath = join(process.cwd(), 'data', 'frozen-sections.json');
      const data = await readFile(filePath, 'utf-8');
      cachedFrozen = JSON.parse(data);
    }
    return Response.json(cachedFrozen);
  } catch {
    return Response.json({ error: '无法加载冻存切片数据' }, { status: 500 });
  }
}
