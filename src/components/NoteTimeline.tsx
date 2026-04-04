'use client';

interface NoteTimelineProps {
  notes: { id: string; content: string; createdAt: string }[];
}

export default function NoteTimeline({ notes }: NoteTimelineProps) {
  if (notes.length === 0) {
    return <div className="glass p-8 text-center text-white/30 text-sm">No notes yet</div>;
  }

  return (
    <div className="space-y-3">
      {notes.map(note => (
        <div key={note.id} className="glass-subtle p-4">
          <p className="text-sm text-white/70 whitespace-pre-wrap">{note.content}</p>
          <p className="text-xs text-white/20 mt-2">{new Date(note.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
