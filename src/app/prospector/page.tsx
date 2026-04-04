'use client';

import { useState, useEffect } from 'react';

const BUSINESS_TYPES = [
  'Roofer', 'Plumber', 'Electrician', 'General Contractor', 'HVAC',
  'Painter', 'Landscaper', 'Pool Service', 'Pest Control', 'Pressure Washing',
  'Flooring', 'Fencing', 'Concrete/Paving', 'Tree Service', 'Garage Door',
  'Handyman', 'Cleaning',
];

const SCORE_BADGE: Record<string, string> = {
  Hot: 'text-red-400 bg-red-400/10',
  Warm: 'text-amber-400 bg-amber-400/10',
  Cool: 'text-blue-400 bg-blue-400/10',
};

const WEB_GRADE: Record<string, string> = {
  None: 'text-red-400 bg-red-400/10',
  Basic: 'text-orange-400 bg-orange-400/10',
  Moderate: 'text-amber-400 bg-amber-400/10',
  Good: 'text-emerald-400 bg-emerald-400/10',
  Professional: 'text-accent bg-accent/10',
};

interface Lead {
  businessName: string;
  tradeType: string;
  phone: string;
  website: string;
  googleRating: number;
  address: string;
  city: string;
  state: string;
  description: string;
  servicesOffered: string;
  websiteQuality: string;
  onlinePresenceNotes: string;
  leadScore: number;
  scoreLabel: string;
  salesPitch: string;
  recommendedPackage: string;
  pitchAngle: string;
}

