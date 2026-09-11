import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import {
  ChevronLeft,
  LogOut,
  MessageSquarePlus,
  Moon,
  Phone,
  Plus,
  Sun,
  Users,
} from 'lucide-react';
import { BrandLockup } from '../components/BrandMark';
import { Avatar } from '../components/Avatar';
import { CallHistoryPanel } from '../components/CallHistoryPanel';
import { ChatThread } from '../components/ChatThread';
import { ConversationListItem } from '../components/ConversationListItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupCreateModal } from '../components/GroupCreateModal';
import { Lightbox } from '../components/Lightbox';
import { PeoplePanel } from '../components/PeoplePanel';
import { ProfileModal } from '../components/ProfileModal';
import { EmptyState, LoadingState } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useTheme } from '../context/ThemeContext';
import {
  DELETE_MESSAGE,
  MARK_AS_READ,
  MESSAGE_ADDED_SUBSCRIPTION,
  MESSAGE_REACTION_UPDATED_SUBSCRIPTION,
  MESSAGE_STATUS_UPDATED_SUBSCRIPTION,
  MESSAGES_QUERY,
  MY_CONVERSATIONS_QUERY,
  CONVERSATION_UPDATED_SUBSCRIPTION,
  TOGGLE_REACTION,
  USER_TYPING_STATUS_SUBSCRIPTION,
} from '../graphql/operations';
import { conversationPeer, conversationTitle, sortConversations } from '../lib/conversations';
import { readableError } from '../lib/format';
import type {
  CallType,
  Conversation,
  ConversationUpdate,
  Message,
  MessageStatusEvent,
  TypingEvent,
} from '../lib/types';

type SidebarTab = 'chats' | 'people' | 'calls';

