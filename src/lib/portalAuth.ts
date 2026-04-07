'use client';

import { useState, useEffect, useCallback } from 'react';

interface PortalClient {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  slug: string | null;
}

export function usePortalAuth() {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const token = localStorage.getItem('portal_token');
    if (!token) { setLoading(false); return; }

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session', token }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
      } else {
        localStorage.removeItem('portal_token');
      }
    } catch {
      localStorage.removeItem('portal_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const logout = () => {
    localStorage.removeItem('portal_token');
    setClient(null);
    window.location.href = '/portal/login';
  };

  return { client, loading, logout };
}

export function portalFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('portal_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-portal-token': token || '',
    },
  });
}
