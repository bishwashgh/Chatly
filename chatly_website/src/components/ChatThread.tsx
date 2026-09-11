import { useEffect, useMemo, useRef } from 'react';
import type { ApolloError } from '@apollo/client';
import { Phone, RefreshCw, Video as VideoIcon } from 'lucide-react';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { EmptyState, LoadingState } from './Spinner';
import { ErrorMessage } from './ErrorMessage';
import { formatDayLabel, isSameDay, readableError } from '../lib/format';
import type { CallType, Conversation, Message } from '../lib/types';

type ChatThreadProps = {
  conversation: Conversation;
  conversationTitle: string;
  peer?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isOnline?: boolean | null;
  } | null;
  messages: Message[];
  loading: boolean;
  error?: ApolloError;
  currentUserId: string;
  peerTyping: boolean;
  onRefetch: () => void;
  onReact: (message: Message, emoji: string) => void;
  onDelete: (message: Message) => void;
  onOpenImage: (url: string) => void;
  /** Only friends can be called, so this is optional. */
  onStartCall?: (callType: CallType) => void;
};

export function ChatThread({
  conversation,
  conversationTitle,
  peer,
  messages,
  loading,
  error,
  currentUserId,
  peerTyping,
  onRefetch,
  onReact,
  onDelete,
  onOpenImage,
  onStartCall,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  // Group consecutive messages from the same sender within the same day.
  const items = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1];
      const next = messages[index + 1];

      const showDay =
        !previous || !isSameDay(previous.createdAt, message.createdAt);

      const showSender =
        !previous ||
        showDay ||
        previous.sender.id !== message.sender.id;

      const groupedWithNext =
        Boolean(next) &&
        next.sender.id === message.sender.id &&
        isSameDay(next.createdAt, message.createdAt);

      return { message, showDay, showSender, groupedWithNext };
    });
  }, [messages]);

  // Track whether the reader is pinned to the bottom before new content lands.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    wasNearBottomRef.current = distanceFromBottom < 160;
  }, [messages.length]);

  useEffect(() => {
    if (!wasNearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, peerTyping]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col bg-canvas-low dark:bg-canvas-night">
        <ThreadHeader
        conversation={conversation}
        title={conversationTitle}
        peer={peer}
        onStartCall={onStartCall}
      />
        <LoadingState label="Loading messages…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas-low dark:bg-canvas-night">
      <ThreadHeader
        conversation={conversation}
        title={conversationTitle}
        peer={peer}
        onStartCall={onStartCall}
      />

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto py-4">
        {error && messages.length === 0 ? (
          <div className="mx-auto max-w-md px-4">
            <ErrorMessage message={readableError(error)} />
            <button type="button" onClick={onRefetch} className="btn-ghost mt-3 w-full">
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description={`Say hello to ${conversationTitle}.`}
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map(({ message, showDay, showSender, groupedWithNext }) => (
              <div key={message.id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-muted dark:bg-white/10">
                      {formatDayLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                {/* Own messages in a direct chat never repeat the sender label. */}
                <MessageBubble
                  message={message}
                  isMine={message.sender.id === currentUserId}
                  currentUserId={currentUserId}
                  showSender={showSender && conversation.isGroup}
                  groupedWithNext={groupedWithNext}
                  onReact={onReact}
                  onDelete={onDelete}
                  onOpenImage={onOpenImage}
                />
              </div>
            ))}

            {peerTyping && (
              <div className="flex items-center gap-2 px-4 pt-2">
                <div className="flex items-center gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-card dark:bg-canvas-nightLow">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-muted animate-dot-pulse"
                      style={{ animationDelay: `${dot * 0.18}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {peer?.name ?? conversationTitle} is typing…
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <Composer conversationId={conversation.id} onSent={onRefetch} />
    </div>
  );
}

function ThreadHeader({
  conversation,
  title,
  peer,
  onStartCall,
}: {
  conversation: Conversation;
  title: string;
  peer?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isOnline?: boolean | null;
  } | null;
  onStartCall?: (callType: CallType) => void;
}) {
  // Calls are 1:1 and friends-only, so buttons only appear for direct chats.
  return (
    <header className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-canvas-nightAlt">
      <Avatar
        name={title}
        url={peer?.avatarUrl ?? null}
        size={40}
        isOnline={peer?.isOnline ?? undefined}
        showStatus={Boolean(peer)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-canvas-night dark:text-canvas">{title}</p>
        <p className="truncate text-xs text-muted">
          {conversation.isGroup
            ? `${conversation.participants.length} members`
            : peer?.isOnline
              ? 'Active now'
              : 'Offline'}
        </p>
      </div>

      {peer && onStartCall && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStartCall('AUDIO')}
            className="icon-btn"
            aria-label={`Start a voice call with ${peer.name}`}
            title="Voice call"
          >
            <Phone size={17} />
          </button>
          <button
            type="button"
            onClick={() => onStartCall('VIDEO')}
            className="icon-btn"
            aria-label={`Start a video call with ${peer.name}`}
            title="Video call"
          >
            <VideoIcon size={17} />
          </button>
        </div>
      )}
    </header>
  );
}
