import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'grossing.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const protocols = JSON.parse(data);
    return Response.json(protocols);
  } catch (error) {
    return Response.json({ error: 'Failed to load grossing protocols' }, { status: 500 });
  }
}
