export interface SeoPageData {
  pageTitle?: string | null;
  titleLength?: number | null;
  metaDescription?: string | null;
  metaDescLength?: number | null;
  h1Tag?: string | null;
  h1Count?: number | null;
  headingStructure?: string | null;
  imagesTotal?: number | null;
  imagesWithAlt?: number | null;
  internalLinks?: number | null;
  externalLinks?: number | null;
  wordCount?: number | null;
  targetKeyword?: string | null;
  keywordDensity?: number | null;
}

export function calculateSeoScore(page: SeoPageData): number {
  let score = 0;

  // Title tag present and 50-60 chars → +15
  if (page.pageTitle) {
    const len = page.titleLength || page.pageTitle.length;
    if (len >= 50 && len <= 60) score += 15;
    else if (len > 0) score += 8;
  }

  // Meta description present and 150-160 chars → +15
  if (page.metaDescription) {
    const len = page.metaDescLength || page.metaDescription.length;
    if (len >= 150 && len <= 160) score += 15;
    else if (len > 0) score += 8;
  }

  // Single H1 tag present → +10
  if (page.h1Count === 1) score += 10;
  else if (page.h1Tag && page.h1Count !== 0) score += 5;

  // Proper heading hierarchy → +10
  if (page.headingStructure) {
    try {
      const structure = JSON.parse(page.headingStructure);
      if (structure.h2 > 0) score += 5;
      if (structure.h3 > 0 && structure.h2 > 0) score += 5;
    } catch { /* skip */ }
  }

  const kw = page.targetKeyword?.toLowerCase() || '';

  // Target keyword in title → +10
  if (kw && page.pageTitle?.toLowerCase().includes(kw)) score += 10;

  // Target keyword in meta description → +5
  if (kw && page.metaDescription?.toLowerCase().includes(kw)) score += 5;

  // Target keyword in H1 → +5
  if (kw && page.h1Tag?.toLowerCase().includes(kw)) score += 5;

  // All images have alt text → +10
  if (page.imagesTotal != null && page.imagesTotal > 0) {
    if (page.imagesWithAlt === page.imagesTotal) score += 10;
    else if (page.imagesWithAlt && page.imagesWithAlt > 0) score += 5;
  } else if (page.imagesTotal === 0) {
    score += 10; // no images = no alt text issues
  }

  // Word count > 300 → +10
  if (page.wordCount && page.wordCount > 300) score += 10;
  else if (page.wordCount && page.wordCount > 100) score += 5;

  // At least 1 internal link → +5
  if (page.internalLinks && page.internalLinks > 0) score += 5;

  // At least 1 external link → +5
  if (page.externalLinks && page.externalLinks > 0) score += 5;

  return Math.min(score, 100);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 50) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-red-400/10 border-red-400/20';
}
