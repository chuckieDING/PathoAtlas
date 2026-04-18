'use client';

import { useSearchParams } from 'next/navigation';
import { IconDna } from '@/components/Icon';
import { Suspense } from 'react';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('auth_error');
  const returnTo = searchParams.get('returnTo') || '/';

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8 text-center"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <IconDna size={32} style={{ color: 'var(--accent)' }} />
          <span className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
            Patho<span style={{ color: 'var(--accent)' }}>Atlas</span>
          </span>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
          病理学互动学习平台
        </p>

        {authError && (
          <div
            className="rounded-lg px-4 py-3 text-sm mb-6 text-left"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            登录失败：{authError === 'email_not_verified' ? '邮箱未验证' :
              authError === 'token_exchange_failed' ? 'Google 授权交换失败' :
              authError === 'state_mismatch' ? '安全验证失败，请重试' :
              authError}
          </div>
        )}

        <a
          href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-colors w-full justify-center"
          style={{
            background: 'var(--card-hover)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            textDecoration: 'none',
          }}
        >
          <GoogleIcon size={20} />
          使用 Google 账号登录
        </a>

        <p className="text-xs mt-6" style={{ color: 'var(--fg-muted)' }}>
          登录即表示同意使用 Google 账号访问本平台
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>
        加载中...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
