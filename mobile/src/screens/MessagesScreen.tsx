import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { Avatar } from '../components/Avatar';
import { StoryViewer } from '../components/StoryViewer';
import { BottomNav, TabKey } from '../components/BottomNav';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';
import { useStoriesStore } from '../store/storiesStore';
import { api, Conversation, User } from '../services/api';
import { MEDIA_URL } from '../config';

type MessagesScreenProps = {
  onOpenChat: (conversation: Conversation) => void;
  onNewChat: () => void;
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

export function MessagesScreen({ onOpenChat, onNewChat, activeTab, onTabPress }: MessagesScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const user = useAuthStore((s) => s.user);
  const friends = useFriendsStore((s) => s.friends);
  const loadFriends = useFriendsStore((s) => s.loadAll);
  const storyGroups = useStoriesStore((s) => s.groups);
  const loadStories = useStoriesStore((s) => s.loadStories);
  const postStory = useStoriesStore((s) => s.postStory);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);

  useEffect(() => {
    loadConversations();
    loadFriends();
    loadStories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), loadFriends(), loadStories()]);
    setRefreshing(false);
  };

  const openFriendChat = async (friend: User) => {
    try {
      const conv = await api.createConversation(friend.id);
      loadConversations();
      onOpenChat(conv);
    } catch (e: any) {
      console.error('open friend chat error', e);
    }
  };

  const hasStory = (userId: string) => storyGroups.some((g) => g.user.id === userId);

  const myStoryCount = () => {
    const mine = storyGroups.find((g) => g.user.id === user?.id);
    return mine ? mine.stories.length : 0;
  };

  const uploadStory = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to post a story.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      const upload = await api.uploadMedia(asset.uri, 'image/jpeg', asset.fileName || 'story.jpg');
      await postStory(upload.url, 'image', asset.fileName || 'story.jpg');
      Alert.alert('Story posted', 'Your story is live for 24 hours.');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not post your story.');
    }
  };

  const uploadStoryMusic = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const name = asset.name || 'music.mp3';
    const mime = asset.mimeType || 'audio/mpeg';
    try {
      const upload = await api.uploadMedia(uri, mime, name);
      await postStory(upload.url, 'audio', name);
      Alert.alert('Story posted', 'Your music story is live for 24 hours.');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not post your music story.');
    }
  };

  const onAddStoryPress = () => {
    Alert.alert('New Story', 'Choose what to share', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Photo', onPress: () => uploadStory() },
      { text: 'Music', onPress: () => uploadStoryMusic() },
    ]);
  };

  const openViewerAt = (userId: string) => {
    const idx = storyGroups.findIndex((g) => g.user.id === userId);
    if (idx >= 0) setViewerIndex(idx);
  };

  const getConversationTitle = (conv: Conversation): string => {
    if (conv.name) return conv.name;
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other?.display_name || other?.username || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.avatar_url) return conv.avatar_url;
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other?.avatar_url || null;
  };

  const getLastMessagePreview = (conv: Conversation): string => {
    const msg = conv.last_message;
    if (!msg) return 'No messages yet';
    switch (msg.message_type) {
      case 'image':
        return '📷 Photo';
      case 'audio':
        return '🎵 Voice message';
      case 'video':
        return '🎬 Video';
      case 'file':
        return '📎 ' + (msg.file_name || 'File');
      default:
        return msg.content || '';
    }
  };

  const getTimeLabel = (conv: Conversation): string => {
    const msg = conv.last_message;
    if (!msg) return '';
    try {
      const date = new Date(msg.created_at);
      const now = new Date();
      if (now.getDate() === date.getDate()) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (yesterday.getDate() === date.getDate()) return 'Yesterday';
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.avatarButton} onPress={() => onTabPress('profile')}>
            <Avatar uri={user?.avatar_url} name={user?.display_name} size={40} />
          </TouchableOpacity>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity style={styles.searchButton} onPress={() => onTabPress('discover')}>
            <Ionicons name="search" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <>
              {/* Story / friends row */}
              <>
                <Text style={styles.sectionLabel}>Stories</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesRow}
                  >
                    <View style={styles.storyItem}>
                      <TouchableOpacity
                        style={[styles.storyRing, myStoryCount() > 0 ? styles.storyRingActive : styles.addStory]}
                        onPress={myStoryCount() > 0 ? () => openViewerAt(user?.id || '') : onAddStoryPress}
                      >
                        {myStoryCount() > 0 ? (
                          <Avatar
                            uri={user?.avatar_url}
                            name={user?.display_name}
                            size={60}
                            gradient
                          />
                        ) : (
                          <Ionicons name="add" size={28} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.storyLabel} numberOfLines={1}>
                        {myStoryCount() > 0 ? 'My Story' : 'Add Story'}
                      </Text>
                    </View>
                    {friends.map((f) => (
                      <View key={f.id} style={styles.storyItem}>
                        <TouchableOpacity
                          style={[styles.storyRing, hasStory(f.id) ? styles.storyRingActive : null]}
                          onPress={() => hasStory(f.id) && openViewerAt(f.id)}
                        >
                          <Avatar
                            uri={f.avatar_url}
                            name={f.display_name}
                            size={60}
                            gradient={hasStory(f.id)}
                            online={f.is_online}
                          />
                        </TouchableOpacity>
                        <Text style={styles.storyLabel} numberOfLines={1}>
                          {f.display_name.split(' ')[0]}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
              </>

              {/* New chat CTA */}
              <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.surfaceContainerLowest} />
                <Text style={styles.newChatText}>Start a new chat</Text>
              </TouchableOpacity>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.primary + '60'} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Search for users and start chatting with friends across Nepal.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onNewChat}>
                <Text style={styles.emptyButtonText}>Start a conversation</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isUnread = item.unread_count > 0;
            const other = item.participants.find((p) => p.id !== user?.id);
            return (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => onOpenChat(item)}
                activeOpacity={0.7}
              >
                <View style={styles.chatAvatarWrap}>
                  <Avatar
                    uri={getConversationAvatar(item)}
                    name={getConversationTitle(item)}
                    size={56}
                    online={!item.is_group ? other?.is_online : undefined}
                  />
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text
                      style={[
                        styles.chatName,
                        isUnread && { color: colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      {getConversationTitle(item)}
                    </Text>
                    <Text style={[styles.chatTime, isUnread && { color: colors.primary }]}>
                      {getTimeLabel(item)}
                    </Text>
                  </View>
                  <View style={styles.chatFooter}>
                    <Text
                      style={[
                        styles.chatPreview,
                        isUnread && { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {getLastMessagePreview(item)}
                    </Text>
                    {isUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {viewerIndex >= 0 && storyGroups[viewerIndex] && (
          <StoryViewer
            groups={storyGroups}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(-1)}
          />
        )}

        <BottomNav activeTab={activeTab} onTabPress={onTabPress} />
      </View>
    </AmbientBackground>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMain,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 110,
    paddingHorizontal: spacing.marginMain,
  },
  storiesRow: {
    paddingVertical: 16,
    gap: 16,
  },
  sectionLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
  storyRingActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 33,
    padding: 1,
  },
  addStory: {
    backgroundColor: colors.glassPanel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  storyLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    borderRadius: 9999,
    paddingVertical: 10,
    marginBottom: 16,
  },
  newChatText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 16,
    marginBottom: 6,
  },
  chatAvatarWrap: {
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  chatName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatPreview: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: colors.surfaceContainerLowest,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    color: colors.surfaceContainerLowest,
    ...typography.bodyMd,
  },
});