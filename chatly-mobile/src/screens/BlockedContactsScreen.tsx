import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldBan, Unlock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../components/Avatar';
import { SkeletonList } from '../components/SkeletonLoader';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import {
  BLOCKED_USERS_QUERY,
  FRIENDS_STATE_QUERY,
  UNBLOCK_USER,
} from '../graphql/friends.gql';

export function BlockedContactsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const { data, loading, error, refetch } = useQuery(BLOCKED_USERS_QUERY);
  const [unblockUser] = useMutation(UNBLOCK_USER, {
    // Unblocking also has to refresh the friends state, otherwise the
    // Settings screen keeps counting them and the list stays stale.
    refetchQueries: [{ query: BLOCKED_USERS_QUERY }, { query: FRIENDS_STATE_QUERY }],
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  const blocked: any[] = data?.blockedUsers ?? [];

  const handleUnblock = (user: any) => {
    Haptics.selectionAsync?.();
    Alert.alert(
      `Unblock ${user.name}?`,
      'They will be able to find you in search and send you messages again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setBusyId(user.id);
            try {
              await unblockUser({ variables: { userId: user.id } });
              Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error('unblock failed:', e);
              Alert.alert('Could not unblock', 'Please check your connection and try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.userRow, isDark && styles.cardDark]}>
      <Avatar uri={item.avatarUrl} name={item.name} size={46} isOnline={item.isOnline} />
      <View style={styles.userTextWrap}>
        <Text style={[styles.userName, isDark && styles.textDark]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.userHandle, isDark && styles.textSecondaryDark]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.unblockBtn, pressed && styles.pressed]}
        onPress={() => handleUnblock(item)}
        disabled={busyId === item.id}
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${item.name}`}
      >
        {busyId === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Unlock size={15} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.unblockText}>Unblock</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <ChevronLeft size={22} color={isDark ? '#F1F0F5' : '#1A1B1F'} />
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>Blocked Contacts</Text>
        </Pressable>
      </View>

      {loading && !data ? (
        <SkeletonList
          count={5}
          style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}
        />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
            Could not load blocked contacts
          </Text>
          <Text style={[styles.emptyBody, isDark && styles.textSecondaryDark]}>
            {error.message}
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : blocked.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <ShieldBan size={26} color={colors.secondary} />
          </View>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No blocked contacts</Text>
          <Text style={[styles.emptyBody, isDark && styles.textSecondaryDark]}>
            People you block appear here, and you can unblock them at any time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1B1F',
    letterSpacing: -0.3,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 6,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 88, 188, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  emptyBody: {
    fontSize: 13,
    color: '#6D7B6B',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4F3F8',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...shadows.sm,
  },
  cardDark: {
    backgroundColor: '#1A1B1F',
  },
  userTextWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  userHandle: {
    fontSize: 12.5,
    color: '#6D7B6B',
    marginTop: 2,
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 110, 40, 0.25)',
    backgroundColor: 'rgba(0, 110, 40, 0.08)',
    minWidth: 104,
    justifyContent: 'center',
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  separator: {
    height: 10,
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
  pressed: {
    opacity: 0.75,
  },
});
