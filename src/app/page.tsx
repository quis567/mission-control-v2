'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import IntroAnimation from '@/components/IntroAnimation';

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMrr(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;
}

const activityColors: Record<string, string> = {
  green: 'bg-emerald-400', blue: 'bg-blue-400', purple: 'bg-purple-400', amber: 'bg-amber-400', red: 'bg-red-400',
};

const pipelineColors: Record<string, string> = {
  Lead: 'bg-blue-500', Prospect: 'bg-indigo-500', Proposal: 'bg-purple-500', Active: 'bg-emerald-500', Paused: 'bg-amber-500', Churned: 'bg-red-500',
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('playIntro') === 'true') {
      setShowIntro(true);
      sessionStorage.removeItem('playIntro');
    }
  }, []);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  const d = data || { kpis: {}, navigation: {}, pipeline: {}, recentActivity: [], revenue: {}, agents: [] };
  const pipelineMax = Math.max(...Object.values(d.pipeline as Record<string, number>), 1);

  return (
    <div className="max-w-6xl mx-auto">
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-white/90">COMMAND CENTER</h1>
          <p className="text-sm text-white/40 mt-1">TruePath Studios Operations</p>
        </div>
        <Link href="/tasks" className="px-5 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 glow-accent">
          + New Task
        </Link>
      </div>

      {/* Section 1: KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Monthly Revenue</p>
          <p className="text-3xl font-light mt-2 text-accent">${(d.kpis.mrr || 0).toLocaleString()}</p>
          <p className="text-xs text-white/25 mt-1">Recurring revenue</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Active Clients</p>
          <p className="text-3xl font-light mt-2 text-emerald-400">{d.kpis.activeClients || 0}</p>
          <p className="text-xs text-white/25 mt-1">Active accounts</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">SEO Issues</p>
          <p className="text-3xl font-light mt-2 text-amber-400">{d.kpis.seoIssues || 0}</p>
          <p className="text-xs text-white/25 mt-1">Across {d.kpis.seoIssuesSites || 0} sites</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Tasks Completed</p>
          <p className="text-3xl font-light mt-2 text-blue-400">{d.kpis.tasksCompleted || 0}</p>
          <p className="text-xs text-white/25 mt-1">This week</p>
        </div>
      </div>

      {/* Section 2: Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { href: '/tasks', name: 'Tasks', desc: 'Kanban board', badge: d.navigation.activeTasks, badgeColor: 'bg-blue-400/15 text-blue-400' },
          { href: '/pipeline', name: 'Pipeline', desc: 'Client stages', badge: d.navigation.leads, badgeLabel: 'leads', badgeColor: 'bg-indigo-400/15 text-indigo-400' },
          { href: '/prospector', name: 'Prospector', desc: 'AI lead finder', badge: 'New', badgeColor: 'bg-amber-400/15 text-amber-400' },
          { href: '/clients', name: 'Clients', desc: 'Client list', badge: d.navigation.activeClients, badgeLabel: 'active', badgeColor: 'bg-emerald-400/15 text-emerald-400' },
          { href: '/websites', name: 'Websites', desc: 'Site management', badge: d.navigation.websites, badgeLabel: 'sites', badgeColor: 'bg-blue-400/15 text-blue-400' },
          { href: '/seo', name: 'SEO', desc: 'SEO dashboards', badge: d.navigation.seoIssues, badgeLabel: 'issues', badgeColor: 'bg-red-400/15 text-red-400' },
          { href: '/proposals', name: 'Proposals', desc: 'AI proposals', badge: d.navigation.draftProposals, badgeLabel: 'draft', badgeColor: 'bg-amber-400/15 text-amber-400' },
          { href: '/revenue', name: 'Revenue', desc: 'MRR & charts', badge: formatMrr(d.navigation.mrr || 0), badgeColor: 'bg-emerald-400/15 text-emerald-400' },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <div className="glass p-4 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer h-full">
              <p className="text-sm font-medium text-white/80">{item.name}</p>
              <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded mt-2 ${item.badgeColor}`}>
                {item.badge}{item.badgeLabel ? ` ${item.badgeLabel}` : ''}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Section 3: Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left Column (3/5) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Panel A: Pipeline Funnel */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-wider text-white/40">Pipeline Funnel</h2>
              <Link href="/pipeline" className="text-xs text-accent hover:text-accent/80">View pipeline →</Link>
            </div>
            <div className="space-y-2.5">
              {['Lead', 'Prospect', 'Proposal', 'Active', 'Paused', 'Churned'].map(stage => {
                const count = (d.pipeline as Record<string, number>)[stage] || 0;
                const width = pipelineMax > 0 ? (count / pipelineMax) * 100 : 0;
                return (
                  <Link key={stage} href="/pipeline">
                    <div className="flex items-center gap-3 group cursor-pointer">
                      <span className="text-xs text-white/40 w-20 shrink-0">{stage}</span>
                      <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden">
                        <div
                          className={`h-full ${pipelineColors[stage]} rounded-md transition-all duration-1000 ease-out`}
                          style={{ width: `${width}%`, opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-xs text-white/50 w-6 text-right">{count}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Panel B: Recent Activity Feed */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-wider text-white/40">Recent Activity</h2>
            </div>
            {d.recentActivity.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {d.recentActivity.map((event: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activityColors[event.color] || 'bg-white/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">{event.message}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2/5) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Panel C: Revenue Snapshot */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider text-white/40">Revenue Snapshot</h2>
              <Link href="/revenue" className="text-xs text-accent hover:text-accent/80">View details →</Link>
            </div>
            <p className="text-3xl font-light text-accent">${(d.revenue.current || 0).toLocaleString()}</p>
            <p className="text-xs text-white/30 mt-1">Monthly recurring revenue</p>
          </div>

          {/* Panel D: Agent Status */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider text-white/40">Agents</h2>
              <Link href="/agents" className="text-xs text-accent hover:text-accent/80">View all →</Link>
            </div>
            <div className="space-y-2">
              {(d.agents || []).slice(0, 5).map((agent: any, i: number) => {
                const isWorking = agent.status === 'working';
                return (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <span className="text-xs text-white/60">{agent.name}</span>
                    </div>
                    <span className={`text-[10px] ${isWorking ? 'text-emerald-400' : 'text-white/25'}`}>{isWorking ? 'Working' : 'Idle'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel E: Quick Actions */}
          <div className="glass p-5">
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/clients" className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white/70 transition-all text-center">+ New Client</Link>
              <Link href="/tasks" className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white/70 transition-all text-center">+ New Task</Link>
              <Link href="/prospector" className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white/70 transition-all text-center">Find Leads</Link>
              <Link href="/proposals" className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white/70 transition-all text-center">Create Proposal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
