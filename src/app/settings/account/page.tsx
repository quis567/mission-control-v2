'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AccountPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameDone, setNameDone] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  const handleNameSave = async () => {
    setNameSaving(true);
    await fetch(`/api/users/${user?.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setNameSaving(false); setNameDone(true);
    setTimeout(() => setNameDone(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError(''); setPwDone(false);
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setPwSaving(true);
    const res = await fetch('/api/users/me/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
    if (res.ok) { setPwDone(true); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    else { const err = await res.json(); setPwError(err.error); }
    setPwSaving(false);
  };

  if (!session) return null;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-light tracking-wide text-white/90 mb-6">My Account</h1>

      {/* Profile */}
      <div className="glass p-6 mb-6">
        <h2 className="text-sm text-white/40 uppercase tracking-wider mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Name</label>
            <div className="flex gap-2 mt-1">
              <input value={name} onChange={e => setName(e.target.value)} className="flex-1 text-sm" />
              <button onClick={handleNameSave} disabled={nameSaving} className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">{nameSaving ? 'Saving...' : 'Save'}</button>
            </div>
            {nameDone && <p className="text-xs text-emerald-400 mt-1">Name updated</p>}
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Email</label>
            <input value={user?.email || ''} disabled className="mt-1 text-sm opacity-50" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Role</label>
            <input value={user?.role || 'member'} disabled className="mt-1 text-sm opacity-50" />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass p-6">
        <h2 className="text-sm text-white/40 uppercase tracking-wider mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="mt-1 text-sm" required /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="mt-1 text-sm" required /></div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="mt-1 text-sm" required /></div>
          {pwError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded">{pwError}</p>}
          {pwDone && <p className="text-xs text-emerald-400 bg-emerald-400/10 p-2 rounded">Password updated successfully</p>}
          <button type="submit" disabled={pwSaving} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm disabled:opacity-40">{pwSaving ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}
