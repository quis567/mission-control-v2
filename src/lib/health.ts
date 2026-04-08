import tls from 'tls';
import { URL } from 'url';

export interface HealthResult {
  url: string;
  uptime: boolean | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  pagespeedMobile: number | null;
  pagespeedDesktop: number | null;
  lcpMs: number | null;
  clsScore: number | null;
  inpMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: Date | null;
  sslIssuer: string | null;
  netlifyState: string | null;
  netlifyDeployedAt: Date | null;
  raw: unknown;
}

async function checkUptime(url: string): Promise<{ uptime: boolean; status: number | null; responseTimeMs: number | null }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return { uptime: res.ok, status: res.status, responseTimeMs: Date.now() - start };
  } catch {
    return { uptime: false, status: null, responseTimeMs: Date.now() - start };
  }
}

async function checkSsl(url: string): Promise<{ valid: boolean | null; expiresAt: Date | null; issuer: string | null }> {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') return { valid: false, expiresAt: null, issuer: null };

    return await new Promise((resolve) => {
      const socket = tls.connect(
        { host: hostname, port: 443, servername: hostname, timeout: 10000 },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || Object.keys(cert).length === 0) {
            resolve({ valid: false, expiresAt: null, issuer: null });
            return;
          }
          resolve({
            valid: socket.authorized,
            expiresAt: cert.valid_to ? new Date(cert.valid_to) : null,
            issuer: (Array.isArray(cert.issuer?.O) ? cert.issuer.O[0] : cert.issuer?.O) || (Array.isArray(cert.issuer?.CN) ? cert.issuer.CN[0] : cert.issuer?.CN) || null,
          });
        },
      );
      socket.on('error', () => resolve({ valid: false, expiresAt: null, issuer: null }));
      socket.on('timeout', () => { socket.destroy(); resolve({ valid: null, expiresAt: null, issuer: null }); });
    });
  } catch {
    return { valid: null, expiresAt: null, issuer: null };
  }
}

async function checkPagespeed(url: string, strategy: 'mobile' | 'desktop'): Promise<{ score: number | null; lcp: number | null; cls: number | null; inp: number | null; raw: unknown }> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.append('category', 'performance');
  if (key) endpoint.searchParams.set('key', key);

  try {
    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { score: null, lcp: null, cls: null, inp: null, raw: { error: res.status } };
    const data = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    const audits = data?.lighthouseResult?.audits || {};
    return {
      score: typeof score === 'number' ? Math.round(score * 100) : null,
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      inp: audits['interaction-to-next-paint']?.numericValue ?? null,
      raw: data?.loadingExperience ?? null,
    };
  } catch (e) {
    return { score: null, lcp: null, cls: null, inp: null, raw: { error: String(e) } };
  }
}

async function checkNetlify(siteId: string): Promise<{ state: string | null; deployedAt: Date | null; raw: unknown }> {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) return { state: null, deployedAt: null, raw: { error: 'no token' } };

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { state: null, deployedAt: null, raw: { error: res.status } };
    const deploys = await res.json();
    const latest = Array.isArray(deploys) ? deploys[0] : null;
    if (!latest) return { state: null, deployedAt: null, raw: null };
    return {
      state: latest.state || null,
      deployedAt: latest.published_at ? new Date(latest.published_at) : latest.created_at ? new Date(latest.created_at) : null,
      raw: { id: latest.id, state: latest.state, branch: latest.branch },
    };
  } catch (e) {
    return { state: null, deployedAt: null, raw: { error: String(e) } };
  }
}

export async function runHealthCheck(url: string, netlifySiteId?: string | null): Promise<HealthResult> {
  const [uptime, ssl, mobile, desktop, netlify] = await Promise.all([
    checkUptime(url),
    checkSsl(url),
    checkPagespeed(url, 'mobile'),
    checkPagespeed(url, 'desktop'),
    netlifySiteId ? checkNetlify(netlifySiteId) : Promise.resolve({ state: null, deployedAt: null, raw: null }),
  ]);

  return {
    url,
    uptime: uptime.uptime,
    httpStatus: uptime.status,
    responseTimeMs: uptime.responseTimeMs,
    pagespeedMobile: mobile.score,
    pagespeedDesktop: desktop.score,
    lcpMs: mobile.lcp !== null ? Math.round(mobile.lcp) : null,
    clsScore: mobile.cls,
    inpMs: mobile.inp !== null ? Math.round(mobile.inp) : null,
    sslValid: ssl.valid,
    sslExpiresAt: ssl.expiresAt,
    sslIssuer: ssl.issuer,
    netlifyState: netlify.state,
    netlifyDeployedAt: netlify.deployedAt,
    raw: { uptime, ssl, mobile: mobile.raw, desktop: desktop.raw, netlify: netlify.raw },
  };
}
