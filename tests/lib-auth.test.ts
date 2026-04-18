/**
 * Tests for src/lib/auth.ts — session signing/verification, bearer extraction.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  signSession, verifySession, extractBearerToken,
  isAuthEnabled, isGoogleConfigured, getAdminEmails, getApiToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

// ── Environment helpers ──────────────────────────────────────

describe('auth config', () => {
  it('isGoogleConfigured returns false without env', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleConfigured()).toBe(false);
  });

  it('isAuthEnabled returns false without env', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.ADMIN_API_TOKEN;
    expect(isAuthEnabled()).toBe(false);
  });

  it('getAdminEmails returns empty array without env', () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
  });

  it('getApiToken returns empty string without env', () => {
    delete process.env.ADMIN_API_TOKEN;
    expect(getApiToken()).toBe('');
  });

  it('SESSION_COOKIE_NAME is defined', () => {
    expect(SESSION_COOKIE_NAME).toBeTruthy();
  });
});

// ── Session signing & verification ───────────────────────────

describe('signSession / verifySession', () => {
  it('signs and verifies a valid session', async () => {
    const token = await signSession('test@example.com');
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    // With no ADMIN_EMAILS set, any email is allowed
    delete process.env.ADMIN_EMAILS;
    const email = await verifySession(token);
    expect(email).toBe('test@example.com');
  });

  it('rejects null/undefined tokens', async () => {
    expect(await verifySession(null)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession('')).toBeNull();
  });

  it('rejects tampered tokens', async () => {
    const token = await signSession('test@example.com');
    const tampered = token.slice(0, -3) + 'xyz';
    expect(await verifySession(tampered)).toBeNull();
  });

  it('rejects malformed tokens (no dot)', async () => {
    expect(await verifySession('nodot')).toBeNull();
  });

  it('rejects when email not in allow-list', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    const token = await signSession('other@example.com');
    const result = await verifySession(token);
    expect(result).toBeNull();
    delete process.env.ADMIN_EMAILS;
  });

  it('allows when email is in allow-list', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,other@example.com';
    const token = await signSession('admin@example.com');
    const result = await verifySession(token);
    expect(result).toBe('admin@example.com');
    delete process.env.ADMIN_EMAILS;
  });
});

// ── Bearer token extraction ──────────────────────────────────

describe('extractBearerToken', () => {
  it('extracts Bearer token', () => {
    const headers = new Headers({ Authorization: 'Bearer my-secret-token' });
    expect(extractBearerToken(headers)).toBe('my-secret-token');
  });

  it('is case insensitive', () => {
    const headers = new Headers({ Authorization: 'bearer TOKEN123' });
    expect(extractBearerToken(headers)).toBe('TOKEN123');
  });

  it('returns null for missing header', () => {
    const headers = new Headers();
    expect(extractBearerToken(headers)).toBeNull();
  });

  it('returns null for non-Bearer auth', () => {
    const headers = new Headers({ Authorization: 'Basic abc123' });
    expect(extractBearerToken(headers)).toBeNull();
  });
});
