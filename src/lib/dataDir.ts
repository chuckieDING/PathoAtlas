import fs from 'fs';
import path from 'path';

const SEED_DIR = path.join(process.cwd(), 'data');
const RUNTIME_DIR = path.join(process.cwd(), 'data-runtime');

let seeded = false;

/**
 * Copy seed data to runtime directory on first access.
 * Only copies files that don't already exist in runtime, so
 * admin edits and user data are preserved across deployments.
 */
function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;

  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }

  copyDirRecursive(SEED_DIR, RUNTIME_DIR);
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip users/ — runtime-only, never seed
      if (entry.name === 'users') continue;
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath);
    } else {
      // Only copy if file doesn't exist in runtime (preserve edits)
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

/**
 * Returns the runtime data directory path.
 * Ensures seed data is copied on first call.
 */
export function getDataDir(): string {
  ensureSeeded();
  return RUNTIME_DIR;
}
