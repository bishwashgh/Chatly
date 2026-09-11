import { useEffect } from 'react';
import { X } from 'lucide-react';

type LightboxProps = {
  url: string | null;
  onClose: () => void;
};

export function Lightbox({ url, onClose }: LightboxProps) {
  useEffect(() => {
    if (!url) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close image preview"
      >
        <X size={20} />
      </button>

      <img
        src={url}
        alt="Shared attachment"
        className="max-h-full max-w-full rounded-xl object-contain shadow-pop"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
