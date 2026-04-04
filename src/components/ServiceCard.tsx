'use client';

const SERVICE_STATUS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-amber-400 bg-amber-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  completed: 'text-white/40 bg-white/5',
};

interface ServiceCardProps {
  service: {
    id: string;
    serviceType: string;
    status: string;
    billingType?: string | null;
    price?: number | null;
  };
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="glass p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-white/80">{service.serviceType}</p>
        <div className="flex gap-3 mt-1 text-xs text-white/30">
          <span>{service.billingType}</span>
          {service.price != null && <span className="text-emerald-400/60">${service.price.toLocaleString()}</span>}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-lg ${SERVICE_STATUS[service.status] || ''}`}>
        {service.status}
      </span>
    </div>
  );
}

export { SERVICE_STATUS };
