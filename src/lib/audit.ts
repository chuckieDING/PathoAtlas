import fs from 'fs';
import path from 'path';
import { getDataDir } from './dataDir';

const AUDIT_LOG_PATH = path.join(getDataDir(), 'audit-log.jsonl');

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  organ?: string;
  diff?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Compute a shallow diff between the old and new record.
 * Only includes fields that actually changed.
 */
export function computeDiff(
  oldRecord: Record<string, unknown> | null,
  newRecord: Record<string, unknown> | null,
): Record<string, { old: unknown; new: unknown }> | undefined {
  if (!oldRecord || !newRecord) return undefined;
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);
  for (const key of allKeys) {
    // Skip non-editable meta fields
    if (key === 'id' || key === 'organ') continue;
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    if (oldStr !== newStr) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined;
}

/**
 * Append a single audit entry to the JSONL file.
 * Creates the file if it does not exist.
 */
export function appendAuditLog(entry: AuditEntry): void {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf-8');
}

/**
 * Read the audit log and return entries as an array (most recent first).
 * Returns an empty array if the file does not exist.
 */
export function readAuditLog(): AuditEntry[] {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
  const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: AuditEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  // Most recent first
  entries.reverse();
  return entries;
}
