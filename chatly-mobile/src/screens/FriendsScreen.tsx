import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Check,
  X,
  UserPlus,
  QrCode,
  User,
  ChevronRight,
  MessageCircle,
  Zap,
} from 'lucide-react-native';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import {
  FRIENDS_STATE_QUERY,
  SEND_FRIEND_REQUEST,
  ACCEPT_FRIEND_REQUEST,
  DECLINE_FRIEND_REQUEST,
  REMOVE_FRIEND,
  BLOCK_USER,
} from '../graphql/friends.gql';
import { SEARCH_USERS, SUGGESTED_USERS_QUERY } from '../graphql/users.gql';
import { CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { FloatingDock } from '../components/FloatingDock';
import { SkeletonList } from '../components/SkeletonLoader';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { QrScannerModal } from '../components/QrScannerModal';
import { useTheme } from '../lib/ThemeContext';

export function FriendsScreen({
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
  const { data, loading, refetch } = useQuery(FRIENDS_STATE_QUERY);
  const { data: suggestedData } = useQuery(SUGGESTED_USERS_QUERY, { variables: { limit: 12 } });
  const [search, setSearch] = useState('');
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  const [sendRequest] = useMutation(SEND_FRIEND_REQUEST);
  const [acceptRequest] = useMutation(ACCEPT_FRIEND_REQUEST);
  const [declineRequest] = useMutation(DECLINE_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [blockUser] = useMutation(BLOCK_USER);
  const [createConversation, { loading: creating }] = useMutation(CREATE_DIRECT_CONVERSATION);

  const friends = data?.friends ?? [];
  const incoming = data?.friendRequests ?? [];
  const outgoing = data?.sentFriendRequests ?? [];
  const suggestions = suggestedData?.suggestedUsers ?? [];

  const searchResults = useMemo(() => {
    const results = searchData?.searchUsers ?? [];
    return results.filter((u: any) => u.id !== currentUser?.id);
  }, [searchData, currentUser]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.trim()) searchUsers({ variables: { query: text.trim() } });
  };

  const handleQrScanned = (value: string) => {
    setQrVisible(false);
    const username = value.replace(/^chatly:\/\//, '').replace(/^@/, '').split(/[/?#]/)[0];
    handleSearch(username);
    Alert.alert('QR code scanned', `Searching for @${username}`);
  };

  const run = async (mutation: any, userId: string, successNote?: string) => {
    setBusyId(userId);
    try {
      await mutation({
        variables: { userId },
        // Suggestions exclude anyone with a friendship row, so a request has to
        // refresh that list too or the person stays in it.
        refetchQueries: [{ query: FRIENDS_STATE_QUERY }, { query: SUGGESTED_USERS_QUERY }],
      });
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
            placeholder="Search friends or tag..."
            placeholderTextColor="#6D7B6B"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <View style={styles.clearBtn}>
                <X size={14} color="#6D7B6B" />
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.qrInlineBtn,
                isDark && styles.qrInlineBtnDark,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setQrVisible(true)}
              hitSlop={8}
              accessibilityLabel="Scan QR code"
            >
              <QrCode size={18} color={isDark ? '#53E16F' : colors.primary} />
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

        {/* Search Results (if searching) */}
        {search.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Search Results</Text>
            <View style={[styles.groupedCard, isDark && styles.cardDark]}>
              {searching ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : searchResults.length === 0 ? (
                <Text style={[styles.emptyHint, isDark && styles.textSecondaryDark]}>
                  No users found for "{search}"
                </Text>
              ) : (
                searchResults.map((u: any, idx: number) => {
                  const isFriend = friends.some((f: any) => f.id === u.id);
                  const isSent = outgoing.some((r: any) => r.user?.id === u.id);
                  return (
                    <React.Fragment key={u.id}>
                      <View style={styles.userRow}>
                        <Avatar uri={u.avatarUrl} name={u.name} size={44} isOnline={u.isOnline} />
                        <View style={styles.userTextWrap}>
                          <Text style={[styles.friendName, isDark && styles.textDark]}>{u.name}</Text>
                          <Text style={styles.friendSub}>@{u.username}</Text>
                        </View>
                        {isFriend ? (
                          <Pressable
                            style={styles.chatSmallBtn}
                            onPress={() => openChat(u)}
                          >
                            <Text style={styles.chatSmallBtnText}>Chat</Text>
                          </Pressable>
                        ) : isSent ? (
                          <View style={styles.sentPill}>
                            <Text style={styles.sentPillText}>Requested</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.connectBtn}
                            onPress={() => run(sendRequest, u.id, `Request sent to ${u.name}`)}
                            disabled={busy(u.id)}
                          >
                            {busy(u.id) ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <UserPlus size={14} color="#fff" />
                                <Text style={styles.connectBtnText}>Connect</Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>
                      {idx < searchResults.length - 1 && (
                        <View style={[styles.rowDivider, isDark && styles.dividerDark]} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* Requests Section */}
        {/* Requests Section */}
        {incoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Requests</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{incoming.length} New</Text>
              </View>
            </View>
            {incoming.map((req: any) => {
              const u = req.user;
              return (
                <View key={req.id || u.id} style={[styles.requestCard, isDark && styles.cardDark]}>
                  <View style={styles.requestLeftWrap}>
                    <View style={styles.requestAvatarWrap}>
                      <Avatar uri={u.avatarUrl} name={u.name} size={46} />
                      <View style={styles.boltBadge}>
                        <Zap size={10} color="#FFFFFF" strokeWidth={2.6} />
                      </View>
                    </View>
                    <View style={styles.requestTextWrap}>
                      <Text style={[styles.friendName, isDark && styles.textDark]}>{u.name}</Text>
                      <Text style={styles.friendSub}>Via QR Scan • Connected circle</Text>
                    </View>
                  </View>
                  <View style={styles.requestActionsRow}>
                    <Pressable
                      style={styles.declineBtn}
                      onPress={() => run(declineRequest, u.id)}
                      disabled={busy(u.id)}
                    >
                      <X size={17} color="#6D7B6B" />
                    </Pressable>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => run(acceptRequest, u.id, `${u.name} is now your friend`)}
                      disabled={busy(u.id)}
                    >
                      {busy(u.id) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Check size={17} color="#FFFFFF" strokeWidth={2.4} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Connections Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Connections</Text>
            <Text style={styles.activeCountText}>
              {friends.filter((f: any) => f.isOnline).length || friends.length} Active
            </Text>
          </View>

          <View style={[styles.groupedCard, styles.connectionsCard, isDark && styles.cardDark]}>
            {loading ? (
              <SkeletonList count={4} style={{ padding: spacing.md }} />
            ) : friends.length === 0 ? (
              <View style={styles.emptyFriendsBox}>
                <Text style={[styles.emptyHint, isDark && styles.textSecondaryDark]}>
                  No connections yet. Add friends using their tag or scan their QR code.
                </Text>
              </View>
            ) : (
              friends.map((friend: any, idx: number) => (
                <React.Fragment key={friend.id}>
                  <Pressable
                    style={({ pressed }) => [styles.friendRow, pressed && styles.cardPressed]}
                    onPress={() => openChat(friend)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open chat with ${friend.name}`}
                  >
                    <View style={styles.friendAvatarWrap}>
                      <Avatar
                        uri={friend.avatarUrl}
                        name={friend.name}
                        size={48}
                        isOnline={friend.isOnline}
                      />
                      <View style={[styles.connectionStatusDot, friend.isOnline ? styles.onlineDot : styles.offlineDot]} />
                    </View>
                    <View style={styles.friendTextWrap}>
                      <Text style={[styles.friendName, isDark && styles.textDark]} numberOfLines={1}>
                        {friend.name}
                      </Text>
                      <Text style={styles.friendSub} numberOfLines={1}>
                        @{friend.username} · {friend.isOnline ? 'Online now' : 'Active recently'}
                      </Text>
                    </View>
                    <View style={styles.friendChatAction}>
                      <MessageCircle size={16} color={isDark ? '#72FE88' : colors.primary} />
                      <Text style={[styles.friendChatText, isDark && styles.friendChatTextDark]}>Chat</Text>
                      <ChevronRight size={15} color={isDark ? '#72FE88' : colors.primary} />
                    </View>
                  </Pressable>
                  {idx < friends.length - 1 && (
                    <View style={[styles.rowDivider, isDark && styles.dividerDark]} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {/* Suggested Section - real accounts, no placeholders */}
        {suggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Suggested</Text>
              <Text style={styles.seeAllText}>People you may know</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedRow}
            >
              {suggestions.map((user: any) => (
                <View key={user.id} style={[styles.suggestedCard, isDark && styles.cardDark]}>
                  <Avatar
                    uri={user.avatarUrl}
                    name={user.name}
                    size={56}
                    isOnline={user.isOnline}
                  />
                  <Text
                    style={[styles.suggestedName, isDark && styles.textDark]}
                    numberOfLines={1}
                  >
                    {user.name}
                  </Text>
                  <Text
                    style={[styles.suggestedSub, isDark && styles.textSecondaryDark]}
                    numberOfLines={1}
                  >
                    @{user.username}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.suggestedConnectBtn,
                      busy(user.id) && styles.connectBtnBusy,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() =>
                      run(sendRequest, user.id, `Friend request sent to ${user.name}`)
                    }
                    disabled={busy(user.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Connect with ${user.name}`}
                  >
                    {busy(user.id) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <UserPlus size={15} color="#FFFFFF" strokeWidth={2.6} />
                        <Text style={styles.suggestedConnectText}>Connect</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Bottom Dock */}
      {!hideDock && (
        <FloatingDock active="friends" navigation={navigation} />
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        onScanned={handleQrScanned}
      />
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
  qrInlineBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 110, 40, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInlineBtnDark: {
    backgroundColor: 'rgba(83, 225, 111, 0.15)',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  newBadge: {
    backgroundColor: 'rgba(114, 254, 136, 0.3)',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  activeCountText: {
    fontSize: 13,
    color: '#6D7B6B',
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  groupedCard: {
    backgroundColor: '#F4F3F8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardDark: {
    backgroundColor: '#1C1D22',
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F3F8',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...shadows.sm,
  },
  requestLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  requestAvatarWrap: {
    position: 'relative',
  },
  boltBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  requestTextWrap: {
    flex: 1,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9E7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: spacing.md,
  },
  suggestedCard: {
    // Fixed width so the horizontal list scrolls evenly instead of squeezing
    // cards to fit the screen.
    width: 150,
    backgroundColor: '#F4F3F8',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...shadows.sm,
  },
  suggestedName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1B1F',
    marginTop: 10,
    textAlign: 'center',
  },
  suggestedSub: {
    fontSize: 12,
    color: '#6D7B6B',
    marginTop: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  // Filled and shadowed so it reads as a button, not as a coloured label.
  suggestedConnectBtn: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#004D1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  connectBtnBusy: {
    opacity: 0.6,
  },
  suggestedConnectText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  connectionsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    gap: 12,
    minHeight: 82,
    borderRadius: radii.md,
  },
  friendAvatarWrap: {
    position: 'relative',
  },
  connectionStatusDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    backgroundColor: '#34C759',
  },
  offlineDot: {
    backgroundColor: '#A4ADA3',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  userTextWrap: {
    flex: 1,
  },
  friendTextWrap: {
    flex: 1,
  },
  friendName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1A1B1F',
  },
  friendSub: {
    fontSize: 12.5,
    color: '#6D7B6B',
    marginTop: 3,
  },
  friendChatAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 110, 40, 0.08)',
  },
  friendChatText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  friendChatTextDark: {
    color: '#72FE88',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chatSmallBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  chatSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sentPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  sentPillText: {
    fontSize: 12,
    color: '#6D7B6B',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E9E7ED',
    marginLeft: 76,
    marginRight: spacing.md,
  },
  dividerDark: {
    backgroundColor: '#28292E',
  },
  loadingBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyFriendsBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: '#6D7B6B',
    textAlign: 'center',
    padding: spacing.md,
  },
  cardPressed: {
    backgroundColor: 'rgba(0, 110, 40, 0.06)',
    borderRadius: radii.md,
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
});
