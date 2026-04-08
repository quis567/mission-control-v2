'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateTaskModal from '@/components/CreateTaskModal';
import { STATUS_COLORS } from '@/components/ClientCard';
import ServiceCard from '@/components/ServiceCard';
import LinkCard from '@/components/LinkCard';
import NoteTimeline from '@/components/NoteTimeline';
import { PageLoader } from '@/components/Spinner';

const TABS = ['Overview', 'Websites', 'Services', 'Notes', 'Links', 'Content Ideas'];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) { router.push('/clients'); return; }
    setClient(await res.json());
    setLoading(false);
  }, [clientId, router]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  if (loading || !client) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.push('/clients')} className="text-white/40 text-sm hover:text-white/60 transition-colors mb-6 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Clients
      </button>

      {/* Header */}
      <div className="glass p-6 mb-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-light tracking-wide text-white/90">{client.businessName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[client.status] || ''}`}>{client.status}</span>
              {client.businessType && <span className="text-xs text-white/40">{client.businessType}</span>}
              {(client.city || client.state) && <span className="text-xs text-white/30">{[client.city, client.state].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {client.monthlyRevenue != null && (
              <p className="text-lg font-light text-emerald-400">${client.monthlyRevenue.toLocaleString()}<span className="text-xs text-white/30">/mo</span></p>
            )}
            <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all duration-200">Edit</button>
            <button onClick={() => setShowTaskModal(true)} className="px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all duration-200">+ Task</button>
            <a href={`/proposals?clientId=${clientId}`} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all duration-200">Proposal</a>
            <button onClick={async () => {
              if (!confirm(`Delete ${client.businessName}? This will also remove all their websites, SEO data, services, notes, and proposals. This cannot be undone.`)) return;
              const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
              if (res.ok) router.push('/clients');
            }} className="px-3 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs hover:bg-red-400/20 transition-all duration-200">Delete</button>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
          {client.contactName && <span>Contact: {client.contactName}</span>}
          {client.email && <span>{client.email}</span>}
          {client.phone && <span>{client.phone}</span>}
        </div>
        {client.slug && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <span className="text-xs text-white/30 block mb-1">Request URL:</span>
            <div className="flex items-start gap-2">
              <code className="text-xs text-cyan-400/70 bg-white/5 px-2 py-1 rounded block overflow-hidden text-ellipsis" style={{ wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? window.location.origin : ''}/request/{client.slug}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/request/${client.slug}`); }}
                className="text-xs text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
                title="Copy URL"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm transition-all duration-200
              ${activeTab === tab ? 'glass-active text-accent' : 'text-white/40 hover:bg-white/5'}`}
          >
            {tab}
            {tab === 'Websites' && <span className="ml-1 text-xs text-white/20">{client.websites?.length || 0}</span>}
            {tab === 'Services' && <span className="ml-1 text-xs text-white/20">{client.services?.length || 0}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab client={client} onRefresh={fetchClient} />}
      {activeTab === 'Websites' && <WebsitesTab clientId={clientId} websites={client.websites || []} onRefresh={fetchClient} />}
      {activeTab === 'Services' && <ServicesTab clientId={clientId} services={client.services || []} onRefresh={fetchClient} />}
      {activeTab === 'Notes' && <NotesTab clientId={clientId} notes={client.notes || []} onRefresh={fetchClient} />}
      {activeTab === 'Links' && <LinksTab clientId={clientId} links={client.links || []} onRefresh={fetchClient} />}
      {activeTab === 'Content Ideas' && <ContentIdeasTab clientId={clientId} client={client} />}

      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onCreated={() => { setShowTaskModal(false); fetchClient(); }}
        defaultClientId={clientId}
        defaultTitle={`[${client.businessName}] `}
      />

      {showEditModal && (
        <EditClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); fetchClient(); }}
        />
      )}
    </div>
  );
}

function OverviewTab({ client, onRefresh }: { client: any; onRefresh: () => void }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [changingPackage, setChangingPackage] = useState(false);

  useEffect(() => {
    fetch('/api/packages').then(r => r.json()).then(setPackages).catch(() => {});
  }, []);

  const handlePackageChange = async (packageId: string) => {
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: packageId || null }),
    });
    setChangingPackage(false);
    onRefresh();
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Package Section */}
      <div className="col-span-3 glass p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Package</p>
            {client.package ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-lg font-light text-accent">{client.package.name}</span>
                <span className="text-sm text-white/30">${client.package.price.toLocaleString()}/mo</span>
              </div>
            ) : (
              <p className="text-sm text-white/30 mt-2">No package assigned</p>
            )}
          </div>
          <button onClick={() => setChangingPackage(!changingPackage)} className="text-xs text-accent hover:text-accent/80">
            {changingPackage ? 'Cancel' : 'Change'}
          </button>
        </div>
        {changingPackage && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
            <button onClick={() => handlePackageChange('')} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${!client.packageId ? 'bg-accent/20 border-accent/30 text-accent' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
              None
            </button>
            {packages.map(pkg => (
              <button key={pkg.id} onClick={() => handlePackageChange(pkg.id)} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${client.packageId === pkg.id ? 'bg-accent/20 border-accent/30 text-accent' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
                {pkg.name} {!pkg.isCustom && `· $${pkg.price}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="glass p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider">Websites</p>
        <p className="text-2xl font-light mt-2 text-accent">{client._count?.websites || 0}</p>
      </div>
      <div className="glass p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider">Active Services</p>
        <p className="text-2xl font-light mt-2 text-emerald-400">{client.services?.filter((s: any) => s.status === 'active').length || 0}</p>
      </div>
      <div className="glass p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider">Tasks</p>
        <p className="text-2xl font-light mt-2 text-amber-400">{client._count?.tasks || 0}</p>
      </div>
      {client.tasks?.length > 0 && (
        <div className="col-span-3">
          <h3 className="text-sm text-white/40 uppercase tracking-wider mb-3">Recent Tasks</h3>
          <div className="space-y-2">
            {client.tasks.map((t: any) => (
              <Link key={t.id} href={`/tasks/${t.id}`}>
                <div className="glass-subtle p-3 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70">{t.title}</span>
                    <span className="text-xs text-white/30">{t.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WebsitesTab({ clientId, websites, onRefresh }: { clientId: string; websites: any[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('');

  const handleAdd = async () => {
    if (!url.trim()) return;
    await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, url: url.trim(), cmsPlatform: platform || undefined }),
    });
    setUrl(''); setPlatform(''); setAdding(false); onRefresh();
  };

  const WEB_STATUS: Record<string, string> = {
    development: 'text-amber-400', staging: 'text-sky-400', live: 'text-emerald-400',
    maintenance: 'text-orange-400', archived: 'text-white/30',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wider">Websites</h3>
        <button onClick={() => setAdding(!adding)} className="text-xs text-accent hover:text-accent/80">+ Add Website</button>
      </div>
      {adding && (
        <div className="glass p-4 mb-4 flex gap-3">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="flex-1 text-sm" />
          <input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="WordPress" className="w-32 text-sm" />
          <button onClick={handleAdd} className="px-3 py-1 rounded-lg bg-accent/20 text-accent text-xs">Add</button>
        </div>
      )}
      {websites.length === 0 ? (
        <div className="glass p-8 text-center text-white/30 text-sm">No websites yet</div>
      ) : (
        <div className="space-y-3">
          {websites.map((w: any) => (
            <div key={w.id} className="glass p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">{w.url}</p>
                  <div className="flex gap-3 mt-1 text-xs text-white/30">
                    {w.cmsPlatform && <span>{w.cmsPlatform}</span>}
                    {w.hostingProvider && <span>{w.hostingProvider}</span>}
                  </div>
                </div>
                <span className={`text-xs ${WEB_STATUS[w.status] || 'text-white/30'}`}>{w.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesTab({ clientId, services, onRefresh }: { clientId: string; services: any[]; onRefresh: () => void }) {
  const [showSelector, setShowSelector] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', price: '', billingType: 'one-time', description: '' });
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    const res = await fetch('/api/service-templates');
    if (res.ok) setTemplates(await res.json());
  };

  const openSelector = () => { setShowSelector(true); loadTemplates(); setSelectedPkg(null); setSelectedAddons(new Set()); setCustomServices([]); };

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const addCustom = () => {
    if (!customForm.name.trim()) return;
    setCustomServices(prev => [...prev, { ...customForm, price: parseFloat(customForm.price) || 0 }]);
    setCustomForm({ name: '', price: '', billingType: 'one-time', description: '' });
    setShowCustom(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/clients/${clientId}/services/assign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageTemplateId: selectedPkg, addonTemplateIds: Array.from(selectedAddons), customServices }),
    });
    setSaving(false); setShowSelector(false); onRefresh();
  };

  const packages = templates.filter(t => t.category === 'package');
  const addons = templates.filter(t => t.category === 'addon');
  const selectedPkgData = packages.find(p => p.id === selectedPkg);
  const selectedAddonData = addons.filter(a => selectedAddons.has(a.id));
  const oneTimeTotal = (selectedPkgData?.price || 0) + customServices.filter(c => c.billingType === 'one-time').reduce((s, c) => s + c.price, 0);
  const monthlyTotal = selectedAddonData.reduce((s, a) => s + a.price, 0) + customServices.filter(c => c.billingType === 'monthly').reduce((s, c) => s + c.price, 0);
  const hasSelections = selectedPkg || selectedAddons.size > 0 || customServices.length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wider">Services</h3>
        <button onClick={openSelector} className="text-xs text-accent hover:text-accent/80">+ Add Services</button>
      </div>

      {/* Existing Services */}
      {services.length === 0 && !showSelector ? (
        <div className="glass p-8 text-center">
          <p className="text-white/30 text-sm mb-3">No services yet</p>
          <button onClick={openSelector} className="text-accent text-sm hover:text-accent/80">Assign packages & add-ons</button>
        </div>
      ) : !showSelector && (
        <div className="space-y-3">
          {services.map((s: any) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}

      {/* Service Selector */}
      {showSelector && (
        <div className="space-y-6">
          {/* One-Time Packages */}
          <div>
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">One-Time Packages (select one)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packages.map(pkg => {
                const isSelected = selectedPkg === pkg.id;
                let features: string[] = [];
                try { features = JSON.parse(pkg.features); } catch {}
                return (
                  <button key={pkg.id} onClick={() => setSelectedPkg(isSelected ? null : pkg.id)}
                    className={`glass p-4 text-left transition-all ${isSelected ? 'border border-accent/40 bg-accent/5' : 'border border-transparent hover:border-white/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white/80">{pkg.name}</span>
                      {pkg.isPopular && <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/20 text-accent">Most Popular</span>}
                    </div>
                    <p className="text-xl font-light text-accent mb-1">${pkg.price.toLocaleString()}</p>
                    <p className="text-[10px] text-white/25 mb-3">one-time</p>
                    <div className="space-y-1">
                      {features.map((f, i) => (
                        <p key={i} className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-accent/50 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          {f}
                        </p>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Add-ons */}
          <div>
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Monthly Add-ons (select any)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {addons.map(addon => {
                const isSelected = selectedAddons.has(addon.id);
                let features: string[] = [];
                try { features = JSON.parse(addon.features); } catch {}
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className={`glass p-4 text-left transition-all ${isSelected ? 'border border-accent/40 bg-accent/5' : 'border border-transparent hover:border-white/10'}`}>
                    <span className="text-sm font-medium text-white/80">{addon.name}</span>
                    <p className="text-lg font-light text-accent mt-1">${addon.price}<span className="text-xs text-white/25">/mo</span></p>
                    <div className="space-y-1 mt-2">
                      {features.map((f, i) => (
                        <p key={i} className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-accent/50 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          {f}
                        </p>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Service */}
          <div>
            <button onClick={() => setShowCustom(!showCustom)} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50">
              <svg className={`w-3 h-3 transition-transform ${showCustom ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              Add Custom Service
            </button>
            {showCustom && (
              <div className="glass p-4 mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))} placeholder="Service name" className="text-sm" />
                  <input type="number" value={customForm.price} onChange={e => setCustomForm(f => ({ ...f, price: e.target.value }))} placeholder="Price" className="text-sm" />
                </div>
                <div className="flex gap-3">
                  <select value={customForm.billingType} onChange={e => setCustomForm(f => ({ ...f, billingType: e.target.value }))} className="text-sm flex-1">
                    <option value="one-time">One-time</option><option value="monthly">Monthly</option>
                  </select>
                  <button onClick={addCustom} disabled={!customForm.name.trim()} className="px-4 py-1 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">Add</button>
                </div>
              </div>
            )}
            {customServices.length > 0 && (
              <div className="mt-2 space-y-1">
                {customServices.map((cs, i) => (
                  <div key={i} className="flex items-center justify-between glass-subtle p-2 text-xs">
                    <span className="text-white/60">{cs.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-accent">${cs.price}{cs.billingType === 'monthly' ? '/mo' : ''}</span>
                      <button onClick={() => setCustomServices(prev => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400">x</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Bar */}
          <div className="glass p-4 border border-white/10">
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Summary</h4>
            {!hasSelections ? (
              <p className="text-xs text-white/25">Select packages and add-ons above</p>
            ) : (
              <div className="space-y-1.5">
                {selectedPkgData && <div className="flex justify-between text-xs"><span className="text-white/60">{selectedPkgData.name} Package</span><span className="text-accent">${selectedPkgData.price.toLocaleString()} (one-time)</span></div>}
                {selectedAddonData.map(a => <div key={a.id} className="flex justify-between text-xs"><span className="text-white/60">{a.name}</span><span className="text-accent">${a.price}/mo</span></div>)}
                {customServices.map((cs, i) => <div key={i} className="flex justify-between text-xs"><span className="text-white/60">{cs.name}</span><span className="text-accent">${cs.price}{cs.billingType === 'monthly' ? '/mo' : ''}</span></div>)}
                <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                  {oneTimeTotal > 0 && <div className="flex justify-between text-xs"><span className="text-white/40">One-time total</span><span className="text-white/70">${oneTimeTotal.toLocaleString()}</span></div>}
                  {monthlyTotal > 0 && <div className="flex justify-between text-xs"><span className="text-white/40">Monthly total</span><span className="text-white/70">${monthlyTotal}/mo</span></div>}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowSelector(false)} className="px-4 py-2 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
              <button onClick={handleSave} disabled={!hasSelections || saving} className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">{saving ? 'Saving...' : 'Save Services'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditClientModal({ client, onClose, onSaved }: { client: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    businessName: client.businessName || '',
    contactName: client.contactName || '',
    email: client.email || '',
    phone: client.phone || '',
    businessType: client.businessType || '',
    city: client.city || '',
    state: client.state || '',
    status: client.status || 'lead',
    monthlyRevenue: client.monthlyRevenue?.toString() || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthlyRevenue: form.monthlyRevenue ? parseFloat(form.monthlyRevenue) : null }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-light tracking-wide text-white mb-6">Edit Client</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Business Name *</label><input value={form.businessName} onChange={e => set('businessName', e.target.value)} className="mt-1" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Contact Name</label><input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Business Type</label><input value={form.businessType} onChange={e => set('businessType', e.target.value)} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">City</label><input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">State</label><input value={form.state} onChange={e => set('state', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1">
                <option value="lead">Lead</option><option value="prospect">Prospect</option><option value="proposal">Proposal</option>
                <option value="active">Active</option><option value="paused">Paused</option><option value="churned">Churned</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Monthly Revenue ($)</label><input type="number" value={form.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)} placeholder="0" className="mt-1" /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all">Cancel</button>
            <button type="submit" disabled={saving || !form.businessName.trim()} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all disabled:opacity-40">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotesTab({ clientId, notes, onRefresh }: { clientId: string; notes: any[]; onRefresh: () => void }) {
  const [content, setContent] = useState('');

  const handleAdd = async () => {
    if (!content.trim()) return;
    await fetch(`/api/clients/${clientId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    });
    setContent(''); onRefresh();
  };

  return (
    <div>
      <div className="glass p-4 mb-4">
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Add a note..." rows={3} className="resize-none text-sm" />
        <div className="flex justify-end mt-2">
          <button onClick={handleAdd} disabled={!content.trim()} className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">Add Note</button>
        </div>
      </div>
      <NoteTimeline notes={notes} />
    </div>
  );
}

function LinksTab({ clientId, links, onRefresh }: { clientId: string; links: any[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', url: '', category: '', username: '', password: '' });
  const handleAdd = async () => {
    if (!form.label.trim()) return;
    await fetch(`/api/clients/${clientId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ label: '', url: '', category: '', username: '', password: '' }); setAdding(false); onRefresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wider">Portal Links</h3>
        <button onClick={() => setAdding(!adding)} className="text-xs text-accent hover:text-accent/80">+ Add Link</button>
      </div>
      <p className="text-xs text-amber-400/50 mb-4">Stored locally. Do not use on shared or public machines.</p>
      {adding && (
        <div className="glass p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (e.g. WordPress Admin)" className="text-sm" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="text-sm">
              <option value="">Category</option>
              <option value="hosting">Hosting</option><option value="domain">Domain</option>
              <option value="analytics">Analytics</option><option value="cms">CMS</option>
              <option value="social">Social</option><option value="custom">Custom</option>
            </select>
          </div>
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" className="text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" className="text-sm" />
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" className="text-sm" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="px-4 py-1 rounded-lg bg-accent/20 text-accent text-xs">Save Link</button>
          </div>
        </div>
      )}
      {links.length === 0 ? (
        <div className="glass p-8 text-center text-white/30 text-sm">No links saved yet</div>
      ) : (
        <div className="space-y-3">
          {links.map((l: any) => (
            <LinkCard key={l.id} link={l} />
          ))}
        </div>
      )}
    </div>
  );
}

const INTENT_COLORS: Record<string, string> = {
  informational: 'text-blue-400',
  commercial: 'text-amber-400',
  transactional: 'text-emerald-400',
};

function ContentIdeasTab({ clientId, client }: { clientId: string; client: any }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/content-suggestions`, { method: 'POST' });
      if (!res.ok) {
        setError(`Error: ${res.status}`);
        return;
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const niche = client.businessType || 'local service business';
  const location = [client.city, client.state].filter(Boolean).join(', ') || 'N/A';

  return (
    <div className="space-y-4">
      <div className="glass p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Content Ideas</p>
            <p className="text-sm text-white/60">
              Generate 8 blog post ideas tailored to <span className="text-white">{niche}</span> in <span className="text-white">{location}</span>.
            </p>
            {(!client.businessType || (!client.city && !client.state)) && (
              <p className="text-xs text-amber-400/80 mt-2">
                Tip: add a business type and city/state in Edit to get more targeted suggestions.
              </p>
            )}
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all disabled:opacity-40 shrink-0 ml-4"
          >
            {loading ? 'Generating…' : suggestions.length ? 'Regenerate' : 'Generate Ideas'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass p-4 border border-red-400/20 text-red-400 text-sm">{error}</div>
      )}

      {suggestions.length === 0 && !loading && !error && (
        <div className="glass p-8 text-center text-white/30 text-sm">
          No suggestions yet. Click &quot;Generate Ideas&quot; to get blog post topics tailored to this client.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s: any, i: number) => (
            <div key={i} className="glass p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-medium text-white flex-1">{s.title}</h3>
                {s.intent && (
                  <span className={`text-[10px] uppercase tracking-wider ${INTENT_COLORS[s.intent] || 'text-white/40'} shrink-0`}>
                    {s.intent}
                  </span>
                )}
              </div>
              {s.keyword && (
                <p className="text-xs text-cyan-400/70 mb-2">
                  <span className="text-white/30">Target keyword: </span>
                  {s.keyword}
                </p>
              )}
              {s.rationale && (
                <p className="text-xs text-white/50">{s.rationale}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
