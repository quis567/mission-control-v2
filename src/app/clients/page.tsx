'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Client {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  businessType: string | null;
  city: string | null;
  state: string | null;
  status: string;
  monthlyRevenue: number | null;
  tags: string | null;
  createdAt: string;
  _count: { websites: number; services: number; tasks: number };
}

const STATUS_COLORS: Record<string, string> = {
  lead: 'text-sky-400 bg-sky-400/10',
  prospect: 'text-amber-400 bg-amber-400/10',
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-orange-400 bg-orange-400/10',
  churned: 'text-red-400 bg-red-400/10',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/clients?${params}`);
    setClients(await res.json());
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Clients</h1>
          <p className="text-sm text-white/40 mt-1">{clients.length} total</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200"
        >
          + Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="glass-subtle px-4 py-2 rounded-xl text-sm w-64 border-none"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="glass-subtle px-4 py-2 rounded-xl text-sm border-none"
        >
          <option value="">All statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Client Grid */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-white/30 text-sm">No clients yet</p>
          <button onClick={() => setShowAddModal(true)} className="mt-3 text-accent text-sm hover:text-accent/80 transition-colors">
            Add your first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <div className="glass p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white/90">{client.businessName}</h3>
                    {client.contactName && (
                      <p className="text-xs text-white/40 mt-0.5">{client.contactName}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[client.status] || 'text-white/40 bg-white/5'}`}>
                    {client.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-white/40">
                  {client.businessType && <p>{client.businessType}</p>}
                  {(client.city || client.state) && (
                    <p>{[client.city, client.state].filter(Boolean).join(', ')}</p>
                  )}
                  {client.monthlyRevenue != null && (
                    <p className="text-emerald-400/70">${client.monthlyRevenue.toLocaleString()}/mo</p>
                  )}
                </div>

                <div className="flex gap-3 mt-4 pt-3 border-t border-white/5 text-xs text-white/25">
                  <span>{client._count.websites} sites</span>
                  <span>{client._count.services} services</span>
                  <span>{client._count.tasks} tasks</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchClients(); }}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    businessType: '', city: '', state: '', status: 'lead', monthlyRevenue: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;
    setSubmitting(true);
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    onCreated();
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-light tracking-wide text-white mb-6">Add Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Business Name *</label>
            <input value={form.businessName} onChange={e => set('businessName', e.target.value)} className="mt-1" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Contact Name</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Business Type</label>
              <input value={form.businessType} onChange={e => set('businessType', e.target.value)} placeholder="e.g. Plumber, Roofer" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="FL" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1">
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Monthly Revenue ($)</label>
            <input type="number" value={form.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
            <button type="submit" disabled={submitting || !form.businessName.trim()} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200 disabled:opacity-40">
              {submitting ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
