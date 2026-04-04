'use client';

import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  lead: 'text-sky-400 bg-sky-400/10',
  prospect: 'text-amber-400 bg-amber-400/10',
  proposal: 'text-blue-400 bg-blue-400/10',
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-orange-400 bg-orange-400/10',
  churned: 'text-red-400 bg-red-400/10',
};

interface ClientCardProps {
  client: {
    id: string;
    businessName: string;
    contactName?: string | null;
    businessType?: string | null;
    city?: string | null;
    state?: string | null;
    status: string;
    monthlyRevenue?: number | null;
    tags?: string | null;
    package?: { id: string; name: string; price: number } | null;
    _count?: { websites: number; services: number; tasks: number };
  };
  showCounts?: boolean;
}

export default function ClientCard({ client, showCounts = true }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`}>
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
          {client.package && <p className="text-accent/60">{client.package.name}</p>}
          {client.monthlyRevenue != null && (
            <p className="text-emerald-400/70">${client.monthlyRevenue.toLocaleString()}/mo</p>
          )}
        </div>

        {showCounts && client._count && (
          <div className="flex gap-3 mt-4 pt-3 border-t border-white/5 text-xs text-white/25">
            <span>{client._count.websites} sites</span>
            <span>{client._count.services} services</span>
            <span>{client._count.tasks} tasks</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export { STATUS_COLORS };
