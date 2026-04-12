'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  leadId: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative hover:bg-white/10"
        title="Notifications"
      >
        <BellIcon className="w-5 h-5 text-white/50 group-hover:text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-cyan-500/30 animate-pulse">
            {unreadCount}
          </span>
        )}
        <span className="absolute left-16 bg-white/15 backdrop-blur-xl text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Notifications{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
        </span>
      </button>

      {open && (
        <div className="absolute left-16 bottom-0 w-80 glass-elevated z-[100] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white/90">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="relative">
                  {n.actionUrl ? (
                    <Link
                      href={n.actionUrl}
                      onClick={() => { if (!n.read) markAsRead(n.id); setOpen(false); }}
                      className={`block p-3 hover:bg-white/5 transition-colors border-b border-white/5 ${!n.read ? 'bg-cyan-500/5' : ''}`}
                    >
                      <NotificationContent n={n} />
                    </Link>
                  ) : (
                    <div
                      onClick={() => { if (!n.read) markAsRead(n.id); }}
                      className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'bg-cyan-500/5' : ''}`}
                    >
                      <NotificationContent n={n} />
                    </div>
                  )}
                  {!n.read && (
                    <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationContent({ n }: { n: { title: string; message: string; createdAt: string } }) {
  const diff = Date.now() - new Date(n.createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  let time = 'just now';
  if (mins >= 1 && mins < 60) time = `${mins}m ago`;
  else if (mins >= 60 && mins < 1440) time = `${Math.floor(mins / 60)}h ago`;
  else if (mins >= 1440) time = `${Math.floor(mins / 1440)}d ago`;

  return (
    <div className="pr-4">
      <p className="text-sm font-medium text-white/90 leading-tight">{n.title}</p>
      <p className="text-xs text-white/50 mt-0.5 leading-snug">{n.message}</p>
      <p className="text-[10px] text-white/30 mt-1">{time}</p>
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}
