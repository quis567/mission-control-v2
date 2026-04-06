'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

const CHANGE_TYPES = [
  'Phone number',
  'Address',
  'Business hours',
  'Add photo(s)',
  'Remove photo(s)',
  'Swap a photo',
  'Change text / copy',
  'Add a new blog post',
  'Add a service',
  'Remove a service',
  'Update pricing',
  'Other',
];

const PAGE_LOCATIONS = [
  'Home page',
  'About page',
  'Services page',
  'Contact page',
  'Gallery / Portfolio',
  'Blog',
  'Header / Footer (sitewide)',
  'Entire site',
  'Not sure',
];

export default function ClientRequestForm() {
  const { slug } = useParams<{ slug: string }>();
  const [client, setClient] = useState<{ id: string; businessName: string; contactName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [changeType, setChangeType] = useState('');
  const [pageLocation, setPageLocation] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('normal');

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/request/${slug}`);
      if (res.ok) {
        setClient(await res.json());
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeType || !pageLocation || !details) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/request/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeType, pageLocation, details, priority }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-white/50">This request link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-400/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Got it!</h2>
          <p className="text-white/60">We&apos;ll take care of this and let you know when it&apos;s done.</p>
          <button
            onClick={() => { setSubmitted(false); setChangeType(''); setPageLocation(''); setDetails(''); setPriority('normal'); }}
            className="mt-6 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-4 overflow-hidden p-1.5">
            <img src="/images/Logo.png" alt="TruePath Studios" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <h1 className="text-xl font-bold text-white">{client?.businessName}</h1>
          <p className="text-white/50 text-sm mt-2 max-w-sm mx-auto">
            Need something updated on your website? Fill this out and we&apos;ll take care of it — most changes are done within 24 hours.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
          {/* Change Type */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">What do you need changed?</label>
            <select
              value={changeType}
              onChange={e => setChangeType(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
            >
              <option value="" className="bg-[#1a1a2e]">Select a change type...</option>
              {CHANGE_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>)}
            </select>
          </div>

          {/* Page Location */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Where on the site?</label>
            <select
              value={pageLocation}
              onChange={e => setPageLocation(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
            >
              <option value="" className="bg-[#1a1a2e]">Select a page...</option>
              {PAGE_LOCATIONS.map(p => <option key={p} value={p} className="bg-[#1a1a2e]">{p}</option>)}
            </select>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">What&apos;s the new content?</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
              rows={4}
              placeholder="Example: Change phone number from (347) 555-0000 to (347) 555-1234. It shows in the header, footer, and contact page."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">How urgent is this?</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                priority === 'normal' ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}>
                <input type="radio" name="priority" value="normal" checked={priority === 'normal'} onChange={() => setPriority('normal')} className="sr-only" />
                <span className="text-sm font-medium">Normal</span>
                <span className="text-xs text-white/30">24-48 hrs</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                priority === 'urgent' ? 'border-red-400/50 bg-red-400/10 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}>
                <input type="radio" name="priority" value="urgent" checked={priority === 'urgent'} onChange={() => setPriority('urgent')} className="sr-only" />
                <span className="text-sm font-medium">Urgent</span>
                <span className="text-xs text-white/30">Same day</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !changeType || !pageLocation || !details}
            className="w-full py-3 rounded-xl bg-accent text-black font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-4">Powered by TruePath Studios</p>
      </div>
    </div>
  );
}
