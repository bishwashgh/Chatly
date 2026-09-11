import { AlertCircle, X } from 'lucide-react';
import { useCall } from '../context/CallContext';

/**
 * `startCall` can fail before any call UI exists (for example when the backend
 * rejects a call to a non-friend). Surface those failures as a toast.
 */
export function CallErrorToast() {
  const { error, phase, dismissError } = useCall();

  if (!error || phase !== 'idle') return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 animate-fade-in">
      <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-white px-3 py-2.5 text-sm text-danger shadow-panel dark:bg-canvas-nightAlt">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-snug">{error}</span>
        <button
          type="button"
          onClick={dismissError}
          className="rounded-lg p-1 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Dismiss call error"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
