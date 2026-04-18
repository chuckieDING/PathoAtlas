'use client';

import { useEffect, useState } from 'react';

export interface UserInfo {
  email: string;
  name: string;
  picture: string;
  isAdmin: boolean;
}

let cachedUser: UserInfo | null = null;
let fetching: Promise<UserInfo | null> | null = null;

async function fetchUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return { email: data.email, name: data.name, picture: data.picture, isAdmin: data.isAdmin };
  } catch {
    return null;
  }
}

/** Hook that returns the current user. Caches across components. */
export function useUser(): UserInfo | null {
  const [user, setUser] = useState<UserInfo | null>(cachedUser);

  useEffect(() => {
    if (cachedUser) {
      setUser(cachedUser);
      return;
    }
    if (!fetching) {
      fetching = fetchUser().then((u) => {
        cachedUser = u;
        fetching = null;
        return u;
      });
    }
    fetching.then((u) => setUser(u));
  }, []);

  return user;
}

/** Clear cached user (call on logout). */
export function clearUserCache() {
  cachedUser = null;
  fetching = null;
}
