export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto" style={{ marginLeft: '-5rem' }}>
      {children}
    </div>
  );
}