export default function ProspectorPage() {
  const [area, setArea] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState('');
  const [count, setCount] = useState(15);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<any>(null);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  useEffect(() => {
    // We'd need an API for this, but we can skip for now
  }, []);

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleSelectLead = (i: number) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((_, i) => i)));
    }
  };

  const handleSearch = async () => {
    const types = [...selectedTypes];
    if (customType.trim()) types.push(customType.trim());
    if (!area.trim() || types.length === 0) return;

    setSearching(true);
    setLeads([]);
    setAddResult(null);
    setSelectedLeads(new Set());

    const statusMessages = [
      `Searching for ${types.join(', ')} in ${area}...`,
      'Reviewing online presence...',
      'Scoring leads...',
      'Generating sales pitches...',
    ];
    let msgIdx = 0;
    setSearchStatus(statusMessages[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, statusMessages.length - 1);
      setSearchStatus(statusMessages[msgIdx]);
    }, 4000);

    try {
      const res = await fetch('/api/prospector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: area.trim(), businessTypes: types, count }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setSearchStatus(`Error: ${err.error || 'Search failed'}`);
      }
    } catch (e) {
      setSearchStatus(`Error: ${String(e)}`);
    } finally {
      clearInterval(interval);
      setSearching(false);
      setSearchStatus('');
    }
  };

  const handleAddToPipeline = async (indices: number[]) => {
    const leadsToAdd = indices.map(i => leads[i]).filter(Boolean);
    if (leadsToAdd.length === 0) return;
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch('/api/prospector/add-to-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToAdd }),
      });
      if (res.ok) {
        const data = await res.json();
        setAddResult(data);
        setSelectedLeads(new Set());
      }
    } catch { /* */ } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-wide text-white/90">Lead Prospector</h1>
        <p className="text-sm text-white/40 mt-1">Find contractor businesses and add them to your pipeline</p>
      </div>

      {/* Search Panel */}
      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Target Area</label>
            <input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="e.g. Winter Garden, FL or Orlando, FL"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Number of Leads</label>
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="mt-1 text-sm">
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Business Types</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all duration-200
                  ${selectedTypes.includes(t) ? 'bg-accent/20 border-accent/30 text-accent' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
              >
                {t}
              </button>
            ))}
            <input
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="Custom type..."
              className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-transparent text-white/60 w-32"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || !area.trim() || (selectedTypes.length === 0 && !customType.trim())}
          className="px-6 py-3 rounded-xl bg-accent/20 border border-accent/30 text-accent font-medium hover:bg-accent/30 transition-all duration-200 glow-accent disabled:opacity-40"
        >
          {searching ? 'Searching...' : 'Find Leads'}
        </button>
      </div>

      {/* Loading */}
      {searching && (
        <div className="glass p-8 mb-6 text-center">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-accent/40 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-sm text-white/60">{searchStatus}</p>
        </div>
      )}

      {/* Add Result */}
      {addResult && (
        <div className="glass p-4 mb-6 border border-emerald-400/20">
          <p className="text-sm text-emerald-400">{addResult.added} lead{addResult.added !== 1 ? 's' : ''} added to pipeline</p>
          {addResult.duplicates > 0 && <p className="text-xs text-amber-400 mt-1">{addResult.duplicates} duplicate{addResult.duplicates !== 1 ? 's' : ''} skipped</p>}
        </div>
      )}

      {/* Results */}
      {leads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-white/40">{leads.length} Leads Found</h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-white/40 hover:text-white/60">
                {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedLeads.size > 0 && (
                <button
                  onClick={() => handleAddToPipeline(Array.from(selectedLeads))}
                  disabled={adding}
                  className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all disabled:opacity-40"
                >
                  {adding ? 'Adding...' : `Add ${selectedLeads.size} to Pipeline`}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {leads.map((lead, i) => {
              const isExpanded = expandedLead === lead.businessName;
              const isSelected = selectedLeads.has(i);
              const wasAdded = addResult?.results?.find((r: any) => r.businessName === lead.businessName);

              return (
                <div key={i} className={`glass p-5 transition-all duration-200 ${isSelected ? 'ring-1 ring-accent/30' : ''}`}>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectLead(i)}
                      className="w-4 h-4 rounded accent-cyan-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white/90">{lead.businessName}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${SCORE_BADGE[lead.scoreLabel] || ''}`}>
                          {lead.scoreLabel} ({lead.leadScore})
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${WEB_GRADE[lead.websiteQuality] || 'text-white/30 bg-white/5'}`}>
                          {lead.websiteQuality}
                        </span>
                        {wasAdded && (
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${wasAdded.status === 'added' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                            {wasAdded.status === 'added' ? 'Added' : 'Duplicate'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        <span>{lead.tradeType}</span>
                        <span>{lead.city}, {lead.state}</span>
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.googleRating > 0 && <span>{'★'.repeat(Math.round(lead.googleRating))} {lead.googleRating}</span>}
                      </div>
                    </div>

                    {lead.website && lead.website !== 'N/A' ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent/80 shrink-0">Visit Site</a>
                    ) : (
                      <span className="text-xs text-red-400/60 bg-red-400/10 px-2 py-0.5 rounded shrink-0">No Website</span>
                    )}

                    <button
                      onClick={() => setExpandedLead(isExpanded ? null : lead.businessName)}
                      className="text-xs text-white/30 hover:text-white/60 shrink-0"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>

                    {!wasAdded && (
                      <button
                        onClick={() => handleAddToPipeline([i])}
                        disabled={adding}
                        className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-all disabled:opacity-40 shrink-0"
                      >
                        + Pipeline
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/30 mb-1">Description</p>
                        <p className="text-sm text-white/60">{lead.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/30 mb-1">Online Presence</p>
                        <p className="text-sm text-white/60">{lead.onlinePresenceNotes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/30 mb-1">Services</p>
                        <p className="text-sm text-white/60">{lead.servicesOffered}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/30 mb-1">Recommended Package</p>
                        <p className="text-sm text-accent">{lead.recommendedPackage}</p>
                      </div>
                      {lead.salesPitch && (
                        <div className="col-span-2">
                          <p className="text-xs text-white/30 mb-1">AI Sales Pitch</p>
                          <p className="text-sm text-white/70 italic">&ldquo;{lead.salesPitch}&rdquo;</p>
                          {lead.pitchAngle && <p className="text-xs text-white/30 mt-1">Angle: {lead.pitchAngle}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
