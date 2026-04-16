import { join } from 'path';
import { readFileSync } from 'fs';

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

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'frozen-sections.json');
    const data = readFileSync(filePath, 'utf-8');
    const frozen = JSON.parse(data) as FrozenSection[];
    return Response.json(frozen);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch frozen sections' }, { status: 500 });
  }
}
