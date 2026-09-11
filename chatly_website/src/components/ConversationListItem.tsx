import { Avatar } from './Avatar';
import { conversationPeer, conversationTitle } from '../lib/conversations';
import { formatListTimestamp, messagePreview } from '../lib/format';
import type { Conversation } from '../lib/types';

type ConversationListItemProps = {
  conversation: Conversation;
  currentUserId: string;
  selected: boolean;
  onSelect: (conversationId: string) => void;
};

export function ConversationListItem({
  conversation,
  currentUserId,
  selected,
  onSelect,
}: ConversationListItemProps) {
  const peer = conversationPeer(conversation, currentUserId);
  const title = conversationTitle(conversation, currentUserId);
  const last = conversation.lastMessage;

  const preview = last
    ? `${last.sender.id === currentUserId ? 'You: ' : ''}${messagePreview(
        last.messageType,
        last.content,
      )}`
    : 'No messages yet';

  const unread = conversation.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
        selected
          ? 'bg-brand/10 dark:bg-brand/20'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <Avatar
        name={title}
        url={peer?.avatarUrl ?? null}
        size={46}
        isOnline={peer?.isOnline ?? undefined}
        showStatus={Boolean(peer)}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              unread > 0
                ? 'font-bold text-canvas-night dark:text-canvas'
                : 'font-semibold text-canvas-night dark:text-canvas'
            }`}
          >
            {title}
          </span>
          {last && (
            <span className="shrink-0 text-[11px] text-muted">
              {formatListTimestamp(last.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={`truncate text-xs ${
              unread > 0 ? 'font-semibold text-canvas-night dark:text-canvas' : 'text-muted'
            }`}
          >
            {preview}
          </span>
          {unread > 0 && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
