'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateTaskModal from '@/components/CreateTaskModal';
import { STATUS_COLORS } from '@/components/ClientCard';
import ServiceCard from '@/components/ServiceCard';
import LinkCard from '@/components/LinkCard';
import NoteTimeline from '@/components/NoteTimeline';

const TABS = ['Overview', 'Websites', 'Services', 'Notes', 'Links'];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showTaskModal, setShowTaskModal] = useState(false);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) { router.push('/clients'); return; }
    setClient(await res.json());
    setLoading(false);
  }, [clientId, router]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  if (loading || !client) {
    return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.push('/clients')} className="text-white/40 text-sm hover:text-white/60 transition-colors mb-6 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Clients
      </button>

      {/* Header */}
      <div className="glass p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
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
            <button onClick={() => setShowTaskModal(true)} className="px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all duration-200">+ Task</button>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
          {client.contactName && <span>Contact: {client.contactName}</span>}
          {client.email && <span>{client.email}</span>}
          {client.phone && <span>{client.phone}</span>}
        </div>
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
      {activeTab === 'Overview' && <OverviewTab client={client} />}
      {activeTab === 'Websites' && <WebsitesTab clientId={clientId} websites={client.websites || []} onRefresh={fetchClient} />}
      {activeTab === 'Services' && <ServicesTab clientId={clientId} services={client.services || []} onRefresh={fetchClient} />}
      {activeTab === 'Notes' && <NotesTab clientId={clientId} notes={client.notes || []} onRefresh={fetchClient} />}
      {activeTab === 'Links' && <LinksTab clientId={clientId} links={client.links || []} onRefresh={fetchClient} />}

      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onCreated={() => { setShowTaskModal(false); fetchClient(); }}
        defaultClientId={clientId}
        defaultTitle={`[${client.businessName}] `}
      />
    </div>
  );
}

function OverviewTab({ client }: { client: any }) {
  return (
    <div className="grid grid-cols-3 gap-4">
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
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ serviceType: '', billingType: 'monthly', price: '', status: 'active' });

  const handleAdd = async () => {
    if (!form.serviceType.trim()) return;
    await fetch(`/api/clients/${clientId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ serviceType: '', billingType: 'monthly', price: '', status: 'active' }); setAdding(false); onRefresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wider">Services</h3>
        <button onClick={() => setAdding(!adding)} className="text-xs text-accent hover:text-accent/80">+ Add Service</button>
      </div>
      {adding && (
        <div className="glass p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} className="text-sm">
              <option value="">Select service...</option>
              <option>Website Design</option><option>Website Redesign</option><option>Monthly SEO</option>
              <option>Monthly Maintenance</option><option>Google Business Profile Management</option>
              <option>Content Creation</option><option>Social Media Management</option><option>Paid Ads Management</option>
              <option>Hosting</option><option>Domain Management</option>
            </select>
            <select value={form.billingType} onChange={e => setForm(f => ({ ...f, billingType: e.target.value }))} className="text-sm">
              <option value="one-time">One-time</option><option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option><option value="annual">Annual</option>
            </select>
          </div>
          <div className="flex gap-3">
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Price" className="flex-1 text-sm" />
            <button onClick={handleAdd} className="px-4 py-1 rounded-lg bg-accent/20 text-accent text-xs">Add</button>
          </div>
        </div>
      )}
      {services.length === 0 ? (
        <div className="glass p-8 text-center text-white/30 text-sm">No services yet</div>
      ) : (
        <div className="space-y-3">
          {services.map((s: any) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
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
