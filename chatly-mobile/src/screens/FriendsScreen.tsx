import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ChevronLeft, UserPlus, UserCheck, X, Clock, UserMinus, ShieldOff, RefreshCw } from 'lucide-react-native';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { FRIENDS_STATE_QUERY, SEND_FRIEND_REQUEST, ACCEPT_FRIEND_REQUEST, DECLINE_FRIEND_REQUEST, CANCEL_FRIEND_REQUEST, REMOVE_FRIEND, BLOCK_USER, UNBLOCK_USER } from '../graphql/friends.gql';
import { SEARCH_USERS } from '../graphql/users.gql';
import { CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { AmbientBackground } from '../components/AmbientBackground';
import { FloatingDock } from '../components/FloatingDock';
import { colors, radii, shadows, spacing } from '../lib/theme';

type Tab = 'friends' | 'requests' | 'add';
type Status = 'FRIENDS' | 'INCOMING' | 'OUTGOING';

const TABS: { key: Tab; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'add', label: 'Add' },
];

export function FriendsScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery(FRIENDS_STATE_QUERY);
  const [tab, setTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sendRequest] = useMutation(SEND_FRIEND_REQUEST);
  const [acceptRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [declineRequest] = useMutation(DECLINE_FRIEND_REQUEST);
  const [cancelRequest] = useMutation(CANCEL_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [unblockUser] = useMutation(UNBLOCK_USER);
  const [createConversation, { loading: creating }] = useMutation(CREATE_DIRECT_CONVERSATION);

  const friends = data?.friends ?? [];
  const incoming = data?.friendRequests ?? [];
  const outgoing = data?.sentFriendRequests ?? [];
  const blockedUsers = data?.blockedUsers ?? [];

  const statusByUser = useMemo(() => {
    const map: Record<string, Status> = {};
    friends.forEach((f: any) => (map[f.id] = 'FRIENDS'));
    incoming.forEach((r: any) => (map[r.user.id] = 'INCOMING'));
    outgoing.forEach((r: any) => (map[r.user.id] = 'OUTGOING'));
    return map;
  }, [friends, incoming, outgoing]);

  const searchResults = useMemo(() => {
    const results = searchData?.searchUsers ?? [];
    return results.filter((u: any) => u.id !== currentUser?.id);
  }, [searchData, currentUser]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.trim()) searchUsers({ variables: { query: text.trim() } });
  };

  const run = async (mutation: any, userId: string, successNote?: string) => {
    setBusyId(userId);
    try {
      await mutation({ variables: { userId }, refetchQueries: [{ query: FRIENDS_STATE_QUERY }] });
      if (successNote) Alert.alert('Done', successNote);
    } catch (e) {
      console.error('friend action failed:', e);
      const msg = e instanceof Error && e.message ? e.message.replace(/^GraphQL error:\s*/, '') : '';
      Alert.alert('Something went wrong', msg || 'Could not update friend status. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (user: any) => {
    try {
      const { data: d } = await createConversation({ variables: { recipientId: user.id } });
      const conversation = d?.createDirectConversation;
      if (conversation) {
        navigation.navigate('Chat', {
          conversationId: conversation.id,
          title: user.name,
          peerId: user.id,
          peerAvatarUrl: user.avatarUrl,
          peerIsOnline: user.isOnline,
        });
      }
    } catch (e) {
      console.error('conversation creation failed:', e);
      Alert.alert('Could not open chat', 'Please check your connection and try again.');
    }
  };

  const busy = (id: string) => busyId === id || creating;

  const renderSearchButton = (user: any) => {
    const status = statusByUser[user.id];
    if (status === 'FRIENDS') {
      return (
        <View style={[styles.statusPill, styles.statusPillDone]}>
          <UserCheck size={14} color={colors.success} />
          <Text style={[styles.statusPillText, { color: colors.success }]}>Friends</Text>
        </View>
      );
    }
    if (status === 'OUTGOING') {
      return (
        <View style={styles.statusPill}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.statusPillText}>Requested</Text>
        </View>
      );
    }
    if (status === 'INCOMING') {
      return (
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
          onPress={() => run(acceptRequest, user.id)}
          disabled={busy(user.id)}
        >
          {busy(user.id) ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionPrimaryText}>Accept</Text>
          )}
        </Pressable>
      );
    }
    return (
      <Pressable
        style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
        onPress={() => run(sendRequest, user.id, `Friend request sent to ${user.name}`)}
        disabled={busy(user.id)}
      >
        {busy(user.id) ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <UserPlus size={14} color="#fff" />
            <Text style={styles.actionPrimaryText}>Add</Text>
          </>
        )}
      </Pressable>
    );
  };

  const confirmBlock = (item: any) => {
    Alert.alert(`Block ${item.name}?`, 'They will be removed from your friends and won\'t be able to message you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => run(blockUser, item.id, `${item.name} blocked`),
      },
    ]);
  };

  const renderFriendRow = ({ item }: any) => (
    <View style={styles.card}>
      <Pressable
        style={styles.friendMain}
        onPress={() => openChat(item)}
        onLongPress={() => confirmBlock(item)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${item.name}`}
      >
        <Avatar uri={item.avatarUrl} name={item.name} size={48} isOnline={item.isOnline} />
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>@{item.username}</Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        onPress={() => run(removeFriend, item.id, `${item.name} removed from friends`)}
        disabled={busy(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name} from friends`}
      >
        {busy(item.id) ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <>
            <UserMinus size={14} color={colors.danger} />
            <Text style={styles.removeText}>Remove</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  const renderBlockedRow = ({ item }: any) => (
    <View style={[styles.card, styles.cardCompact]}>
      <Avatar uri={item.avatarUrl} name={item.name} size={40} />
      <View style={styles.cardText}>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>@{item.username}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, styles.actionGhost, pressed && styles.pressed]}
        onPress={() => run(unblockUser, item.id, `${item.name} unblocked`)}
        disabled={busy(item.id)}
      >
        {busy(item.id) ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Text style={styles.actionGhostText}>Unblock</Text>
        )}
      </Pressable>
    </View>
  );

  const renderRequestRow = ({ item }: any) => {
    const u = item.user;
    return (
      <View style={styles.card}>
        <Avatar uri={u.avatarUrl} name={u.name} size={48} isOnline={u.isOnline} />
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={1}>{u.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>@{u.username}</Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
            onPress={() => run(acceptRequest, u.id, `${u.name} is now your friend`)}
            disabled={busy(u.id)}
          >
            {busy(u.id) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionPrimaryText}>Accept</Text>}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionGhost, pressed && styles.pressed]}
            onPress={() => run(declineRequest, u.id)}
            disabled={busy(u.id)}
          >
            <X size={14} color={colors.textSecondary} />
            <Text style={styles.actionGhostText}>Decline</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSentRow = ({ item }: any) => {
    const u = item.user;
    return (
      <View style={[styles.card, styles.cardCompact]}>
        <Avatar uri={u.avatarUrl} name={u.name} size={40} isOnline={u.isOnline} />
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={1}>{u.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>@{u.username}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.actionGhost, pressed && styles.pressed]}
          onPress={() => run(cancelRequest, u.id)}
          disabled={busy(u.id)}
        >
          {busy(u.id) ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={styles.actionGhostText}>Cancel</Text>
          )}
        </Pressable>
      </View>
    );
  };

  const renderQueryState = (empty: React.ReactNode) => {
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateText}>Loading friends…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Couldn’t load friends</Text>
          <Text style={styles.stateText}>Check your connection and try again.</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <RefreshCw size={15} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return empty;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AmbientBackground />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Friends</Text>
        <Pressable style={styles.backBtn} onPress={() => setTab('add')} accessibilityLabel="Add friends">
          <UserPlus size={19} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const badge = t.key === 'requests' ? incoming.length : 0;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              {badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {tab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(item: any) => item.id}
          renderItem={renderFriendRow}
          refreshing={loading}
          onRefresh={refetch}
          contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
          ListEmptyComponent={renderQueryState(
            <Text style={styles.empty}>
              No friends yet.{'\n'}Go to the Add tab and search for people to connect with.
            </Text>
          )}
          ListFooterComponent={
            blockedUsers.length > 0 ? (
              <>
                <View style={styles.blockedHeader}>
                  <ShieldOff size={14} color={colors.textMuted} />
                  <Text style={styles.blockedTitle}>Blocked users</Text>
                </View>
                <FlatList
                  data={blockedUsers}
                  keyExtractor={(item: any) => item.id}
                  renderItem={renderBlockedRow}
                  scrollEnabled={false}
                />
                <Text style={styles.blockedHint}>Long-press a friend to block them.</Text>
              </>
            ) : (
              <Text style={styles.blockedHint}>Long-press a friend to block them.</Text>
            )
          }
        />
      )}

      {tab === 'requests' && (
        <FlatList
          data={incoming}
          keyExtractor={(item: any) => item.id}
          renderItem={renderRequestRow}
          refreshing={loading}
          onRefresh={refetch}
          contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
          ListHeaderComponent={
            outgoing.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sent requests</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            incoming.length > 0 && outgoing.length > 0 ? (
              <FlatList
                data={outgoing}
                keyExtractor={(item: any) => item.id}
                renderItem={renderSentRow}
                scrollEnabled={false}
              />
            ) : null
          }
          ListEmptyComponent={renderQueryState(
            outgoing.length > 0 ? (
              <FlatList
                data={outgoing}
                keyExtractor={(item: any) => item.id}
                renderItem={renderSentRow}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.empty}>No pending requests.</Text>
            )
          )}
        />
      )}

      {tab === 'add' && (
        <View style={styles.addTab}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name or username"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={handleSearch}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear people search" hitSlop={8}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            )}
            {searching && <ActivityIndicator size="small" color={colors.textMuted} />}
          </View>

          {search.trim() ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item: any) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
              renderItem={({ item }: any) => (
                <View style={styles.card}>
                  <Avatar uri={item.avatarUrl} name={item.name} size={48} isOnline={item.isOnline} />
                  <View style={styles.cardText}>
                    <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>@{item.username}</Text>
                  </View>
                  {renderSearchButton(item)}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptySmall}>No people found</Text>}
            />
          ) : (
            <Text style={styles.hint}>Search by name or username to find people and send a friend request.</Text>
          )}
        </View>
      )}

      <FloatingDock active="friends" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 25, fontWeight: '800', letterSpacing: -0.4 },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: radii.lg,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.charcoal, ...shadows.sm },
  tabLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    ...shadows.sm,
  },
  friendMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardCompact: { paddingVertical: 10 },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  cardText: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  stateBox: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 60, gap: spacing.sm },
  stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: 10, marginTop: spacing.sm, ...shadows.sm },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60, paddingHorizontal: spacing.xl, lineHeight: 22 },
  emptySmall: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: 32, fontSize: 14, paddingHorizontal: spacing.xl, lineHeight: 20 },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  blockedTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  blockedHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  searchInput: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 15 },
  addTab: { flex: 1 },
  actionBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 78,
  },
  actionPrimary: { backgroundColor: colors.primary, ...shadows.sm },
  actionPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  actionGhostText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  removeBtn: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    maxWidth: 96,
  },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillDone: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
  statusPillText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});