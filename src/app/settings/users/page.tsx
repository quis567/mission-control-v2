'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);

  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (session && !isAdmin) { router.push('/'); return; }
    fetch('/api/users').then(r => r.ok ? r.json() : []).then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, [session, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">User Management</h1>
          <p className="text-sm text-white/40 mt-1">{users.length} users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all">+ Add User</button>
      </div>

      {loading ? <div className="text-white/30 text-sm text-center py-16">Loading...</div> : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="glass p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/80">{user.name || user.email}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/40'}`}>{user.role === 'admin' ? 'Admin' : 'Member'}</span>
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">{user.email}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">Created {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditUser(user)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10">Edit</button>
                  <button onClick={() => setResetUser(user)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10">Reset PW</button>
                  {user.id !== (session?.user as any)?.id && (
                    <button onClick={async () => {
                      if (!confirm(`Remove ${user.email}? This cannot be undone.`)) return;
                      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
                      if (res.ok) setUsers(prev => prev.filter(u => u.id !== user.id));
                      else { const err = await res.json(); alert(err.error); }
                    }} className="px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 text-xs hover:bg-red-400/20">Remove</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={user => { setUsers(prev => [...prev, user]); setShowAdd(false); }} />}

      {/* Edit User Modal */}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={updated => { setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); setEditUser(null); }} />}

      {/* Reset Password Modal */}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (user: any) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'member' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }) });
    if (res.ok) onCreated(await res.json());
    else { const err = await res.json(); setError(err.error); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-md relative z-10">
        <h2 className="text-xl font-light text-white mb-6">Add New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" required /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Password *</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="mt-1" required /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Confirm Password *</label><input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} className="mt-1" required /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Role</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="mt-1"><option value="member">Member</option><option value="admin">Admin</option></select></div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent disabled:opacity-40">{saving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: (user: any) => void }) {
  const [form, setForm] = useState({ name: user.name || '', role: user.role });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) onSaved(await res.json());
    else { const err = await res.json(); setError(err.error); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-md relative z-10">
        <h2 className="text-xl font-light text-white mb-6">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Email</label><input value={user.email} disabled className="mt-1 opacity-50" /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Role</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="mt-1"><option value="member">Member</option><option value="admin">Admin</option></select></div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent disabled:opacity-40">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password }) });
    if (res.ok) setDone(true);
    else { const err = await res.json(); setError(err.error); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-md relative z-10">
        <h2 className="text-xl font-light text-white mb-2">Reset Password</h2>
        <p className="text-xs text-white/40 mb-6">{user.email}</p>
        {done ? (
          <div>
            <p className="text-sm text-emerald-400 mb-4">Password reset successfully.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" required /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Confirm Password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1" required /></div>
            {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent disabled:opacity-40">{saving ? 'Resetting...' : 'Reset Password'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
