import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { Avatar } from '../components/Avatar';
import { BottomNav, TabKey } from '../components/BottomNav';
import { useChatStore } from '../store/chatStore';
import { Conversation } from '../services/api';

type GroupsScreenProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onOpenChat: (conversation: Conversation) => void;
};

export function GroupsScreen({ activeTab, onTabPress, onOpenChat }: GroupsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const groups = conversations.filter((c) => c.is_group);

  useEffect(() => {
    loadConversations();
  }, []);

  const getPreview = (conv: Conversation): string => {
    const msg = conv.last_message;
    if (!msg) return 'No messages yet';
    if (msg.message_type === 'image') return '📷 Photo';
    if (msg.message_type === 'audio') return '🎵 Voice message';
    if (msg.message_type === 'video') return '🎬 Video';
    return msg.content || '';
  };

  const getTimeLabel = (conv: Conversation): string => {
    if (!conv.last_message) return '';
    try {
      const date = new Date(conv.last_message.created_at);
      const now = new Date();
      if (now.getDate() === date.getDate()) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBarSpacer} />
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => Alert.alert('Create group', 'Group creation is coming soon.')}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 + insets.bottom }]}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.createGroupCard}
              onPress={() => Alert.alert('Create group', 'Group creation is coming soon.')}
            >
              <View style={styles.createGroupIcon}>
                <Ionicons name="people" size={20} color={colors.surfaceContainerLowest} />
              </View>
              <Text style={styles.createGroupText}>Create a new group</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.groupItem} activeOpacity={0.7} onPress={() => onOpenChat(item)}>
              <View style={styles.groupAvatar}>
                <Avatar uri={item.avatar_url} name={item.name || 'Group'} size={52} gradient />
              </View>
              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName} numberOfLines={1}>{item.name || 'Group'}</Text>
                  <Text style={styles.groupTime}>{getTimeLabel(item)}</Text>
                </View>
                <View style={styles.groupFooter}>
                  <Text style={styles.groupPreview} numberOfLines={1}>{getPreview(item)}</Text>
                  <View style={styles.memberCount}>
                    <Ionicons name="people-outline" size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.memberText}>{item.participants.length}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={colors.primary + '60'} />
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create a group to chat with many friends at once.</Text>
            </View>
          }
        />

        <BottomNav activeTab={activeTab} onTabPress={onTabPress} />
      </View>
    </AmbientBackground>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMain,
    paddingVertical: 12,
  },
  topBarSpacer: {
    width: 40,
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.marginMain,
    paddingBottom: 110,
  },
  createGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    borderRadius: 9999,
    paddingVertical: 12,
    marginBottom: 16,
  },
  createGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 16,
    marginBottom: 6,
    gap: 12,
  },
  groupAvatar: {
    marginRight: 0,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  groupName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  groupTime: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupPreview: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
});