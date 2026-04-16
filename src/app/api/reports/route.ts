import { readFile } from 'fs/promises';
import { join } from 'path';

let cachedTemplates: unknown[] | null = null;

export async function GET() {
  try {
    if (!cachedTemplates) {
      const filePath = join(process.cwd(), 'data', 'synoptic-templates.json');
      const data = await readFile(filePath, 'utf-8');
      cachedTemplates = JSON.parse(data);
    }
    return Response.json(cachedTemplates);
  } catch {
    return Response.json({ error: '无法加载报告模板数据' }, { status: 500 });
  }
}
