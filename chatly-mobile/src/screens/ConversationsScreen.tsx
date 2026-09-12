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
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  SquarePen,
  UserPlus,
  X,
  GripHorizontal,
  RefreshCw,
  MessageCircle,
  CheckCheck,
  Mic,
  User,
} from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { MY_CONVERSATIONS_QUERY, CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { SEARCH_USERS } from '../graphql/users.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { ProfileModal } from '../components/ProfileModal';
import { FloatingDock } from '../components/FloatingDock';
import { SkeletonList } from '../components/SkeletonLoader';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

type Filter = 'all' | 'unread' | 'groups';

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

export function ConversationsScreen({
  navigation,
  hideHeader = false,
  hideDock = false,
}: {
  navigation: any;
  hideHeader?: boolean;
  hideDock?: boolean;
}) {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useQuery(MY_CONVERSATIONS_QUERY);
  const [query, setQuery] = useState('');
  const [composeVisible, setComposeVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS);
  const [createConversation, { loading: creating }] = useMutation(CREATE_DIRECT_CONVERSATION);
  const conversations = data?.myConversations ?? [];

  const filtered = useMemo(() => {
    let list = conversations;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c: any) => {
        const other = c.participants.find((p: any) => p.id !== currentUser?.id);
        const title = c.isGroup ? c.title : other?.name;
        return (title ?? '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [conversations, query, currentUser]);

  // Extract distinct online/recent contacts for the Online Friends row
  const onlineFriends = useMemo(() => {
    const map = new Map();
    conversations.forEach((c: any) => {
      const other = c.participants.find((p: any) => p.id !== currentUser?.id);
      if (other && !map.has(other.id)) {
        map.set(other.id, {
          id: other.id,
          name: other.name,
          avatarUrl: other.avatarUrl,
          isOnline: other.isOnline ?? true,
          conversationId: c.id,
        });
      }
    });
    return Array.from(map.values());
  }, [conversations, currentUser]);

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
    const isVoice = last?.messageType === 'AUDIO';

    const actions = () => (
      <View style={styles.swipeActions}>
        <Pressable
          style={[styles.swipeAction, styles.muteAction]}
          onPress={() => Alert.alert('Chat muted', `${title ?? 'Conversation'} notifications are muted.`)}
        >
          <Text style={styles.swipeActionText}>Mute</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() =>
            Alert.alert('Delete chat', 'This chat will be removed from your list.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive' },
            ])
          }
        >
          <Text style={styles.swipeActionText}>Delete</Text>
        </Pressable>
      </View>
    );

    return (
      <Swipeable renderRightActions={actions} overshootRight={false}>
        <Pressable
          style={({ pressed }) => [
            styles.chatRow,
            isDark && styles.chatRowDark,
            pressed && styles.cardPressed,
          ]}
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
          <View style={styles.avatarWrap}>
            <Avatar uri={avatarUrl} name={title} size={48} isOnline={isOnline} />
          </View>
          <View style={styles.chatTextWrap}>
            <View style={styles.chatTopRow}>
              <Text style={[styles.chatTitle, isDark && styles.textDark]} numberOfLines={1}>
                {title ?? 'Conversation'}
              </Text>
              {last && (
                <Text
                  style={[
                    styles.chatTime,
                    unread > 0 ? styles.chatTimeUnread : styles.chatTimeRead,
                    isDark && unread === 0 && styles.textMutedDark,
                  ]}
                >
                  {formatListTime(last.createdAt)}
                </Text>
              )}
            </View>
            <View style={styles.chatBottomRow}>
              <View style={styles.previewRow}>
                {isVoice && <Mic size={14} color="#6D7B6B" style={{ marginRight: 4 }} />}
                <Text
                  style={[
                    styles.chatPreview,
                    unread > 0 ? styles.chatPreviewUnread : styles.chatPreviewRead,
                    isDark && styles.textSecondaryDark,
                  ]}
                  numberOfLines={1}
                >
                  {preview}
                </Text>
              </View>
              {unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : (
                <CheckCheck size={16} color={colors.primary} />
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      {/* Top Header */}
      {!hideHeader && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/chatly_logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerTitle, isDark && styles.textDark]}>Chatly</Text>
          </View>
          <Pressable
            style={styles.headerProfileBtn}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => navigation.navigate('Settings')}
          >
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.name || currentUser?.username}
              size={36}
              isOnline
              showRing
            />
          </Pressable>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
          <Search size={18} color="#6D7B6B" />
          <TextInput
            style={[styles.searchInput, isDark && styles.inputDark]}
            placeholder="Search conversations & friends..."
            placeholderTextColor="#6D7B6B"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <View style={styles.clearBtn}>
                <X size={14} color="#6D7B6B" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Online Friends / Stories Section */}
        {onlineFriends.length > 0 && (
          <View style={styles.storiesSection}>
            <View style={styles.storiesHeader}>
              <Text style={[styles.storiesTitle, isDark && styles.textDark]}>Online Friends</Text>
              <Pressable onPress={() => navigation.navigate('Friends')}>
                <Text style={styles.storiesLink}>View all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesRow}
            >
              {onlineFriends.map((f: any) => {
                const firstName = f.name.split(' ')[0];
                return (
                  <Pressable
                    key={f.id}
                    style={styles.storyItem}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        conversationId: f.conversationId,
                        title: f.name,
                        peerId: f.id,
                        peerAvatarUrl: f.avatarUrl,
                        peerIsOnline: f.isOnline,
                      })
                    }
                  >
                    <View style={styles.storyRing}>
                      <Avatar
                        uri={f.avatarUrl}
                        name={f.name}
                        size={52}
                        isOnline={f.isOnline}
                      />
                    </View>
                    <Text
                      style={[styles.storyName, isDark && styles.textSecondaryDark]}
                      numberOfLines={1}
                    >
                      {firstName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Conversations List */}
        {loading ? (
          <SkeletonList
            count={6}
            style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}
          />
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={[styles.stateTitle, isDark && styles.textDark]}>
              Couldn't load your chats
            </Text>
            <Text style={[styles.stateText, isDark && styles.textSecondaryDark]}>
              Check your connection and try again.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <RefreshCw size={15} color="#fff" />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No Conversations Yet</Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Start chatting with your friends securely and privately.
            </Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => navigation.navigate('Friends')}
            >
              <UserPlus size={16} color="#fff" />
              <Text style={styles.emptyCtaText}>Add New Friend</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map((item: any, idx: number) => (
            <React.Fragment key={item.id}>
              {renderItem({ item })}
              {idx < filtered.length - 1 && (
                <View style={[styles.itemDivider, isDark && styles.dividerDark]} />
              )}
            </React.Fragment>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: Math.max(insets.bottom, 12) + 72 },
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="New chat"
        onPress={openCompose}
      >
        <SquarePen size={22} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>

      {/* Bottom Dock */}
      {!hideDock && (
        <FloatingDock
          active="chats"
          navigation={navigation}
          unreadCount={conversations.reduce((sum: number, item: any) => sum + (item.unreadCount ?? 0), 0)}
        />
      )}

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} navigation={navigation} />

      {/* New Chat Modal */}
      <Modal visible={composeVisible} animationType="slide" transparent onRequestClose={closeCompose}>
        <Pressable style={styles.backdrop} onPress={closeCompose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={styles.sheetKeyboard}
        >
          <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: spacing.xl + Math.max(insets.bottom, 12) }]}>
            <View style={styles.grabber}><GripHorizontal size={22} color="#6D7B6B" /></View>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, isDark && styles.textDark]}>New Chat</Text>
              <Pressable
                style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                onPress={closeCompose}
              >
                <X size={18} color={isDark ? '#F1F0F5' : '#1A1B1F'} />
              </Pressable>
            </View>

            <View style={[styles.searchBar, isDark && styles.searchBarDark, { marginHorizontal: 0, marginBottom: spacing.md }]}>
              <Search size={16} color="#6D7B6B" />
              <TextInput
                style={[styles.searchInput, isDark && styles.inputDark]}
                placeholder="Search people by name"
                placeholderTextColor="#6D7B6B"
                value={search}
                onChangeText={handleSearch}
                autoFocus
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <X size={16} color="#6D7B6B" />
                </Pressable>
              )}
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
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
                      <Text style={[styles.chatTitle, isDark && styles.textDark]} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.userSub} numberOfLines={1}>@{item.username}</Text>
                    </View>
                    {creating && <ActivityIndicator size="small" color={colors.primary} />}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={[styles.emptySmall, isDark && styles.textSecondaryDark]}>
                    No people found
                  </Text>
                }
              />
            ) : (
              <Text style={[styles.hint, isDark && styles.textSecondaryDark]}>
                Start typing a name to find friends to chat with.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1B1F',
    letterSpacing: -0.3,
  },
  headerProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E7ED',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchBarDark: {
    backgroundColor: '#24252A',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1B1F',
  },
  inputDark: {
    color: '#F1F0F5',
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  storiesSection: {
    marginBottom: spacing.md,
  },
  storiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  storiesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  storiesLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  storiesRow: {
    gap: 14,
    paddingVertical: 2,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  storyRing: {
    padding: 2,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 4,
  },
  storyName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3D4A3C',
    textAlign: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  chatRowDark: {
    backgroundColor: 'transparent',
  },
  avatarWrap: {
    position: 'relative',
  },
  chatTextWrap: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1B1F',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  chatTimeRead: {
    color: '#6D7B6B',
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  chatPreview: {
    fontSize: 13.5,
  },
  chatPreviewUnread: {
    color: '#1A1B1F',
    fontWeight: '600',
  },
  chatPreviewRead: {
    color: '#6D7B6B',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#E9E7ED',
    marginLeft: 76,
  },
  dividerDark: {
    backgroundColor: '#28292E',
  },
  cardPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
  },
  swipeAction: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  muteAction: { backgroundColor: colors.primary },
  deleteAction: { backgroundColor: colors.danger },
  swipeActionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    zIndex: 40,
  },
  btnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  stateBox: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  stateText: {
    fontSize: 13,
    color: '#6D7B6B',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(114, 254, 136, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1B1F',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6D7B6B',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 240,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetKeyboard: {
    width: '100%',
    maxHeight: '85%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    maxHeight: '100%',
    ...shadows.lg,
  },
  sheetDark: {
    backgroundColor: '#1A1B1F',
  },
  grabber: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#24252A',
  },
  sheetListContent: {
    paddingBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radii.md,
  },
  userText: {
    flex: 1,
  },
  userSub: {
    fontSize: 12,
    color: '#6D7B6B',
    marginTop: 1,
  },
  emptySmall: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6D7B6B',
    fontSize: 13,
  },
  hint: {
    textAlign: 'center',
    marginTop: 24,
    color: '#6D7B6B',
    fontSize: 13,
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
  textMutedDark: {
    color: '#8E9A8C',
  },
});