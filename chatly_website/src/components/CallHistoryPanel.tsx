import { useQuery } from '@apollo/client';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, RefreshCw, Video } from 'lucide-react';
import { Avatar } from './Avatar';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState, LoadingState } from './Spinner';
import { CALL_LOG_QUERY } from '../graphql/operations';
import { formatListTimestamp, readableError } from '../lib/format';
import type { CallLogEntry, CallStatus, CallType } from '../lib/types';

const STATUS_LABELS: Record<CallStatus, string> = {
  RINGING: 'Ringing',
  ACCEPTED: 'Completed',
  DECLINED: 'Declined',
  ENDED: 'Ended',
  MISSED: 'Missed',
};

type CallHistoryPanelProps = {
  onCallBack: (peer: CallLogEntry['peer'], callType: CallType) => void;
};

export function CallHistoryPanel({ onCallBack }: CallHistoryPanelProps) {
  const { data, loading, error, refetch } = useQuery<{ callLog: CallLogEntry[] }>(
    CALL_LOG_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const entries = data?.callLog ?? [];

  if (loading && entries.length === 0) {
    return <LoadingState label="Loading call history…" />;
  }

  if (error && entries.length === 0) {
    return (
      <div className="p-4">
        <ErrorMessage message={readableError(error)} />
        <button
          type="button"
          onClick={() => void refetch().catch(() => {})}
          className="btn-ghost mt-3 w-full"
        >
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No calls yet"
        description="Voice and video calls you make or receive will be listed here."
        icon={<Phone size={22} />}
      />
    );
  }

  return (
    <ul className="divide-y divide-black/5 dark:divide-white/5">
      {entries.map((entry) => {
        const missed = entry.status === 'MISSED' || entry.status === 'DECLINED';
        const StatusIcon = missed
          ? PhoneMissed
          : entry.status === 'ACCEPTED'
            ? PhoneIncoming
            : PhoneOutgoing;

        return (
          <li
            key={entry.id}
            className="flex items-center gap-3 px-3 py-3 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Avatar
              name={entry.peer?.name}
              url={entry.peer?.avatarUrl}
              size={42}
              isOnline={entry.peer?.isOnline}
              showStatus
            />

            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm ${
                  missed ? 'font-semibold text-danger' : 'font-semibold text-canvas-night dark:text-canvas'
                }`}
              >
                {entry.peer?.name ?? 'Unknown'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <StatusIcon size={12} className="shrink-0" />
                {STATUS_LABELS[entry.status] ?? entry.status}
                <span aria-hidden="true">·</span>
                {formatListTimestamp(entry.startedAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onCallBack(entry.peer, 'AUDIO')}
              className="icon-btn h-8 w-8"
              aria-label={`Call ${entry.peer?.name} with voice`}
              title="Voice call"
            >
              <Phone size={15} />
            </button>
            <button
              type="button"
              onClick={() => onCallBack(entry.peer, 'VIDEO')}
              className="icon-btn h-8 w-8"
              aria-label={`Call ${entry.peer?.name} with video`}
              title="Video call"
            >
              <Video size={15} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
