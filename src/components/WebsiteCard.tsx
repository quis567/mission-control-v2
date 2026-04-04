'use client';

import Link from 'next/link';

const WEB_STATUS: Record<string, { color: string; dot: string }> = {
  development: { color: 'text-amber-400', dot: 'bg-amber-400' },
  staging: { color: 'text-sky-400', dot: 'bg-sky-400' },
  live: { color: 'text-emerald-400', dot: 'bg-emerald-400' },
  maintenance: { color: 'text-orange-400', dot: 'bg-orange-400' },
  archived: { color: 'text-white/30', dot: 'bg-white/30' },
};

interface WebsiteCardProps {
  website: {
    id: string;
    url: string;
    status: string;
    cmsPlatform?: string | null;
    hostingProvider?: string | null;
    domainExpiration?: string | null;
    gaConnected?: boolean;
    gscConnected?: boolean;
    maintenancePlan?: boolean;
    netlifySiteId?: string | null;
    githubRepoUrl?: string | null;
    client?: { businessName: string } | null;
  };
}

export default function WebsiteCard({ website }: WebsiteCardProps) {
  const statusInfo = WEB_STATUS[website.status] || WEB_STATUS.archived;
  const domainDays = website.domainExpiration
    ? Math.floor((new Date(website.domainExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link href={`/seo/${website.id}`}>
      <div className="glass p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 truncate">{website.url}</p>
            {website.client && <p className="text-xs text-white/30 mt-0.5">{website.client.businessName}</p>}
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            <span className={`text-xs ${statusInfo.color}`}>{website.status}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-white/30">
          {website.cmsPlatform && <p>{website.cmsPlatform}</p>}
          {website.hostingProvider && <p>Hosted: {website.hostingProvider}</p>}
          {domainDays != null && domainDays < 30 && domainDays > 0 && (
            <p className="text-amber-400">Domain expires in {domainDays} days</p>
          )}
        </div>

        <div className="flex gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-white/20">
          {website.netlifySiteId && <span className="text-emerald-400/40">Netlify</span>}
          {website.githubRepoUrl && <span className="text-white/30">GitHub</span>}
          <span>{website.gaConnected ? 'GA' : ''}{website.gscConnected ? ' · GSC' : ''}</span>
          {website.maintenancePlan && <span>Maintenance plan</span>}
        </div>
      </div>
    </Link>
  );
}

export { WEB_STATUS };
