import { AlertCircle } from 'lucide-react';

export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}
