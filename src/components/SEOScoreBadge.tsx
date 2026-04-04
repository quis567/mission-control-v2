'use client';

const SCORE_COLOR = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
const SCORE_BG = (s: number) => s >= 80 ? 'bg-emerald-400/10 border-emerald-400/20' : s >= 50 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20';

interface SEOScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function SEOScoreBadge({ score, size = 'md' }: SEOScoreBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center border ${SCORE_BG(score)}`}>
      <span className={`font-medium ${SCORE_COLOR(score)}`}>{score}</span>
    </div>
  );
}

export { SCORE_COLOR, SCORE_BG };
