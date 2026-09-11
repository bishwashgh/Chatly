import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Ban, Check, MessageSquare, Search, Undo2, UserPlus, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState, LoadingState, Spinner } from './Spinner';
import {
  ACCEPT_FRIEND_REQUEST,
  BLOCK_USER,
  CANCEL_FRIEND_REQUEST,
  CREATE_DIRECT_CONVERSATION,
  DECLINE_FRIEND_REQUEST,
  FRIENDS_STATE_QUERY,
  SEND_FRIEND_REQUEST,
  SEARCH_USERS,
  UNBLOCK_USER,
} from '../graphql/operations';
import { isSameDay, readableError } from '../lib/format';
import type { ChatUser, Conversation, FriendsState } from '../lib/types';

type PeoplePanelProps = {
  currentUserId: string;
  onOpenConversation: (conversationId: string) => void;
};

type Tab = 'friends' | 'requests' | 'blocked';

export function PeoplePanel({ currentUserId, onOpenConversation }: PeoplePanelProps) {
  const [tab, setTab] = useState<Tab>('friends');
  const [term, setTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const trimmedTerm = term.trim();

  const friendsQuery = useQuery<FriendsState>(FRIENDS_STATE_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const searchQuery = useQuery<{ searchUsers: ChatUser[] }>(SEARCH_USERS, {
    variables: { query: trimmedTerm },
    skip: trimmedTerm.length < 2,
    fetchPolicy: 'cache-and-network',
  });

  const [createDirectConversation] = useMutation<{ createDirectConversation: Conversation }>(
    CREATE_DIRECT_CONVERSATION,
    { refetchQueries: ['MyConversations'] },
  );
  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST, {
    refetchQueries: ['FriendsState'],
  });
  const [acceptFriendRequest] = useMutation(ACCEPT_FRIEND_REQUEST, {
    refetchQueries: ['FriendsState', 'MyConversations'],
  });
  const [declineFriendRequest] = useMutation(DECLINE_FRIEND_REQUEST, {
    refetchQueries: ['FriendsState'],
  });
  const [cancelFriendRequest] = useMutation(CANCEL_FRIEND_REQUEST, {
    refetchQueries: ['FriendsState'],
  });
  const [blockUser] = useMutation(BLOCK_USER, {
    refetchQueries: ['FriendsState', 'MyConversations'],
  });
  const [unblockUser] = useMutation(UNBLOCK_USER, { refetchQueries: ['FriendsState'] });

  const friends = friendsQuery.data?.friends ?? [];
  const incoming = friendsQuery.data?.friendRequests ?? [];
  const outgoing = friendsQuery.data?.sentFriendRequests ?? [];
  const blocked = friendsQuery.data?.blockedUsers ?? [];

  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);
  const outgoingIds = useMemo(
    () => new Set(outgoing.map((request) => request.user.id)),
    [outgoing],
  );

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    failureMessage: string,
  ) {
    setPendingId(id);
    setActionError(null);
    try {
      await action();
    } catch (caught) {
      setActionError(`${failureMessage}: ${readableError(caught)}`);
    } finally {
      setPendingId(null);
    }
  }

  async function handleMessage(user: ChatUser) {
    await runAction(
      user.id,
      async () => {
        const { data } = await createDirectConversation({
          variables: { recipientId: user.id },
        });
        const conversationId = data?.createDirectConversation?.id;
        if (conversationId) onOpenConversation(conversationId);
      },
      'Could not open conversation',
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-black/5 px-3 py-3 dark:border-white/10">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search people by name or username"
            className="field py-2.5 pl-9 pr-9 text-sm"
            aria-label="Search people"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {trimmedTerm.length >= 2 && (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-black/5 bg-white dark:border-white/10 dark:bg-canvas-nightLow scrollbar-thin">
            {searchQuery.loading && !searchQuery.data ? (
              <div className="p-3">
                <Spinner label="Searching…" />
              </div>
            ) : (searchQuery.data?.searchUsers?.length ?? 0) === 0 ? (
              <p className="p-3 text-xs text-muted">No people match “{trimmedTerm}”.</p>
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {searchQuery.data?.searchUsers.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 p-2.5">
                    <Avatar
                      name={user.name}
                      url={user.avatarUrl}
                      size={36}
                      isOnline={user.isOnline}
                      showStatus
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                        {user.name}
                      </p>
                      {user.username && (
                        <p className="truncate text-xs text-muted">@{user.username}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleMessage(user)}
                      disabled={pendingId === user.id}
                      className="icon-btn h-8 w-8 text-brand"
                      aria-label={`Message ${user.name}`}
                      title="Open conversation"
                    >
                      {pendingId === user.id ? <Spinner size={14} /> : <MessageSquare size={16} />}
                    </button>

                    {!friendIds.has(user.id) && !outgoingIds.has(user.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            user.id,
                            () => sendFriendRequest({ variables: { userId: user.id } }),
                            'Could not send friend request',
                          )
                        }
                        disabled={pendingId === user.id}
                        className="icon-btn h-8 w-8"
                        aria-label={`Add ${user.name} as a friend`}
                        title="Send friend request"
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 px-3 pt-2">
        {(['friends', 'requests', 'blocked'] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
              tab === value
                ? 'bg-brand text-white'
                : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {value}
            {value === 'requests' && incoming.length > 0 && (
              <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {incoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        <div className="px-1 py-1">
          <ErrorMessage message={actionError} />
        </div>

        {friendsQuery.loading && !friendsQuery.data ? (
          <LoadingState label="Loading people…" />
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              description="Search above to find people and send a friend request."
              icon={<UserPlus size={22} />}
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {friends.map((friend) => (
                <li key={friend.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5">
                  <Avatar
                    name={friend.name}
                    url={friend.avatarUrl}
                    size={38}
                    isOnline={friend.isOnline}
                    showStatus
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                      {friend.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {friend.isOnline ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleMessage(friend)}
                    disabled={pendingId === friend.id}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    {pendingId === friend.id ? <Spinner size={13} /> : <MessageSquare size={14} />}
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Block ${friend.name}? This also removes them as a friend.`,
                        )
                      ) {
                        return;
                      }
                      void runAction(
                        friend.id,
                        () => blockUser({ variables: { userId: friend.id } }),
                        'Could not block user',
                      );
                    }}
                    disabled={pendingId === friend.id}
                    className="icon-btn h-8 w-8 hover:text-danger"
                    aria-label={`Block ${friend.name}`}
                    title="Block"
                  >
                    <Ban size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : tab === 'blocked' ? (
          blocked.length === 0 ? (
            <EmptyState
              title="No blocked users"
              description="People you block will appear here, and you can unblock them at any time."
              icon={<Ban size={22} />}
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {blocked.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Avatar name={user.name} url={user.avatarUrl} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {user.username ? `@${user.username}` : 'Blocked'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(
                        user.id,
                        () => unblockUser({ variables: { userId: user.id } }),
                        'Could not unblock user',
                      )
                    }
                    disabled={pendingId === user.id}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    {pendingId === user.id ? <Spinner size={13} /> : <Undo2 size={14} />}
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <EmptyState
            title="No pending requests"
            description="Friend requests you send or receive will appear here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {incoming.length > 0 && (
              <section>
                <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted">
                  Incoming
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {incoming.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Avatar
                        name={request.user.name}
                        url={request.user.avatarUrl}
                        size={38}
                        isOnline={request.user.isOnline}
                        showStatus
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                          {request.user.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {isSameDay(request.createdAt, new Date().toISOString())
                            ? 'Today'
                            : new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            request.id,
                            () =>
                              acceptFriendRequest({
                                variables: { userId: request.user.id },
                              }),
                            'Could not accept request',
                          )
                        }
                        disabled={pendingId === request.id}
                        className="icon-btn h-8 w-8 text-brand"
                        aria-label={`Accept request from ${request.user.name}`}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            request.id,
                            () =>
                              declineFriendRequest({
                                variables: { userId: request.user.id },
                              }),
                            'Could not decline request',
                          )
                        }
                        disabled={pendingId === request.id}
                        className="icon-btn h-8 w-8 hover:text-danger"
                        aria-label={`Decline request from ${request.user.name}`}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted">
                  Sent
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {outgoing.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Avatar
                        name={request.user.name}
                        url={request.user.avatarUrl}
                        size={38}
                        isOnline={request.user.isOnline}
                        showStatus
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-canvas-night dark:text-canvas">
                          {request.user.name}
                        </p>
                        <p className="truncate text-xs text-muted">Awaiting response</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            request.id,
                            () =>
                              cancelFriendRequest({
                                variables: { userId: request.user.id },
                              }),
                            'Could not cancel request',
                          )
                        }
                        disabled={pendingId === request.id}
                        className="btn-ghost px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <p className="px-3 py-4 text-center text-[11px] text-muted">
          Signed in as {currentUserId.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
