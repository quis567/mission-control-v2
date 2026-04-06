'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024); // 10MB max
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeType || !pageLocation || !details) return;
    setSubmitting(true);

    try {
      // Upload files first if any
      let uploadedFiles: { name: string; url: string }[] = [];
      if (files.length > 0) {
        setUploading(true);
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const uploadRes = await fetch('/api/request/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          uploadedFiles = data.files;
        }
        setUploading(false);
      }

      const res = await fetch(`/api/request/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType,
          pageLocation,
          details,
          priority,
          files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
      setUploading(false);
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
            onClick={() => { setSubmitted(false); setChangeType(''); setPageLocation(''); setDetails(''); setPriority('normal'); setFiles([]); }}
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

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Upload files <span className="text-white/30 font-normal">(optional)</span></label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 rounded-xl px-4 py-4 text-white/30 text-sm hover:border-white/20 hover:text-white/40 transition-colors"
            >
              <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Tap to upload — JPG, PNG, WebP, PDF (max 10MB)
            </button>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(f)} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <svg className="w-5 h-5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                      <span className="text-xs text-white/50 truncate">{f.name}</span>
                      <span className="text-[10px] text-white/20 shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-white/20 hover:text-red-400 transition-colors shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                {uploading ? 'Uploading files...' : 'Submitting...'}
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
