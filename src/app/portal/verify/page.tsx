'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setError('Invalid link'); setVerifying(false); return; }

    fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('portal_token', data.token);
          router.push('/portal');
        } else {
          setError('This link has expired or already been used. Please request a new one.');
          setVerifying(false);
        }
      })
      .catch(() => {
        setError('Something went wrong.');
        setVerifying(false);
      });
  }, [searchParams, router]);

  return (
    <>
      {verifying ? (
        <div>
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Logging you in...</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8">
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <a href="/portal/login" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">Request a new link</a>
        </div>
      )}
    </>
  );
}

export default function PortalVerify() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-6 overflow-hidden p-1.5">
          <img src="/images/Logo.png" alt="TruePath Studios" className="w-full h-full object-contain brightness-0 invert" />
        </div>
        <Suspense fallback={
          <div>
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Logging you in...</p>
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
