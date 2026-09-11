import { MessageCircle } from 'lucide-react';

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 40, className = '' }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-light text-white shadow-card ${className}`}
      style={{ width: size, height: size, borderRadius: Math.max(12, size * 0.3) }}
      aria-hidden="true"
    >
      <MessageCircle size={Math.round(size * 0.55)} />
    </span>
  );
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={42} />
      <div className="leading-tight">
        <p className="text-lg font-bold text-canvas-night dark:text-canvas">Chatly</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
