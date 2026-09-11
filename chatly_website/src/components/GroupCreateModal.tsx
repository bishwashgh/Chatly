import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Check, Users } from 'lucide-react';
import { Avatar } from './Avatar';
import { ErrorMessage } from './ErrorMessage';
import { ModalShell } from './ModalShell';
import { EmptyState, LoadingState, Spinner } from './Spinner';
import { CREATE_GROUP_CONVERSATION, FRIENDS_STATE_QUERY } from '../graphql/operations';
import { readableError } from '../lib/format';
import type { Conversation, FriendsState } from '../lib/types';

type GroupCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
};

export function GroupCreateModal({ open, onClose, onCreated }: GroupCreateModalProps) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, loading } = useQuery<FriendsState>(FRIENDS_STATE_QUERY, {
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });

  const [createGroup] = useMutation<{ createGroupConversation: Conversation }>(
    CREATE_GROUP_CONVERSATION,
    { refetchQueries: ['MyConversations'] },
  );

  const friends = useMemo(() => data?.friends ?? [], [data]);
  const canCreate = title.trim().length > 0 && selected.length > 0 && !creating;

  function toggle(memberId: string) {
    setSelected((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId],
    );
  }

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const { data: result } = await createGroup({
        variables: { title: title.trim(), memberIds: selected },
      });

      const conversationId = result?.createGroupConversation?.id;
      if (!conversationId) throw new Error('The group was not created');

      setTitle('');
      setSelected([]);
      onCreated(conversationId);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="New group"
      description={`Pick at least one friend. ${selected.length} selected.`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canCreate}
            className="btn-primary px-4 py-2 text-xs"
          >
            {creating ? <Spinner size={14} /> : <Users size={14} />}
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorMessage message={error} />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Group name
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekend plans"
            maxLength={60}
            className="field"
          />
        </label>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Members</span>

          {loading && friends.length === 0 ? (
            <LoadingState label="Loading friends…" />
          ) : friends.length === 0 ? (
            <EmptyState
              title="No friends to add"
              description="Add friends from the People tab first, then create a group."
              icon={<Users size={20} />}
            />
          ) : (
            <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-black/5 dark:border-white/10 scrollbar-thin">
              {friends.map((friend) => {
                const isSelected = selected.includes(friend.id);
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => toggle(friend.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'bg-brand/10 dark:bg-brand/20'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <Avatar
                        name={friend.name}
                        url={friend.avatarUrl}
                        size={34}
                        isOnline={friend.isOnline}
                        showStatus
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-canvas-night dark:text-canvas">
                        {friend.name}
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          isSelected
                            ? 'border-brand bg-brand text-white'
                            : 'border-black/20 dark:border-white/20'
                        }`}
                      >
                        {isSelected && <Check size={13} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
