import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Accepts a multipart/form-data upload with a single `file` field and
 * optional `scope` (e.g. "diseases/lung-adenocarcinoma"). The file is
 * persisted under `public/uploads/<scope>/<timestamp>-<safe-name>` and the
 * returned URL can be used directly in JSON data as an image `url` /
 * `fullUrl` field.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const scope = (form.get('scope') as string | null)?.trim() || 'misc';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'missing file field' }, { status: 400 });
    }

    // Sanitize: keep scope within a single-level directory to avoid traversal.
    const safeScope = scope.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\.{2,}/g, '').replace(/^\/+|\/+$/g, '');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const fileName = `${Date.now()}-${safeName || 'upload'}`;

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = path.join(uploadsRoot, safeScope);
    // Guard: resolved path must stay under uploadsRoot.
    if (!path.resolve(targetDir).startsWith(path.resolve(uploadsRoot))) {
      return NextResponse.json({ error: 'invalid scope' }, { status: 400 });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const diskPath = path.join(targetDir, fileName);
    fs.writeFileSync(diskPath, buffer);

    const publicUrl = `/uploads/${safeScope ? safeScope + '/' : ''}${fileName}`;
    return NextResponse.json({
      ok: true,
      url: publicUrl,
      size: buffer.length,
      type: file.type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
