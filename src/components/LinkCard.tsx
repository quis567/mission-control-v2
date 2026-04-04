'use client';

import { useState } from 'react';

interface LinkCardProps {
  link: {
    id: string;
    label: string;
    url?: string | null;
    category?: string | null;
    username?: string | null;
    password?: string | null;
  };
}

export default function LinkCard({ link }: LinkCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80">{link.label}</span>
          {link.category && <span className="text-xs text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{link.category}</span>}
        </div>
        {link.url && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent/80">Open</a>
        )}
      </div>
      {(link.username || link.password) && (
        <div className="flex gap-4 text-xs text-white/40 mt-2 pt-2 border-t border-white/5">
          {link.username && <span>User: {link.username}</span>}
          {link.password && (
            <span className="cursor-pointer" onClick={() => setRevealed(!revealed)}>
              Pass: {revealed ? link.password : '••••••'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
