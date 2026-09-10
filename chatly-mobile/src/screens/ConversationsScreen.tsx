import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SquarePen, UserPlus, X, GripHorizontal, RefreshCw } from 'lucide-react-native';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { MY_CONVERSATIONS_QUERY, CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { SEARCH_USERS } from '../graphql/users.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { ProfileModal } from '../components/ProfileModal';
import { AmbientBackground } from '../components/AmbientBackground';
import { FloatingDock } from '../components/FloatingDock';
import { colors, radii, shadows, spacing } from '../lib/theme';

type Filter = 'all' | 'unread' | 'groups';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
];

function messagePreview(m: any) {
  if (!m) return 'No messages yet';
  switch (m.messageType) {
    case 'IMAGE':
      return '📷 Photo';
    case 'VIDEO':
      return '🎬 Video';
    case 'AUDIO':
      return '🎤 Voice note';
    case 'FILE':
      return '📎 File';
    default:
      return m.content;
  }
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationsScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery(MY_CONVERSATIONS_QUERY);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [composeVisible, setComposeVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS);
  const [createConversation, { loading: creating }] = useMutation(CREATE_DIRECT_CONVERSATION);
  const conversations = data?.myConversations ?? [];

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') list = list.filter((c: any) => (c.unreadCount ?? 0) > 0);
    if (filter === 'groups') list = list.filter((c: any) => c.isGroup);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c: any) => {
        const other = c.participants.find((p: any) => p.id !== currentUser?.id);
        const title = c.isGroup ? c.title : other?.name;
        return (title ?? '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [conversations, query, filter, currentUser]);

  const searchResults = useMemo(() => {
    const results = searchData?.searchUsers ?? [];
    return results.filter((u: any) => u.id !== currentUser?.id);
  }, [searchData, currentUser]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.trim()) searchUsers({ variables: { query: text.trim() } });
  };

  const closeCompose = () => {
    setComposeVisible(false);
    setSearch('');
  };

  const openCompose = () => {
    setSearch('');
    setComposeVisible(true);
  };

  const openChat = async (user: any) => {
    try {
      const { data: convData } = await createConversation({
        variables: { recipientId: user.id },
        refetchQueries: [{ query: MY_CONVERSATIONS_QUERY }],
      });
      const conversation = convData?.createDirectConversation;
      closeCompose();
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

  const renderItem = ({ item }: any) => {
    const other = item.participants.find((p: any) => p.id !== currentUser?.id);
    const title = item.isGroup ? item.title : other?.name;
    const avatarUrl = item.isGroup ? undefined : other?.avatarUrl;
    const isOnline = !item.isGroup && other?.isOnline;
    const unread = item.unreadCount ?? 0;
    const last = item.lastMessage;
    const preview = last ? messagePreview(last) : 'No messages yet';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item.id,
            title,
            peerId: other?.id,
            peerAvatarUrl: avatarUrl,
            peerIsOnline: isOnline,
          })
        }
      >
        <Avatar uri={avatarUrl} name={title} size={52} isOnline={isOnline} />
        <View style={styles.cardText}>
          <View style={styles.cardTop}>
            <Text style={styles.title} numberOfLines={1}>{title ?? 'Conversation'}</Text>
            {last && <Text style={styles.time}>{formatListTime(last.createdAt)}</Text>}
          </View>
          <View style={styles.cardBottom}>
            <Text
              style={[styles.subtitle, unread > 0 && styles.subtitleUnread]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <AmbientBackground />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => setProfileVisible(true)}
        >
          <Avatar uri={currentUser?.avatarUrl} name={currentUser?.name} size={38} />
        </Pressable>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Find friends"
            onPress={() => navigation.navigate('Friends')}
          >
            <UserPlus size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            onPress={openCompose}
          >
            <SquarePen size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear conversation search" hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refetch}
        contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.stateText}>Loading conversations…</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Couldn’t load your chats</Text>
              <Text style={styles.stateText}>Check your connection and try again.</Text>
              <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                <RefreshCw size={15} color="#fff" />
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>
              No conversations yet — tap the pencil to start one
            </Text>
          )
        }
      />

      <FloatingDock active="chats" navigation={navigation} />

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />

      <Modal visible={composeVisible} animationType="slide" transparent onRequestClose={closeCompose}>
        <Pressable style={styles.backdrop} onPress={closeCompose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={styles.sheetKeyboard}
        >
          <View style={[styles.sheet, { paddingBottom: spacing.xxl + Math.max(insets.bottom, 12) }]}>
            <View style={styles.grabber}><GripHorizontal size={22} color={colors.textMuted} /></View>
            <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New chat</Text>
            <Pressable
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close new chat"
              onPress={closeCompose}
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name"
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
              contentContainerStyle={styles.sheetListContent}
              renderItem={({ item }: any) => (
                <Pressable
                  style={({ pressed }) => [styles.userRow, pressed && styles.cardPressed]}
                  onPress={() => openChat(item)}
                  disabled={creating}
                >
                  <Avatar uri={item.avatarUrl} name={item.name} size={44} isOnline={item.isOnline} />
                  <View style={styles.userText}>
                    <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>@{item.username}</Text>
                  </View>
                  {creating && <ActivityIndicator size="small" color={colors.textMuted} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptySmall}>No people found</Text>}
            />
          ) : (
            <Text style={styles.hint}>Start typing a name to find people to chat with.</Text>
          )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  searchInput: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 15 },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: radii.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal, ...shadows.sm },
  chipLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 148 },
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
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  cardText: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 16, flex: 1 },
  subtitle: { color: colors.textSecondary, fontSize: 13.5, flex: 1 },
  subtitleUnread: { color: colors.textPrimary, fontWeight: '600' },
  time: { color: colors.textMuted, fontSize: 12, marginLeft: spacing.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stateBox: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 60, gap: spacing.sm },
  stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: 10, marginTop: spacing.sm, ...shadows.sm },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60, paddingHorizontal: spacing.xl, lineHeight: 22 },
  emptySmall: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: 32, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheetKeyboard: { width: '100%', maxHeight: '86%' },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    maxHeight: '80%',
    ...shadows.lg,
  },
  grabber: { alignItems: 'center', height: 22, justifyContent: 'center' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetListContent: { paddingBottom: spacing.sm },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  userText: { flex: 1, minWidth: 0 },
});