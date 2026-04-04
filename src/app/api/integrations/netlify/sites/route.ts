import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'NETLIFY_ACCESS_TOKEN not configured' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Netlify API error: ${res.status}` }, { status: res.status });
    }

    const sites = await res.json();

    const mapped = sites.map((s: any) => ({
      id: s.id,
      name: s.name,
      url: s.ssl_url || s.url,
      customDomain: s.custom_domain,
      lastDeploy: s.published_deploy?.created_at || null,
      deployState: s.published_deploy?.state || 'unknown',
      sslState: s.ssl?.state || null,
      sslExpires: s.ssl?.expires_at || null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
