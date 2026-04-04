'use client';

import { useState, useEffect, useCallback } from 'react';

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  services: string;
  isCustom: boolean;
  _count: { clients: number };
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', services: '' });
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', price: '', services: '' });

  const fetchPackages = useCallback(async () => {
    const res = await fetch('/api/packages');
    setPackages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const handleEdit = (pkg: Package) => {
    setEditing(pkg.id);
    const services = JSON.parse(pkg.services || '[]');
    setEditForm({
      name: pkg.name,
      description: pkg.description || '',
      price: String(pkg.price),
      services: services.join(', '),
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    await fetch('/api/packages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing,
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        services: JSON.stringify(editForm.services.split(',').map(s => s.trim()).filter(Boolean)),
      }),
    });
    setEditing(null);
    fetchPackages();
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name,
        description: addForm.description,
        price: addForm.price,
        services: JSON.stringify(addForm.services.split(',').map(s => s.trim()).filter(Boolean)),
      }),
    });
    setAddForm({ name: '', description: '', price: '', services: '' });
    setAdding(false);
    fetchPackages();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Packages</h1>
          <p className="text-sm text-white/40 mt-1">Service plans for clients</p>
        </div>
        <button onClick={() => setAdding(!adding)} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200">
          + New Package
        </button>
      </div>

      {adding && (
        <div className="glass p-6 mb-6">
          <h3 className="text-sm text-white/60 mb-4">New Package</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-white/40">Name *</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="mt-1 text-sm" autoFocus />
            </div>
            <div>
              <label className="text-xs text-white/40">Price ($/mo)</label>
              <input type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40">Description</label>
              <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} className="mt-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40">Included Services (comma-separated)</label>
              <input value={addForm.services} onChange={e => setAddForm(f => ({ ...f, services: e.target.value }))} placeholder="Website Design, Monthly SEO, Monthly Maintenance" className="mt-1 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
            <button onClick={handleAdd} disabled={!addForm.name.trim()} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">Create</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map(pkg => {
          const services: string[] = JSON.parse(pkg.services || '[]');
          const isEditing = editing === pkg.id;

          return (
            <div key={pkg.id} className="glass p-6">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/40">Name</label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">Price ($/mo)</label>
                    <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">Description</label>
                    <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="mt-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">Services (comma-separated)</label>
                    <input value={editForm.services} onChange={e => setEditForm(f => ({ ...f, services: e.target.value }))} className="mt-1 text-sm" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => setEditing(null)} className="px-3 py-1 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
                    <button onClick={handleSave} className="px-3 py-1 rounded-lg bg-accent/20 text-accent text-xs">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-light text-white/90">{pkg.name}</h3>
                      {pkg.description && <p className="text-xs text-white/40 mt-1">{pkg.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-light text-accent">
                        {pkg.isCustom ? 'Custom' : `$${pkg.price.toLocaleString()}`}
                        {!pkg.isCustom && <span className="text-xs text-white/30">/mo</span>}
                      </p>
                    </div>
                  </div>

                  {services.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      {services.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                          <span className="text-emerald-400">+</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-white/25">{pkg._count.clients} client{pkg._count.clients !== 1 ? 's' : ''}</span>
                    <button onClick={() => handleEdit(pkg)} className="text-xs text-white/30 hover:text-white/60">Edit</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
