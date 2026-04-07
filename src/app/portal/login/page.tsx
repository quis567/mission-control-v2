'use client';

import { useState } from 'react';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      if (res.ok) setSent(true);
      else setError('Something went wrong. Please try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-6 overflow-hidden p-1.5">
            <img src="/images/Logo.png" alt="TruePath Studios" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <div className="glass rounded-2xl p-8">
            <div className="w-14 h-14 rounded-full bg-emerald-400/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-white/50 text-sm">We sent a login link to <span className="text-white/70">{email}</span>. Click it to access your portal.</p>
            <p className="text-white/30 text-xs mt-4">Link expires in 15 minutes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-4 overflow-hidden p-1.5">
            <img src="/images/Logo.png" alt="TruePath Studios" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <h1 className="text-xl font-bold text-white">Client Portal</h1>
          <p className="text-white/50 text-sm mt-2">Enter your email to receive a login link</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={sending || !email}
            className="w-full py-3 rounded-xl bg-accent text-black font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Sending...
              </>
            ) : 'Send Login Link'}
          </button>
        </form>
        <p className="text-center text-white/20 text-xs mt-4">Powered by TruePath Studios</p>
      </div>
    </div>
  );
}
