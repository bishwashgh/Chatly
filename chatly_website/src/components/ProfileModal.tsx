import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Camera, LogOut, Save, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { ErrorMessage } from './ErrorMessage';
import { ModalShell } from './ModalShell';
import { Spinner } from './Spinner';
import { useAuth } from '../context/AuthContext';
import {
  DEACTIVATE_ACCOUNT,
  UPDATE_PROFILE,
  UPLOAD_MESSAGE_MEDIA,
} from '../graphql/operations';
import { readableError } from '../lib/format';
import type { ChatUser } from '../lib/types';

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { currentUser, setCurrentUser, signOut } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [uploadMedia] = useMutation<{ uploadMessageMedia: string }>(UPLOAD_MESSAGE_MEDIA);
  const [deactivateAccount] = useMutation(DEACTIVATE_ACCOUNT);

  // Reload the fields each time the dialog opens.
  useEffect(() => {
    if (!open || !currentUser) return;
    setName(currentUser.name ?? '');
    setBio(currentUser.bio ?? '');
    setAvatarUrl(currentUser.avatarUrl ?? null);
    setError(null);
  }, [open, currentUser]);

  async function handleAvatarPicked(file: File) {
    setUploading(true);
    setError(null);

    try {
      const { data } = await uploadMedia({ variables: { file } });
      const url = data?.uploadMessageMedia;
      if (typeof url !== 'string' || !url.trim()) {
        throw new Error('The upload finished without returning a file URL');
      }
      setAvatarUrl(url);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!currentUser) return;
    setSaving(true);
    setError(null);

    try {
      const { data } = await updateProfile({
        variables: {
          input: {
            name: name.trim() || undefined,
            bio: bio.trim(),
            avatarUrl: avatarUrl ?? undefined,
          },
        },
      });

      const updated = data?.updateProfile;
      if (updated) {
        setCurrentUser({ ...currentUser, ...updated } as ChatUser);
      }
      onClose();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Deactivate your account? You will be signed out immediately.')) return;

    setDeactivating(true);
    setError(null);

    try {
      await deactivateAccount();
      await signOut();
    } catch (caught) {
      setError(readableError(caught));
      setDeactivating(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Your profile"
      description="Update how you appear to other people on Chatly."
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleDeactivate()}
            disabled={deactivating}
            className="inline-flex items-center gap-2 text-xs font-semibold text-danger hover:underline disabled:opacity-60"
          >
            {deactivating ? <Spinner size={13} /> : <Trash2 size={13} />}
            Deactivate account
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-ghost px-3 py-2 text-xs"
            >
              <LogOut size={14} /> Sign out
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || uploading || !name.trim()}
              className="btn-primary px-4 py-2 text-xs"
            >
              {saving ? <Spinner size={14} /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorMessage message={error} />

        <div className="flex items-center gap-4">
          <Avatar name={name || currentUser?.name} url={avatarUrl} size={72} />

          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleAvatarPicked(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-ghost px-3 py-2 text-xs"
            >
              {uploading ? <Spinner size={13} /> : <Camera size={14} />}
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            <span className="text-[11px] text-muted">PNG or JPG, up to 10 MB.</span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="field"
            placeholder="Your display name"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Bio</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            className="field resize-none"
            placeholder="A short line about you"
          />
        </label>

        <div className="rounded-xl bg-canvas-low px-3 py-2.5 text-xs text-muted dark:bg-canvas-nightLow">
          <p>
            <span className="font-semibold text-canvas-night dark:text-canvas">Username:</span>{' '}
            {currentUser?.username ? `@${currentUser.username}` : 'not set'}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-canvas-night dark:text-canvas">Email:</span>{' '}
            {currentUser?.email ?? 'hidden'}
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
