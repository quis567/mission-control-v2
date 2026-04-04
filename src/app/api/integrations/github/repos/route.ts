import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_ACCESS_TOKEN not configured' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API error: ${res.status}` }, { status: res.status });
    }

    const repos = await res.json();

    const mapped = repos.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      updatedAt: r.updated_at,
      pushedAt: r.pushed_at,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
