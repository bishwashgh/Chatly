import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Lock, X } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type PeerProfile = {
  name?: string;
  username?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
  friendGated?: boolean;
} | null;

type PeerProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Freshly queried user; falls back to the route params while it loads. */
  peer: PeerProfile;
  fallbackName?: string;
  fallbackAvatarUrl?: string;
  fallbackIsOnline?: boolean;
};

function formatLastSeen(lastSeen?: string | null): string | null {
  if (!lastSeen) return null;
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Read-only profile for the person you are chatting with. Deliberately shows
 * only fields the backend actually stores - no invented stats or claims.
 */
export function PeerProfileModal({
  visible,
  onClose,
  peer,
  fallbackName,
  fallbackAvatarUrl,
  fallbackIsOnline,
}: PeerProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const name = peer?.name ?? fallbackName ?? 'Chat';
  const avatarUrl = peer?.avatarUrl ?? fallbackAvatarUrl;
  const isOnline = peer?.isOnline ?? fallbackIsOnline ?? false;

  const statusLine = isOnline
    ? 'Active now'
    : formatLastSeen(peer?.lastSeen)
      ? `Last seen ${formatLastSeen(peer?.lastSeen)}`
      : 'Offline';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close profile" />
        <BlurView
          intensity={78}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.sheet,
            isDark && styles.sheetDark,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.grabber} />
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={18} color={isDark ? '#F1F0F5' : colors.textPrimary} />
          </Pressable>

          <View style={styles.avatarWrap}>
            <Avatar uri={avatarUrl} name={name} size={96} isOnline={isOnline} />
          </View>

          <Text style={[styles.name, isDark && styles.textDark]} numberOfLines={2}>
            {name}
          </Text>
          {peer?.username ? (
            <Text style={[styles.username, isDark && styles.textSecondaryDark]}>
              @{peer.username}
            </Text>
          ) : null}

          <Text style={[styles.status, isOnline ? styles.statusOnline : null]}>
            {statusLine}
          </Text>

          {peer?.friendGated && (
            <View style={styles.gateBadge}>
              <Lock size={13} color={colors.secondary} strokeWidth={2.4} />
              <Text style={styles.gateBadgeText}>Friends only</Text>
            </View>
          )}

          <View style={[styles.bioCard, isDark && styles.bioCardDark]}>
            <Text style={[styles.bioLabel, isDark && styles.textSecondaryDark]}>Bio</Text>
            <Text style={[styles.bioText, isDark && styles.textDark]}>
              {peer?.bio?.trim() ? peer.bio : 'No bio yet'}
            </Text>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.46)',
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'center',
    ...shadows.lg,
  },
  sheetDark: {
    backgroundColor: 'rgba(28,28,30,0.98)',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(109,123,107,0.35)',
    marginBottom: spacing.md,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,243,248,0.92)',
  },
  avatarWrap: {
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  status: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 6,
  },
  statusOnline: {
    color: colors.primary,
    fontWeight: '700',
  },
  gateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 88, 188, 0.10)',
  },
  gateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  bioCard: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(244,243,248,0.9)',
  },
  bioCardDark: {
    backgroundColor: 'rgba(40,41,46,0.9)',
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
});
