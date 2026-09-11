import { initialsOf } from '../lib/format';

type AvatarProps = {
  name?: string | null;
  url?: string | null;
  size?: number;
  isOnline?: boolean | null;
  showStatus?: boolean;
  className?: string;
};

const PALETTE = ['#006E28', '#0070EB', '#9C413D', '#7A4FBF', '#0F7B8A', '#B26B00'];

function colorFor(name?: string | null): string {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  name,
  url,
  size = 44,
  isOnline,
  showStatus = false,
  className = '',
}: AvatarProps) {
  const dimension = { width: size, height: size, minWidth: size };
  const statusSize = Math.max(9, Math.round(size * 0.26));

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={dimension}>
      {url ? (
        <img
          src={url}
          alt={name ?? 'User avatar'}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ backgroundColor: colorFor(name), fontSize: Math.max(11, size * 0.36) }}
          aria-hidden="true"
        >
          {initialsOf(name)}
        </span>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-canvas-nightAlt ${
            isOnline ? 'bg-brand-light' : 'bg-muted'
          }`}
          style={{ width: statusSize, height: statusSize }}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}
