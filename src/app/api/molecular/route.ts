import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDataDir } from '@/lib/dataDir';

interface MolecularMarker {
  id: string;
  geneSymbol: string;
  nameZh: string;
  nameEn: string;
  category: string;
  description: string;
  variants: Array<{ name: string; nameZh: string; frequency: string; significance: string }>;
  associatedTumors: string[];
  detectionMethods: Array<{ method: string; sensitivity: string; turnaround: string; notes: string }>;
  companionDiagnostics: Array<{ drug: string; indication: string; regulatoryStatus: string; line: string }>;
  tcgaSubtypes: string[];
  clinicalSignificance: string;
  references: string[];
}

let cachedMarkers: MolecularMarker[] | null = null;

export async function GET() {
  try {
    if (!cachedMarkers) {
      const filePath = join(getDataDir(), 'molecular.json');
      const data = await readFile(filePath, 'utf-8');
      cachedMarkers = JSON.parse(data);
    }
    return Response.json(cachedMarkers);
  } catch {
    return Response.json({ error: '无法加载分子病理数据' }, { status: 500 });
  }
}
