import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// sharp is a transitive dep of Next.js so it's already on disk, but we still
// guard the import so non-image uploads (PDFs) never pay the cost of loading
// it, and so a platform where sharp's native binding is missing doesn't
// break the whole upload endpoint.
type SharpModule = typeof import('sharp');
let sharpModule: SharpModule | null | undefined;
async function loadSharp(): Promise<SharpModule | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = (await import('sharp')).default as unknown as SharpModule;
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

// Thumbnail generation parameters. 1200px long edge is enough for the
// in-page gallery grid while keeping file size under ~150KB for most
// pathology photos. Adjust if you want sharper thumbnails at the cost of
// bandwidth on first render.
const THUMB_MAX_DIMENSION = 1200;
const THUMB_JPEG_QUALITY = 82;

// MIME types we know sharp can downsize. GIF is excluded because shrinking
// an animated GIF drops the animation; we'd rather keep the original.
const THUMBNAILABLE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

/**
 * Accepts a multipart/form-data upload with:
 *  - `file`  (required)  the file to store
 *  - `scope` (optional)  single-level subdirectory under public/uploads/
 *
 * Behavior:
 *  - **Image files** (PNG/JPEG/WebP/AVIF/TIFF/HEIC): the original is saved
 *    as-is, and sharp generates a JPEG thumbnail (<= THUMB_MAX_DIMENSION px
 *    on the long edge, JPEG quality 82). The response returns BOTH URLs so
 *    the admin UI can drop them into `{ url, fullUrl }` without the user
 *    having to upload twice.
 *  - **Other files** (PDF, gif, everything else): stored as-is, response
 *    returns just `url` and leaves `fullUrl` unset.
 *  - If sharp is unavailable for any reason, the upload still succeeds but
 *    no thumbnail is generated (url === fullUrl).
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
    const baseName = `${Date.now()}-${safeName || 'upload'}`;

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = path.join(uploadsRoot, safeScope);
    // Guard: resolved path must stay under uploadsRoot.
    if (!path.resolve(targetDir).startsWith(path.resolve(uploadsRoot))) {
      return NextResponse.json({ error: 'invalid scope' }, { status: 400 });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Always save the original.
    const originalPath = path.join(targetDir, baseName);
    fs.writeFileSync(originalPath, buffer);
    const originalUrl = `/uploads/${safeScope ? safeScope + '/' : ''}${baseName}`;

    // 2. If this is an image sharp can handle, generate a JPEG thumbnail.
    let thumbnailUrl: string | null = null;
    let thumbnailSize: number | null = null;
    const mime = (file.type || '').toLowerCase();
    if (THUMBNAILABLE.has(mime)) {
      const sharp = await loadSharp();
      if (sharp) {
        try {
          const thumbBuffer = await sharp(buffer)
            .rotate() // respect EXIF orientation
            .resize({
              width: THUMB_MAX_DIMENSION,
              height: THUMB_MAX_DIMENSION,
              fit: 'inside',
              withoutEnlargement: true, // don't upscale smaller originals
            })
            .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
            .toBuffer();

          // Write the thumbnail next to the original with a .thumb.jpg suffix.
          const dot = baseName.lastIndexOf('.');
          const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
          const thumbName = `${stem}.thumb.jpg`;
          const thumbPath = path.join(targetDir, thumbName);
          fs.writeFileSync(thumbPath, thumbBuffer);

          thumbnailUrl = `/uploads/${safeScope ? safeScope + '/' : ''}${thumbName}`;
          thumbnailSize = thumbBuffer.length;
        } catch (err) {
          // If sharp fails on a specific image (corrupt, unsupported codec),
          // fall back silently — the original is already saved.
          console.error('thumbnail generation failed', err);
        }
      }
    }

    // Blow away the Next.js public assets cache so the new file is served
    // immediately without a process restart.
    revalidatePath('/uploads', 'layout');

    return NextResponse.json({
      ok: true,
      url: thumbnailUrl || originalUrl,   // what to show in the gallery grid
      fullUrl: originalUrl,               // always the original, for lightbox
      thumbnail: thumbnailUrl,            // explicit flag: was a thumbnail generated?
      size: buffer.length,
      thumbnailSize,
      type: file.type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
