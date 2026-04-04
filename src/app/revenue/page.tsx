'use client';

import { useState, useEffect } from 'react';

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/revenue').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  const serviceEntries = Object.entries(data.byServiceType || {}).sort((a, b) => (b[1] as number) - (a[1] as number));
  const maxServiceRevenue = serviceEntries.length > 0 ? Math.max(...serviceEntries.map(([, v]) => v as number)) : 1;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-light tracking-wide text-white/90 mb-6">Revenue</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass p-5 glow-success">
          <p className="text-xs text-white/40 uppercase tracking-wider">Monthly Recurring</p>
          <p className="text-3xl font-light mt-2 text-emerald-400">${data.mrr?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Projected Annual</p>
          <p className="text-3xl font-light mt-2 text-accent">${data.projectedAnnual?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">One-Time Revenue</p>
          <p className="text-3xl font-light mt-2 text-white/70">${data.totalOneTime?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Active Services</p>
          <p className="text-3xl font-light mt-2 text-amber-400">{data.activeServices}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue by Service Type */}
        <div className="col-span-2">
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Revenue by Service Type</h2>
          {serviceEntries.length === 0 ? (
            <div className="glass p-8 text-center text-white/30 text-sm">No active services</div>
          ) : (
            <div className="glass p-5 space-y-4">
              {serviceEntries.map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/60">{type}</span>
                    <span className="text-xs text-white/40">${(amount as number).toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent/40 rounded-full transition-all duration-500" style={{ width: `${((amount as number) / maxServiceRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Renewals */}
          {data.upcomingRenewals?.length > 0 && (
            <>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4 mt-8">Upcoming Renewals (30 days)</h2>
              <div className="space-y-2">
                {data.upcomingRenewals.map((r: any, i: number) => (
                  <div key={i} className="glass-subtle p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/70">{r.serviceType}</p>
                      <p className="text-xs text-white/30">{r.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-400">${r.price?.toLocaleString()}</p>
                      <p className="text-xs text-white/20">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Client Counts */}
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Clients by Status</h2>
          <div className="glass p-5 space-y-3 mb-6">
            {Object.entries(data.clientsByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="text-xs text-white/50 capitalize">{status}</span>
                <span className="text-xs text-white/70">{count as number}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-xs text-white/40">Total</span>
              <span className="text-xs text-white/70">{data.totalClients}</span>
            </div>
          </div>

          {/* Top Clients */}
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Top Clients by Revenue</h2>
          {data.topClients?.length === 0 ? (
            <div className="glass p-6 text-center text-white/30 text-xs">No revenue data</div>
          ) : (
            <div className="space-y-2">
              {data.topClients?.map((c: any, i: number) => (
                <div key={i} className="glass-subtle p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/20 w-4">{i + 1}</span>
                    <span className="text-xs text-white/70">{c.name}</span>
                  </div>
                  <span className="text-xs text-emerald-400">${c.revenue?.toLocaleString()}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
