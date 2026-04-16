import { readFile } from 'fs/promises';
import { join } from 'path';

let cachedProtocols: unknown[] | null = null;

export async function GET() {
  try {
    if (!cachedProtocols) {
      const filePath = join(process.cwd(), 'data', 'grossing.json');
      const data = await readFile(filePath, 'utf-8');
      cachedProtocols = JSON.parse(data);
    }
    return Response.json(cachedProtocols);
  } catch {
    return Response.json({ error: '无法加载取材规范数据' }, { status: 500 });
  }
}
