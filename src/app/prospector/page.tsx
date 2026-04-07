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
  id: number;
  businessName: string;
  tradeType: string;
  contactName: string | null;
  email: string | null;
  phone: string;
  website: string;
  googleRating: number;
  address: string;
  city: string;
  state: string;
  description: string;
  servicesOffered: string;
  yearsInBusiness: number;
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
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [imports, setImports] = useState<Array<{ id: string; area: string; createdAt: string; leadsCount: number; leads: Lead[] }>>([]);
  const [showImports, setShowImports] = useState(false);

  const loadImports = async () => {
    try {
      const res = await fetch('/api/prospector/imports');
      if (res.ok) {
        const data = await res.json();
        setImports(data.imports || []);
      }
    } catch { /* */ }
  };

  useEffect(() => {
    loadImports();
  }, []);

  // Load persisted leads on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prospector_leads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setLeads(parsed);
      }
      const savedArea = localStorage.getItem('prospector_area');
      if (savedArea) setArea(savedArea);
    } catch { /* */ }
  }, []);

  // Persist leads whenever they change
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('prospector_leads', JSON.stringify(leads));
      localStorage.setItem('prospector_area', area);
    }
  }, [leads, area]);

  const clearResults = () => {
    setLeads([]);
    setSelectedLeads(new Set());
    setAddResult(null);
    setSearchStatus('');
    setError('');
    localStorage.removeItem('prospector_leads');
    localStorage.removeItem('prospector_area');
  };

  const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const toggleSelectLead = (i: number) => {
    setSelectedLeads(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(leads.map((_, i) => i)));
  };

  const handleSearch = async () => {
    const types = [...selectedTypes];
    if (customType.trim()) types.push(customType.trim());
    if (!area.trim() || types.length === 0) return;

    setSearching(true);
    setLeads([]);
    setAddResult(null);
    setSelectedLeads(new Set());
    setError('');
    setSearchStatus('Starting search...');

    try {
      const res = await fetch('/api/prospector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: area.trim(), businessTypes: types, count }),
      });

      if (!res.ok || !res.body) {
        setError('Search request failed. Click Retry.');
        setSearching(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'status') setSearchStatus(data.message);
              else if (eventType === 'lead') setLeads(prev => [...prev, data]);
              else if (eventType === 'error') { setError(data.message); setSearching(false); return; }
              else if (eventType === 'done') setSearchStatus(`Complete — ${data.total} leads found`);
            } catch { /* skip malformed */ }
            eventType = '';
          }
        }
      }
    } catch (e) {
      setError(`Connection error: ${String(e)}. Click Retry.`);
    } finally {
      setSearching(false);
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
    } catch { /* */ } finally { setAdding(false); }
  };

  const handleDownloadXlsx = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Main data sheet
    const wsData = leads.map((l, i) => ({
      'ID': i + 1,
      'Business Name': l.businessName,
      'Trade/Service': l.tradeType,
      'Contact': l.contactName || '',
      'Email': l.email || '',
      'Phone': l.phone || '',
      'Website': l.website || 'N/A',
      'Address': l.address || '',
      'City': l.city || '',
      'State': l.state || '',
      'Google Rating': l.googleRating || 0,
      'Years in Business': l.yearsInBusiness || 0,
      'Services Offered': l.servicesOffered || '',
      'Website Quality': l.websiteQuality || '',
      'Online Presence Notes': l.onlinePresenceNotes || '',
      'Business Summary': l.description || '',
      'Sales Pitch': l.salesPitch || '',
      'Recommended Package': l.recommendedPackage || '',
      'Pitch Angle': l.pitchAngle || '',
      'Lead Score': l.leadScore,
      'Score Label': l.scoreLabel,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 6 }, { wch: 12 },
      { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 35 }, { wch: 40 },
      { wch: 50 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 8 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Email Templates sheet
    const emailData = [
      {
        'Template': 'No Website Outreach',
        'Subject': `${area} businesses need websites — let's talk`,
        'Body': `Hi [Contact Name],\n\nI was researching [Trade Type] businesses in ${area} and noticed [Business Name] doesn't have a website yet. In today's market, over 80% of customers search online before calling — which means you might be missing out on a lot of local leads.\n\nAt TruePath Studios, we specialize in building websites specifically for contractor and trade businesses like yours. Our clients typically see a significant increase in phone calls within the first 60 days.\n\nWe offer a Starter package at $500/month that includes:\n• Professional 5-page responsive website\n• Monthly maintenance and updates\n• Basic local SEO to get you showing up in Google\n\nWould you be open to a quick 15-minute call this week? I'd love to show you what we could build for [Business Name].\n\nBest,\nTruePath Studios\nwww.truepathstudios.com`,
      },
      {
        'Template': 'Website Improvement Outreach',
        'Subject': `Quick idea to get more leads for [Business Name]`,
        'Body': `Hi [Contact Name],\n\nI came across [Business Name]'s website while researching [Trade Type] businesses in ${area}. Your business looks great, and I noticed a few opportunities that could help you get even more leads online.\n\nA few things I noticed:\n• [Specific observation about their website — mobile responsiveness, speed, SEO]\n• Your Google Business listing could be optimized to show up more in local searches\n• There are some quick SEO wins that could boost your visibility\n\nAt TruePath Studios, we specialize in helping contractor and trade businesses improve their online presence. Our Growth package ($1,000/month) includes full website optimization, ongoing SEO, and Google Business Profile management.\n\nWould you be interested in a free website audit? Takes about 5 minutes and I can show you exactly where the opportunities are.\n\nBest,\nTruePath Studios\nwww.truepathstudios.com`,
      },
    ];

    const ws2 = XLSX.utils.json_to_sheet(emailData);
    ws2['!cols'] = [{ wch: 28 }, { wch: 50 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Email Templates');

    XLSX.writeFile(wb, `TruePath_Leads_${area.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-wide text-white/90">Lead Prospector</h1>
        <p className="text-sm text-white/40 mt-1">Find contractor businesses and add them to your pipeline</p>
      </div>

      {/* Search Panel */}
      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Target Area</label>
            <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Winter Garden, FL" className="mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Number of Leads</label>
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="mt-1 text-sm">
              <option value={5}>5</option><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option><option value={25}>25</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Business Types</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map(t => (
              <button key={t} onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all duration-200
                  ${selectedTypes.includes(t) ? 'bg-accent/20 border-accent/30 text-accent' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
              >{t}</button>
            ))}
            <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Custom..." className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-transparent text-white/60 w-28" />
          </div>
        </div>

        <button onClick={handleSearch} disabled={searching || !area.trim() || (selectedTypes.length === 0 && !customType.trim())}
          className="px-6 py-3 rounded-xl bg-accent/20 border border-accent/30 text-accent font-medium hover:bg-accent/30 transition-all duration-200 glow-accent disabled:opacity-40">
          {searching ? 'Searching...' : 'Find Leads'}
        </button>
      </div>

      {/* Auto-Imported Leads (from Claude Desktop / Cowork) */}
      {imports.length > 0 && (
        <div className="glass p-4 mb-6">
          <button
            onClick={() => setShowImports(!showImports)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white/60">
                Auto-Imported Leads ({imports.reduce((sum, i) => sum + i.leadsCount, 0)})
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Leads added via Claude Desktop / lead-gen-auto across {imports.length} import session{imports.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-white/40 text-xs">{showImports ? '▼ Hide' : '▶ Show'}</span>
          </button>

          {showImports && (
            <div className="mt-4 space-y-3">
              {imports.map((imp) => (
                <div key={imp.id} className="border border-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm text-white/80">{imp.area}</span>
                      <span className="ml-3 text-xs text-white/40">
                        {new Date(imp.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-accent">{imp.leadsCount} lead{imp.leadsCount !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => { setLeads(imp.leads); setShowImports(false); }}
                    className="text-xs text-accent/70 hover:text-accent"
                  >
                    Load into table →
                  </button>
                </div>
              ))}
              <button
                onClick={loadImports}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {(searching || searchStatus) && (
        <div className="glass p-4 mb-6">
          {searching && (
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-accent/40 rounded-full transition-all duration-1000" style={{ width: leads.length > 0 ? `${Math.min((leads.length / count) * 100, 95)}%` : '15%' }} />
            </div>
          )}
          <p className="text-sm text-white/60">{searchStatus}</p>
        </div>
      )}

      {/* Error with Retry */}
      {error && (
        <div className="glass p-4 mb-6 border border-red-400/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={handleSearch} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs hover:bg-accent/30">Retry</button>
          </div>
        </div>
      )}

      {/* Add Result */}
      {addResult && (
        <div className="glass p-4 mb-6 border border-emerald-400/20">
          <p className="text-sm text-emerald-400">{addResult.added} lead{addResult.added !== 1 ? 's' : ''} added to pipeline</p>
          {addResult.duplicates > 0 && <p className="text-xs text-amber-400 mt-1">{addResult.duplicates} duplicate{addResult.duplicates !== 1 ? 's' : ''} skipped</p>}
        </div>
      )}

      {/* Results Table */}
      {leads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-white/40">{leads.length} Leads Found</h2>
            <div className="flex gap-2">
              <button onClick={handleDownloadXlsx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all">
                Download Spreadsheet
              </button>
              <button onClick={clearResults} className="px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400/70 text-xs hover:bg-red-400/20 transition-all">
                Clear Results
              </button>
              <button onClick={selectAll} className="text-xs text-white/40 hover:text-white/60 px-3 py-1.5">
                {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedLeads.size > 0 && (
                <button onClick={() => handleAddToPipeline(Array.from(selectedLeads))} disabled={adding}
                  className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all disabled:opacity-40">
                  {adding ? 'Adding...' : `Add ${selectedLeads.size} to Pipeline`}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 text-white/30 font-medium w-8">
                    <input type="checkbox" checked={selectedLeads.size === leads.length && leads.length > 0} onChange={selectAll} className="accent-cyan-500" />
                  </th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">ID</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Business Name</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Trade</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Contact</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Phone</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Email</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Website</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Rating</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Yrs</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Quality</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium">Score</th>
                  <th className="text-left py-3 px-2 text-white/30 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const isSelected = selectedLeads.has(i);
                  const isExpanded = expandedLead === i;
                  const wasAdded = addResult?.results?.find((r: any) => r.businessName === lead.businessName);

                  return (
                    <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-all ${isSelected ? 'bg-accent/5' : ''}`}>
                      <td className="py-3 px-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectLead(i)} className="accent-cyan-500" />
                      </td>
                      <td className="py-3 px-2 text-white/30">{lead.id}</td>
                      <td className="py-3 px-2">
                        <button onClick={() => setExpandedLead(isExpanded ? null : i)} className="text-white/80 hover:text-accent text-left">
                          {lead.businessName}
                        </button>
                        {wasAdded && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${wasAdded.status === 'added' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                            {wasAdded.status === 'added' ? 'Added' : 'Dup'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-white/50">{lead.tradeType}</td>
                      <td className="py-3 px-2 text-white/50">{lead.contactName || '—'}</td>
                      <td className="py-3 px-2 text-white/50">{lead.phone || '—'}</td>
                      <td className="py-3 px-2 text-white/50">{lead.email || '—'}</td>
                      <td className="py-3 px-2">
                        {lead.website && lead.website !== 'N/A' ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-accent/70 hover:text-accent truncate block max-w-[150px]">{lead.website.replace(/^https?:\/\//, '')}</a>
                        ) : (
                          <span className="text-red-400/60">No Website</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-white/50">{lead.googleRating > 0 ? `${lead.googleRating}★` : '—'}</td>
                      <td className="py-3 px-2 text-white/50">{lead.yearsInBusiness > 0 ? lead.yearsInBusiness : '—'}</td>
                      <td className="py-3 px-2">
                        <span className={`px-1.5 py-0.5 rounded ${WEB_GRADE[lead.websiteQuality] || 'text-white/30 bg-white/5'}`}>{lead.websiteQuality}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-1.5 py-0.5 rounded ${SCORE_BADGE[lead.scoreLabel] || ''}`}>{lead.leadScore}</span>
                      </td>
                      <td className="py-3 px-2">
                        {!wasAdded && (
                          <button onClick={() => handleAddToPipeline([i])} disabled={adding} className="text-accent/60 hover:text-accent">+</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Detail */}
          {expandedLead !== null && leads[expandedLead] && (
            <div className="glass p-6 mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/80">{leads[expandedLead].businessName}</h3>
                <button onClick={() => setExpandedLead(null)} className="text-xs text-white/30 hover:text-white/60">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-white/30 mb-1">Address</p>
                  <p className="text-white/60">{leads[expandedLead].address}, {leads[expandedLead].city}, {leads[expandedLead].state}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Services Offered</p>
                  <p className="text-white/60">{leads[expandedLead].servicesOffered}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Business Summary</p>
                  <p className="text-white/60">{leads[expandedLead].description}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Online Presence</p>
                  <p className="text-white/60">{leads[expandedLead].onlinePresenceNotes}</p>
                </div>
                {leads[expandedLead].salesPitch && (
                  <div className="col-span-2">
                    <p className="text-xs text-white/30 mb-1">AI Sales Pitch</p>
                    <p className="text-white/70 italic">&ldquo;{leads[expandedLead].salesPitch}&rdquo;</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-accent">Package: {leads[expandedLead].recommendedPackage}</span>
                      {leads[expandedLead].pitchAngle && <span className="text-white/30">Angle: {leads[expandedLead].pitchAngle}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
