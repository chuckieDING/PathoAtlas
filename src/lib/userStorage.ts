import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDataDir } from './dataDir';

const USERS_DIR = path.join(getDataDir(), 'users');

/** Hash email to create a filesystem-safe directory name. */
function emailHash(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

/** Get the directory path for a user. */
export function getUserDir(email: string): string {
  return path.join(USERS_DIR, emailHash(email));
}

/** Ensure the user directory exists. */
export function ensureUserDir(email: string): void {
  const dir = getUserDir(email);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Read a JSON file from the user's directory. Returns defaultValue if not found. */
export function readUserData<T>(email: string, filename: string, defaultValue: T): T {
  const filePath = path.join(getUserDir(email), filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

/** Write a JSON file to the user's directory (atomic: write tmp then rename). */
export function writeUserData(email: string, filename: string, data: unknown): void {
  ensureUserDir(email);
  const filePath = path.join(getUserDir(email), filename);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/** Initialize user storage on first login (or update profile on subsequent logins). */
export async function initUserOnLogin(email: string, name: string, picture: string): Promise<void> {
  ensureUserDir(email);
  const profilePath = path.join(getUserDir(email), 'profile.json');
  const now = new Date().toISOString();

  if (fs.existsSync(profilePath)) {
    // Update lastLoginAt and profile info
    try {
      const existing = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      existing.lastLoginAt = now;
      existing.name = name || existing.name;
      existing.picture = picture || existing.picture;
      fs.writeFileSync(profilePath, JSON.stringify(existing, null, 2), 'utf-8');
    } catch {
      // If corrupt, recreate
      writeProfile(email, name, picture, now, now);
    }
  } else {
    writeProfile(email, name, picture, now, now);
    // Initialize empty data files
    writeUserData(email, 'progress.json', createDefaultProgress());
    writeUserData(email, 'favorites.json', { keys: [], meta: {} });
    writeUserData(email, 'notes.json', {});
  }
}

function writeProfile(email: string, name: string, picture: string, createdAt: string, lastLoginAt: string) {
  writeUserData(email, 'profile.json', { email, name, picture, createdAt, lastLoginAt });
}

function createDefaultProgress() {
  return {
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: '',
    totalXP: 0,
    dailyGoal: 50,
    dailyXPHistory: [],
    diseaseMastery: {},
    markerMastery: {},
    achievements: [],
    totalDiseasesStudied: 0,
    totalCardsReviewed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    createdAt: new Date().toISOString(),
  };
}
