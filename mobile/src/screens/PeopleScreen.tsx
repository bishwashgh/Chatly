import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassInput } from '../components/GlassInput';
import { Avatar } from '../components/Avatar';
import { BottomNav, TabKey } from '../components/BottomNav';
import { api, Conversation, User } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore, FriendRelation } from '../store/friendsStore';
import { useChatStore } from '../store/chatStore';

type PeopleScreenProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onOpenChat: (conversation: Conversation) => void;
};

export function PeopleScreen({ activeTab, onTabPress, onOpenChat }: PeopleScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const friends = useFriendsStore((s) => s.friends);
  const requests = useFriendsStore((s) => s.requests);
  const loadAll = useFriendsStore((s) => s.loadAll);
  const isLoading = useFriendsStore((s) => s.isLoading);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchStatuses, setSearchStatuses] = useState<Record<string, FriendRelation>>({});

  useEffect(() => {
    loadAll();
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await api.searchUsers(text.trim());
      setResults(users);
      // Resolve friend relation for each result
      const statuses: Record<string, FriendRelation> = {};
      await Promise.all(
        users.map(async (u) => {
          try {
            const res = await api.getFriendStatus(u.id);
            statuses[u.id] = (res.status as FriendRelation) || 'none';
          } catch {
            statuses[u.id] = 'none';
          }
        })
      );
      setSearchStatuses(statuses);
    } catch (e) {
      console.error('search error', e);
    } finally {
      setSearching(false);
    }
  };

  const openConversation = async (user: User) => {
    try {
      const conv = await api.createConversation(user.id);
      useChatStore.getState().loadConversations();
      onOpenChat(conv);
    } catch (e: any) {
      Alert.alert('Could not open chat', e.message || 'Please try again.');
    }
  };

  const handleAdd = async (user: User) => {
    try {
      const status = await useFriendsStore.getState().sendRequest(user.id);
      if (status === 'friends') {
        Alert.alert('You are now friends', `You and ${user.display_name} are now friends.`);
      } else {
        setSearchStatuses((prev) => ({ ...prev, [user.id]: 'outgoing' }));
      }
    } catch (e: any) {
      Alert.alert('Request failed', e.message || 'Could not send the request.');
    }
  };

  const handleAccept = async (user: User) => {
    try {
      await useFriendsStore.getState().acceptRequest(user.id);
    } catch (e: any) {
      Alert.alert('Could not accept', e.message || 'Please try again.');
    }
  };

  const handleDecline = async (user: User) => {
    try {
      await useFriendsStore.getState().declineRequest(user.id);
    } catch (e: any) {
      Alert.alert('Could not decline', e.message || 'Please try again.');
    }
  };

  const renderActionButton = (user: User, relation: FriendRelation, compact = false) => {
    if (relation === 'self') return null;
    if (relation === 'friends') {
      return (
        <TouchableOpacity style={[styles.chatButton, compact && styles.smallButton]} onPress={() => openConversation(user)}>
          <Ionicons name="chatbubble-ellipses" size={16} color={colors.surfaceContainerLowest} />
        </TouchableOpacity>
      );
    }
    if (relation === 'outgoing') {
      return (
        <View style={[styles.requestedBadge, compact && styles.smallButton]}>
          <Text style={styles.requestedText}>Requested</Text>
        </View>
      );
    }
    if (relation === 'incoming') {
      return (
        <TouchableOpacity style={[styles.acceptButton, compact && styles.smallButton]} onPress={() => handleAccept(user)}>
          <Ionicons name="person-add" size={16} color={colors.surfaceContainerLowest} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={[styles.addButton, compact && styles.smallButton]} onPress={() => handleAdd(user)}>
        <Ionicons name="person-add" size={16} color={colors.surfaceContainerLowest} />
      </TouchableOpacity>
    );
  };

  const renderRow = (user: User, relation: FriendRelation) => (
    <View style={styles.userItem}>
      <Avatar uri={user.avatar_url} name={user.display_name} size={48} online={user.is_online} />
      <TouchableOpacity style={styles.userInfo} onPress={() => openConversation(user)}>
        <Text style={styles.userName} numberOfLines={1}>{user.display_name}</Text>
        <Text style={styles.userUsername}>@{user.username}</Text>
      </TouchableOpacity>
      {renderActionButton(user, relation)}
    </View>
  );

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>People</Text>
          <View style={styles.topBarRight}>
            <Ionicons name="people" size={22} color={colors.primary} />
          </View>
        </View>

        <View style={styles.searchWrap}>
          <GlassInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Search users to add friends..."
            icon="search"
          />
        </View>

        {searching && <ActivityIndicator color={colors.primary} style={styles.loading} />}

        {!searching && query.trim().length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.listContent, { paddingBottom: 110 + insets.bottom }]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={48} color={colors.primary + '40'} />
                <Text style={styles.emptyText}>No users found for "{query}"</Text>
              </View>
            }
            renderItem={({ item }) =>
              renderRow(item, searchStatuses[item.id] || 'none')
            }
          />
        )}

        {query.trim().length === 0 && (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 110 + insets.bottom }]}
            ListHeaderComponent={
              <>
                {requests.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Friend Requests ({requests.length})</Text>
                    {requests.map((u) => renderRow(u, 'incoming'))}
                  </>
                )}
                <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
              </>
            }
            ListEmptyComponent={
              isLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.loading} />
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={48} color={colors.primary + '40'} />
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptyText}>
                    Search for people above and send a friend request to get started.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => renderRow(item, 'friends')}
          />
        )}

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
  title: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
  },
  topBarRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.marginMain,
    marginBottom: 8,
  },
  loading: {
    marginVertical: 20,
  },
  listContent: {
    paddingHorizontal: spacing.marginMain,
    paddingBottom: 110,
  },
  sectionTitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 16,
    marginBottom: 6,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  userUsername: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestedBadge: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestedText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});