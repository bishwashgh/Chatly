import { useState } from 'react';
import { Check, CheckCheck, Download, FileText, Smile, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { formatTime, isImageUrl } from '../lib/format';
import type { Message } from '../lib/types';

const QUICK_REACTIONS = ['\u2764\uFE0F', '\u{1F602}', '\u{1F44D}', '\u{1F62E}', '\u{1F622}'];

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  currentUserId: string;
  showSender: boolean;
  groupedWithNext: boolean;
  onReact: (message: Message, emoji: string) => void;
  onDelete: (message: Message) => void;
  onOpenImage: (url: string) => void;
};

export function MessageBubble({
  message,
  isMine,
  currentUserId,
  showSender,
  groupedWithNext,
  onReact,
  onDelete,
  onOpenImage,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  // Collapse duplicate reaction glyphs into a count, e.g. "👍 2".
  const groupedReactions = (message.reactions ?? []).reduce<
    Record<string, { emoji: string; count: number; mine: boolean }>
  >((accumulator, reaction) => {
    const existing = accumulator[reaction.emoji];
    if (existing) {
      existing.count += 1;
      existing.mine = existing.mine || reaction.user.id === currentUserId;
    } else {
      accumulator[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 1,
        mine: reaction.user.id === currentUserId,
      };
    }
    return accumulator;
  }, {});

  const reactionList = Object.values(groupedReactions);
  const hasReactions = reactionList.length > 0;

  return (
    <div
      className={`group flex w-full gap-2 px-3 sm:px-4 ${isMine ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMine && (
        <div className="w-8 shrink-0 self-end">
          {showSender && (
            <Avatar name={message.sender.name} url={message.sender.avatarUrl} size={32} />
          )}
        </div>
      )}

      <div className={`flex max-w-[76%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {showSender && !isMine && (
          <span className="mb-1 px-1 text-xs font-semibold text-brand dark:text-brand-bright">
            {message.sender.name}
          </span>
        )}

        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* Hover actions sit opposite the bubble, mirroring the mobile long-press menu. */}
          <div
            className={`flex items-center gap-0.5 pb-1 transition-opacity ${
              showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative">
              <button
                type="button"
                className="icon-btn h-7 w-7"
                aria-label="React to message"
                onClick={() => setShowActions((previous) => !previous)}
              >
                <Smile size={15} />
              </button>
              {showActions && (
                <div
                  className={`absolute bottom-9 z-20 flex gap-1 rounded-full border border-black/5 bg-white px-2 py-1.5 shadow-pop dark:border-white/10 dark:bg-canvas-nightLow ${
                    isMine ? 'right-0' : 'left-0'
                  }`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onReact(message, emoji)}
                      className="rounded-full px-1 text-lg transition hover:scale-125"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isMine && (
              <button
                type="button"
                className="icon-btn h-7 w-7 hover:text-danger"
                aria-label="Delete message"
                onClick={() => onDelete(message)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div
            className={[
              'relative rounded-2xl px-3.5 py-2 text-sm shadow-card',
              isMine
                ? 'bg-accent text-white'
                : 'bg-white text-canvas-night dark:bg-canvas-nightLow dark:text-canvas',
              groupedWithNext ? (isMine ? 'rounded-br-md' : 'rounded-bl-md') : '',
            ].join(' ')}
          >
            <MessageContent message={message} isMine={isMine} onOpenImage={onOpenImage} />

            <div className="mt-1 flex items-center justify-end gap-1">
              <span
                className={`text-[10px] ${isMine ? 'text-white/80' : 'text-muted'}`}
              >
                {formatTime(message.createdAt)}
              </span>
              {isMine &&
                (message.isRead ? (
                  <CheckCheck size={13} className="text-white" aria-label="Read" />
                ) : message.isDelivered ? (
                  <Check size={13} className="text-white/85" aria-label="Delivered" />
                ) : (
                  <Check size={13} className="text-white/55" aria-label="Sent" />
                ))}
            </div>
          </div>
        </div>

        {hasReactions && (
          <div className={`-mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end pr-1' : 'pl-1'}`}>
            {reactionList.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact(message, reaction.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                  reaction.mine
                    ? 'border-brand/40 bg-brand/10 text-brand dark:text-brand-bright'
                    : 'border-black/10 bg-white text-canvas-night dark:border-white/10 dark:bg-canvas-nightLow dark:text-canvas'
                }`}
                aria-label={`${reaction.emoji} reaction, ${reaction.count}`}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 && <span className="font-semibold">{reaction.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({
  message,
  isMine,
  onOpenImage,
}: {
  message: Message;
  isMine: boolean;
  onOpenImage: (url: string) => void;
}) {
  const { mediaUrl, messageType, content } = message;

  if (messageType === 'IMAGE' && mediaUrl) {
    return (
      <button type="button" onClick={() => onOpenImage(mediaUrl)} className="block">
        <img
          src={mediaUrl}
          alt={content?.trim() || 'Shared photo'}
          loading="lazy"
          className="max-h-72 w-full min-w-[180px] rounded-xl object-cover"
        />
      </button>
    );
  }

  if (messageType === 'VIDEO' && mediaUrl) {
    return (
      <video src={mediaUrl} controls preload="metadata" className="max-h-72 w-full min-w-[200px] rounded-xl">
        <track kind="captions" />
      </video>
    );
  }

  if (messageType === 'AUDIO' && mediaUrl) {
    return (
      <div className="min-w-[210px] py-1">
        <audio src={mediaUrl} controls preload="metadata" className="w-full" />
      </div>
    );
  }

  if (messageType === 'FILE' && mediaUrl) {
    // Files whose URL looks like an image still preview inline.
    if (isImageUrl(mediaUrl)) {
      return (
        <button type="button" onClick={() => onOpenImage(mediaUrl)} className="block">
          <img
            src={mediaUrl}
            alt={content?.trim() || 'Shared file'}
            loading="lazy"
            className="max-h-72 w-full min-w-[180px] rounded-xl object-cover"
          />
        </button>
      );
    }

    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noreferrer"
        download
        className={`flex min-w-[210px] items-center gap-3 rounded-xl px-1 py-1 transition ${
          isMine ? 'hover:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isMine ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
          }`}
        >
          <FileText size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{content || 'Shared file'}</span>
          <span className={`text-[11px] ${isMine ? 'text-white/80' : 'text-muted'}`}>
            Tap to download
          </span>
        </span>
        <Download size={16} className={isMine ? 'text-white' : 'text-brand'} />
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words leading-snug">{content}</p>;
}
