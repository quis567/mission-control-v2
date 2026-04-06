import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

// Public endpoint — no auth required
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Ensure bucket exists
    await supabase.storage.createBucket('change-requests', { public: true }).catch(() => {});

    const uploaded: { name: string; url: string }[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${uuid()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await supabase.storage
        .from('change-requests')
        .upload(path, buffer, { contentType: file.type });

      if (!error) {
        const { data } = supabase.storage.from('change-requests').getPublicUrl(path);
        uploaded.push({ name: file.name, url: data.publicUrl });
      }
    }

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
