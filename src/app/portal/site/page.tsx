'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalAuth, portalFetch } from '@/lib/portalAuth';

export default function PortalSite() {
  const { client, loading: authLoading } = usePortalAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSite = useCallback(async () => {
    const res = await portalFetch('/api/portal/site');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!client) { router.push('/portal/login'); return; }
    fetchSite();
  }, [client, authLoading, router, fetchSite]);

  if (authLoading || loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const w = data.website;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold text-white mb-1">Site Details</h1>
      <p className="text-white/40 text-sm mb-6">{data.businessName}</p>

      {/* Website info */}
      {w ? (
        <div className="glass rounded-xl p-5 mb-4 space-y-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Website</p>
            <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">{w.url}</a>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/40">Status</p>
              <p className="text-sm text-white/70 mt-0.5 capitalize">{w.status}</p>
            </div>
            {w.cmsPlatform && (
              <div>
                <p className="text-xs text-white/40">Platform</p>
                <p className="text-sm text-white/70 mt-0.5">{w.cmsPlatform}</p>
              </div>
            )}
            {w.hostingProvider && (
              <div>
                <p className="text-xs text-white/40">Hosting</p>
                <p className="text-sm text-white/70 mt-0.5">{w.hostingProvider}</p>
              </div>
            )}
            {w.domainRegistrar && (
              <div>
                <p className="text-xs text-white/40">Domain Registrar</p>
                <p className="text-sm text-white/70 mt-0.5">{w.domainRegistrar}</p>
              </div>
            )}
            {w.domainExpiration && (
              <div>
                <p className="text-xs text-white/40">Domain Expires</p>
                <p className="text-sm text-white/70 mt-0.5">{new Date(w.domainExpiration).toLocaleDateString()}</p>
              </div>
            )}
            {w.launchDate && (
              <div>
                <p className="text-xs text-white/40">Launch Date</p>
                <p className="text-sm text-white/70 mt-0.5">{new Date(w.launchDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-8 text-center text-white/30 text-sm mb-4">No website on file</div>
      )}

      {/* Package */}
      {data.package && (
        <div className="glass rounded-xl p-5 mb-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">Plan</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-white font-medium">{data.package.name}</span>
            <span className="text-sm text-accent">${data.package.price.toLocaleString()}/mo</span>
          </div>
        </div>
      )}

      {/* Active services */}
      {data.services.length > 0 && (
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Active Services</p>
          <div className="space-y-2">
            {data.services.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/70">{s.serviceType}</span>
                <div className="text-right">
                  {s.price && <span className="text-sm text-accent">${s.price}{s.billingType === 'monthly' ? '/mo' : ''}</span>}
                  {s.nextBillingDate && <p className="text-[10px] text-white/25">Next bill: {new Date(s.nextBillingDate).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
