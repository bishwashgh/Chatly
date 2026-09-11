import { AlertCircle, Info, X } from 'lucide-react';
import { useCall } from '../context/CallContext';

/**
 * Call outcomes happen outside the call overlay: `startCall` can fail before
 * any call UI exists (for example calling a non-friend, since the backend
 * restricts calls to friends), and a declined or cancelled call tears the
 * overlay down. Surface both here.
 */
export function CallToast() {
  const { error, notice, phase, dismissError, dismissNotice } = useCall();

  // While a call is on screen the overlay shows its own banners.
  if (phase !== 'idle') return null;

  const isError = Boolean(error);
  const message = error ?? notice;
  if (!message) return null;

  const dismiss = isError ? dismissError : dismissNotice;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 animate-fade-in">
      <div
        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-panel ${
          isError
            ? 'border-danger/30 text-danger'
            : 'border-black/10 text-canvas-night dark:border-white/15 dark:text-canvas'
        } bg-white dark:bg-canvas-nightAlt`}
        role="status"
      >
        {isError ? (
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <Info size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 leading-snug">{message}</span>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Dismiss call message"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