export function ChatPage() {
  const { currentUser, signOut } = useAuth();
  const { startCall } = useCall();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();

  const [tab, setTab] = useState<SidebarTab>('chats');
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationsRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = currentUser?.id ?? '';
  const activeId = routeConversationId ?? null;

  /**
   * Unread badges and previews stay live via the backend's per-user
   * `conversationUpdated` subscription, so no polling is required.
   */
  const conversationsQuery = useQuery<{ myConversations: Conversation[] }>(
    MY_CONVERSATIONS_QUERY,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const messagesQuery = useQuery<{ messages: Message[] }>(MESSAGES_QUERY, {
    variables: { conversationId: activeId ?? '' },
    skip: !activeId,
    fetchPolicy: 'cache-and-network',
  });

  const [toggleReaction] = useMutation(TOGGLE_REACTION);
  const [deleteMessage] = useMutation(DELETE_MESSAGE);
  const [markAsRead] = useMutation(MARK_AS_READ);

  const conversations = useMemo(
    () => sortConversations(conversationsQuery.data?.myConversations ?? []),
    [conversationsQuery.data],
  );

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  const peer = useMemo(
    () => (activeConversation ? conversationPeer(activeConversation, currentUserId) : null),
    [activeConversation, currentUserId],
  );

  const activeTitle = useMemo(
    () => (activeConversation ? conversationTitle(activeConversation, currentUserId) : ''),
    [activeConversation, currentUserId],
  );

  // `refetch` is referentially stable in Apollo, which keeps the subscription
  // handlers from being recreated on every render.
  const refetchMessages = messagesQuery.refetch;
  const refetchConversations = conversationsQuery.refetch;

  /**
   * `messageAdded` requires a `conversationId`, but the backend also emits a
   * per-user `conversationUpdated` for every conversation you take part in.
   * Refetch the list on it so previews and unread badges stay current without
   * opening the thread.
   */
  useSubscription<{ conversationUpdated: ConversationUpdate }>(
    CONVERSATION_UPDATED_SUBSCRIPTION,
    {
      variables: { userId: currentUserId },
      skip: !currentUserId,
      onData: () => {
        // Coalesce bursts (e.g. a fast back-and-forth) into one refetch.
        if (conversationsRefetchTimerRef.current) return;
        conversationsRefetchTimerRef.current = setTimeout(() => {
          conversationsRefetchTimerRef.current = null;
          void refetchConversations().catch(() => {});
        }, 400);
      },
    },
  );

  // Refresh instantly when the tab regains focus.
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) void refetchConversations().catch(() => {});
    }

    function handleWindowFocus() {
      void refetchConversations().catch(() => {});
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refetchConversations]);

  useEffect(() => {
    return () => {
      if (conversationsRefetchTimerRef.current) {
        clearTimeout(conversationsRefetchTimerRef.current);
      }
    };
  }, []);

  /* ------------------------------------------------------------ realtime */

  useSubscription<{ messageAdded: Message }>(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId: activeId ?? '' },
    skip: !activeId,
    onData: () => {
      void refetchMessages().catch(() => {});
      void refetchConversations().catch(() => {});
    },
  });

  useSubscription<{ messageReactionUpdated: Pick<Message, 'id' | 'reactions'> }>(
    MESSAGE_REACTION_UPDATED_SUBSCRIPTION,
    {
      variables: { conversationId: activeId ?? '' },
      skip: !activeId,
      onData: () => {
        void refetchMessages().catch(() => {});
      },
    },
  );

  useSubscription<{ messageStatusUpdated: MessageStatusEvent }>(
    MESSAGE_STATUS_UPDATED_SUBSCRIPTION,
    {
      variables: { conversationId: activeId ?? '' },
      skip: !activeId,
      onData: ({ client, data }) => {
        const status = data?.data?.messageStatusUpdated;
        if (!status) return;

        // Patch receipts in place so the thread does not need a full refetch.
        client.cache.modify({
          id: client.cache.identify({ __typename: 'Message', id: status.messageId }),
          fields: {
            isRead: () => status.isRead,
            isDelivered: () => status.isDelivered,
          },
        });
      },
    },
  );

  useSubscription<{ userTypingStatus: TypingEvent }>(USER_TYPING_STATUS_SUBSCRIPTION, {
    variables: { conversationId: activeId ?? '' },
    skip: !activeId,
    onData: ({ data }) => {
      const event = data?.data?.userTypingStatus;
      if (!event || event.userId === currentUserId) return;

      setPeerTyping(event.isTyping);

      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      if (event.isTyping) {
        // Guard against a missed "stop typing" event.
        typingClearRef.current = setTimeout(() => setPeerTyping(false), 6000);
      }
    },
  });

  // Reset per-conversation UI state when switching threads.
  useEffect(() => {
    setPeerTyping(false);
    if (typingClearRef.current) clearTimeout(typingClearRef.current);
  }, [activeId]);

  useEffect(() => {
    return () => {
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
  }, []);

  /* --------------------------------------------------------- read state */

  const messages = messagesQuery.data?.messages ?? [];

  useEffect(() => {
    if (!activeId || !currentUserId || messages.length === 0) return;

    const unread = messages.filter(
      (message) => message.sender.id !== currentUserId && !message.isRead,
    );
    if (unread.length === 0) return;

    void Promise.all(
      unread.map((message) =>
        markAsRead({
          variables: { conversationId: activeId, messageId: message.id },
        }).catch(() => null),
      ),
    ).then(() => {
      void refetchConversations().catch(() => {});
    });
  }, [messages, activeId, currentUserId, markAsRead, refetchConversations]);

  /* ------------------------------------------------------------ actions */

  const openConversation = useCallback(
    (conversationId: string) => {
      setActionError(null);
      navigate(`/app/${conversationId}`);
    },
    [navigate],
  );

  const handleReact = useCallback(
    async (message: Message, emoji: string) => {
      try {
        await toggleReaction({ variables: { messageId: message.id, emojiId: emoji } });
        void refetchMessages().catch(() => {});
      } catch (caught) {
        setActionError(`Could not react: ${readableError(caught)}`);
      }
    },
    [toggleReaction, refetchMessages],
  );

  const handleDelete = useCallback(
    async (message: Message) => {
      if (!window.confirm('Delete this message?')) return;
      try {
        await deleteMessage({ variables: { messageId: message.id } });
        void refetchMessages().catch(() => {});
        void refetchConversations().catch(() => {});
      } catch (caught) {
        setActionError(`Could not delete: ${readableError(caught)}`);
      }
    },
    [deleteMessage, refetchMessages, refetchConversations],
  );

  /** Call any peer, used by both the chat header and the call history list. */
  const callPeer = useCallback(
    (
      target: { id: string; name: string; avatarUrl?: string | null },
      callType: CallType,
    ) => {
      void startCall({
        peerId: target.id,
        peerName: target.name,
        peerAvatarUrl: target.avatarUrl,
        callType,
      });
    },
    [startCall],
  );

  const handleStartCall = useCallback(
    (callType: CallType) => {
      if (!peer) return;
      callPeer({ id: peer.id, name: peer.name, avatarUrl: peer.avatarUrl }, callType);
    },
    [peer, callPeer],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  return (
    <div className="flex h-full overflow-hidden bg-canvas dark:bg-canvas-night">
      {/* Sidebar */}
      <aside
        className={`${
          activeId ? 'hidden md:flex' : 'flex'
        } w-full shrink-0 flex-col border-r border-black/5 bg-white dark:border-white/10 dark:bg-canvas-nightAlt md:w-[336px]`}
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3">
          <BrandLockup subtitle={currentUser?.username ? `@${currentUser.username}` : 'Messenger'} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGroupOpen(true)}
              className="icon-btn"
              aria-label="Create a new group"
              title="New group"
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="icon-btn hover:text-danger"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <div className="flex gap-1 px-3 pb-2">
          {(
            [
              { id: 'chats', label: 'Chats', icon: MessageSquarePlus },
              { id: 'people', label: 'People', icon: Users },
              { id: 'calls', label: 'Calls', icon: Phone },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                tab === id
                  ? 'bg-brand text-white'
                  : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'chats' ? (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {actionError && (
              <div className="p-3">
                <ErrorMessage message={actionError} />
              </div>
            )}

            {conversationsQuery.loading && conversations.length === 0 ? (
              <LoadingState label="Loading conversations…" />
            ) : conversationsQuery.error && conversations.length === 0 ? (
              <div className="p-3">
                <ErrorMessage message={readableError(conversationsQuery.error)} />
                <button
                  type="button"
                  onClick={() => void refetchConversations().catch(() => {})}
                  className="btn-ghost mt-3 w-full"
                >
                  Try again
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                description="Open the People tab to find someone and start chatting."
                icon={<MessageSquarePlus size={22} />}
              />
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationListItem
                      conversation={conversation}
                      currentUserId={currentUserId}
                      selected={conversation.id === activeId}
                      onSelect={openConversation}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : tab === 'people' ? (
          <PeoplePanel currentUserId={currentUserId} onOpenConversation={openConversation} />
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <CallHistoryPanel onCallBack={callPeer} />
          </div>
        )}

        <footer className="border-t border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Open your profile"
          >
            <Avatar
              name={currentUser?.name}
              url={currentUser?.avatarUrl}
              size={34}
              isOnline
              showStatus
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                {currentUser?.name ?? 'You'}
              </p>
              <p className="truncate text-[11px] text-muted">FriendGate™ protected</p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-brand">Edit</span>
          </button>
        </footer>
      </aside>

      {/* Thread */}
      <main className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {activeConversation ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="flex items-center gap-1 border-b border-black/5 bg-white px-3 py-2 text-xs font-semibold text-brand dark:border-white/10 dark:bg-canvas-nightAlt md:hidden"
            >
              <ChevronLeft size={15} />
              All conversations
            </button>

            <ChatThread
              conversation={activeConversation}
              conversationTitle={activeTitle}
              peer={peer}
              messages={messages}
              loading={messagesQuery.loading}
              error={messagesQuery.error}
              currentUserId={currentUserId}
              peerTyping={peerTyping}
              onRefetch={refetchMessages}
              onReact={handleReact}
              onDelete={handleDelete}
              onOpenImage={setLightboxUrl}
              onStartCall={handleStartCall}
            />
          </>
        ) : (
          <EmptyState
            title="Pick up where you left off"
            description="Select a conversation on the left, or open the People tab to start a new one."
            icon={<MessageSquarePlus size={24} />}
          />
        )}
      </main>

      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <GroupCreateModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreated={(conversationId) => {
          setGroupOpen(false);
          setTab('chats');
          openConversation(conversationId);
        }}
      />
    </div>
  );
}
