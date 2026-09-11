import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation } from '@apollo/client';
import { Mic, Paperclip, Send, Smile, X } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';
import { Spinner } from './Spinner';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { normalizeVoiceFile } from '../lib/audio';
import { SEND_MESSAGE, TYPING, UPLOAD_MESSAGE_MEDIA } from '../graphql/operations';
import { formatDuration, readableError } from '../lib/format';
import type { MessageType } from '../lib/types';

/** Mirrors the server's graphqlUploadExpress limit. */
const MAX_UPLOAD_BYTES = 10_000_000;

const TYPING_DEBOUNCE_MS = 2500;
const QUICK_EMOJIS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F389}', '\u{1F64F}', '\u{1F440}'];

type ComposerProps = {
  conversationId: string;
  onSent: () => void;
};

function typeForFile(file: File): MessageType {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

export function Composer({ conversationId, onSent }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [uploadMedia] = useMutation<{ uploadMessageMedia: string }>(UPLOAD_MESSAGE_MEDIA);
  const [setTyping] = useMutation(TYPING);

  const voice = useVoiceRecorder();

  // Reset the draft when switching conversations.
  useEffect(() => {
    setDraft('');
    setError(null);
    setEmojiOpen(false);
  }, [conversationId]);

  // Grow the textarea with its content.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [draft]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /** Typing is a best-effort signal; never let it break text entry. */
  const signalTyping = useCallback(() => {
    setTyping({ variables: { conversationId, isTyping: true } }).catch(() => {
      /* ignore transient typing failures */
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ variables: { conversationId, isTyping: false } }).catch(() => {
        /* ignore */
      });
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, setTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping({ variables: { conversationId, isTyping: false } }).catch(() => {
      /* ignore */
    });
  }, [conversationId, setTyping]);

  async function handleSendText() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    try {
      await sendMessage({
        variables: { input: { conversationId, content, messageType: 'TEXT' } },
      });
      setDraft('');
      setEmojiOpen(false);
      stopTyping();
      onSent();
      textareaRef.current?.focus();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSending(false);
    }
  }

  async function handleStartVoice() {
    setError(null);
    setEmojiOpen(false);
    await voice.startRecording();
  }

  async function handleSendVoice() {
    setError(null);
    setUploading(true);

    try {
      // stopRecording resolves with the finished clip, or null if too short.
      const file = await voice.stopRecording();
      if (!file) return;

      // Chromium records webm, which Safari cannot play. Normalize to WAV so
      // the note plays everywhere, including both native apps.
      const uploadFile = await normalizeVoiceFile(file);

      if (uploadFile.size > MAX_UPLOAD_BYTES) {
        setError('That voice note is too long to send. Please record a shorter one.');
        return;
      }

      const { data } = await uploadMedia({ variables: { file: uploadFile } });
      const mediaUrl = data?.uploadMessageMedia;

      if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
        throw new Error('The upload finished without returning a file URL');
      }

      await sendMessage({
        variables: { input: { conversationId, mediaUrl, messageType: 'AUDIO' } },
      });
      onSent();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setUploading(false);
    }
  }

  async function handleFilePicked(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`"${file.name}" is larger than 10 MB`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data } = await uploadMedia({ variables: { file } });
      const mediaUrl = data?.uploadMessageMedia;

      if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
        throw new Error('The upload finished without returning a file URL');
      }

      const messageType = typeForFile(file);

      await sendMessage({
        variables: {
          input: {
            conversationId,
            mediaUrl,
            messageType,
            // The filename doubles as the caption for documents.
            ...(messageType === 'FILE' ? { content: file.name } : {}),
          },
        },
      });

      onSent();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setUploading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendText();
    }
  }

  return (
    <div className="border-t border-black/5 bg-white px-3 py-3 dark:border-white/10 dark:bg-canvas-nightAlt sm:px-4">
      <ErrorMessage message={error ?? voice.error} />

      {emojiOpen && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-black/5 bg-canvas-low p-2 dark:border-white/10 dark:bg-canvas-nightLow">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-lg px-2 py-1 text-xl transition hover:bg-white dark:hover:bg-canvas-nightHigh"
              onClick={() => {
                setDraft((previous) => previous + emoji);
                textareaRef.current?.focus();
              }}
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {voice.isRecording ? (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-danger/5 px-3 py-2 dark:bg-danger/10">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-danger" />
          <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-canvas-night dark:text-canvas">
            {formatDuration(Math.floor(voice.durationMillis / 1000))}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            Recording voice note…
          </span>

          <button
            type="button"
            onClick={voice.cancelRecording}
            disabled={uploading}
            className="icon-btn hover:text-danger disabled:opacity-50"
            aria-label="Cancel recording"
          >
            <X size={17} />
          </button>

          <button
            type="button"
            onClick={() => void handleSendVoice()}
            disabled={uploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send voice note"
          >
            {uploading ? <Spinner size={16} /> : <Send size={17} />}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Reset so picking the same file twice still fires onChange.
              event.target.value = '';
              if (file) void handleFilePicked(file);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="icon-btn h-10 w-10 bg-canvas-low disabled:opacity-60 dark:bg-canvas-nightLow"
            aria-label="Attach a file"
            title="Attach a file"
          >
            {uploading ? <Spinner size={16} /> : <Paperclip size={18} />}
          </button>

          <div className="flex flex-1 items-end rounded-2xl bg-canvas-low px-3 py-2 dark:bg-canvas-nightLow">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                signalTyping();
              }}
              onKeyDown={handleKeyDown}
              onBlur={stopTyping}
              placeholder="Write a message…"
              className="max-h-[140px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-canvas-night outline-none placeholder:text-muted dark:text-canvas"
            />
            <button
              type="button"
              onClick={() => setEmojiOpen((previous) => !previous)}
              className="icon-btn h-8 w-8"
              aria-label="Toggle emoji picker"
            >
              {emojiOpen ? <X size={16} /> : <Smile size={18} />}
            </button>
          </div>

          {/* The mic replaces send while the draft is empty, mirroring mobile. */}
          {!draft.trim() && (
            <button
              type="button"
              onClick={() => void handleStartVoice()}
              disabled={uploading}
              className="icon-btn h-10 w-10 bg-canvas-low disabled:opacity-60 dark:bg-canvas-nightLow"
              aria-label="Record a voice note"
              title="Voice note"
            >
              <Mic size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSendText()}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            {sending ? <Spinner size={16} /> : <Send size={17} />}
          </button>
        </div>
      )}

      {uploading && (
        <p className="mt-2 text-xs text-muted">Uploading attachment…</p>
      )}
    </div>
  );
}
