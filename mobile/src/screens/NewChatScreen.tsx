import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassInput } from '../components/GlassInput';
import { Avatar } from '../components/Avatar';
import { api, Conversation, User } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

type NewChatScreenProps = {
  onBack: () => void;
  onOpenConversation: (conversation: Conversation) => void;
};

export function NewChatScreen({ onBack, onOpenConversation }: NewChatScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const user = useAuthStore((s) => s.user);

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
    } catch (e) {
      console.error('search error', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (otherUser: User) => {
    try {
      const conv = await api.createConversation(otherUser.id);
      // Update local conversation list
      useChatStore.getState().loadConversations();
      onOpenConversation(conv);
    } catch (e: any) {
      console.error('create conversation error', e);
    }
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Chat</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.searchWrap}>
          <GlassInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Search by name or username..."
            icon="search"
          />
        </View>

        {searching && <ActivityIndicator color={colors.primary} style={styles.loading} />}

        {!searching && results.length === 0 && query.trim().length > 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={colors.primary + '40'} />
            <Text style={styles.emptyText}>No users found for "{query}"</Text>
          </View>
        )}

        {query.trim().length === 0 && !searching && (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.primary + '40'} />
            <Text style={styles.emptyText}>
              Search for your friends by name or username to start a conversation.
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Avatar
                uri={item.avatar_url}
                name={item.display_name}
                size={52}
                online={item.is_online}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.userUsername}>@{item.username}</Text>
              </View>
              <View style={styles.chatButton}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.surfaceContainerLowest} />
              </View>
            </TouchableOpacity>
          )}
        />
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
  },
  searchWrap: {
    paddingHorizontal: spacing.marginMain,
    marginTop: 8,
    marginBottom: 8,
  },
  loading: {
    marginVertical: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.marginMain,
    paddingBottom: 32,
  },
  userItem: {
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
});