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
  Lock,
  QrCode,
  User,
  ChevronRight,
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
import { SEARCH_USERS } from '../graphql/users.gql';
import { CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { FloatingDock } from '../components/FloatingDock';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { QrScannerModal } from '../components/QrScannerModal';
import { useTheme } from '../lib/ThemeContext';

export function FriendsScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, refetch } = useQuery(FRIENDS_STATE_QUERY);
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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      {/* Top Header */}
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
          onPress={() => navigation.navigate('Settings')}
        >
          <User size={18} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Search & QR Bar */}
      <View style={styles.searchBarRow}>
        <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
          <Search size={18} color="#6D7B6B" />
          <TextInput
            style={[styles.searchInput, isDark && styles.inputDark]}
            placeholder="Search friends or tag..."
            placeholderTextColor="#6D7B6B"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color="#6D7B6B" />
            </Pressable>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.qrButton, pressed && styles.btnPressed]}
          onPress={() => setQrVisible(true)}
          accessibilityLabel="Scan QR code"
        >
          <QrCode size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Friend-Gated Vault Banner */}
        <View style={[styles.vaultCard, isDark && styles.vaultCardDark]}>
          <View style={styles.vaultIconWrap}>
            <Lock size={18} color={colors.secondary} strokeWidth={2.4} />
          </View>
          <View style={styles.vaultTextWrap}>
            <Text style={[styles.vaultTitle, isDark && styles.vaultTitleDark]}>
              Friend-Gated Vault
            </Text>
            <Text style={[styles.vaultDesc, isDark && styles.vaultDescDark]}>
              Only verified connections can exchange secure payloads and chat messages.
            </Text>
          </View>
        </View>

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
        {incoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Requests</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{incoming.length} New</Text>
              </View>
            </View>
            <View style={[styles.groupedCard, isDark && styles.cardDark]}>
              {incoming.map((req: any, idx: number) => {
                const u = req.user;
                return (
                  <React.Fragment key={req.id || u.id}>
                    <View style={styles.requestRow}>
                      <View style={styles.requestAvatarWrap}>
                        <Avatar uri={u.avatarUrl} name={u.name} size={48} />
                        <View style={styles.boltBadge}>
                          <Zap size={11} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                      </View>
                      <View style={styles.requestTextWrap}>
                        <Text style={[styles.friendName, isDark && styles.textDark]}>{u.name}</Text>
                        <Text style={styles.friendSub}>Via QR Scan • Connected circle</Text>
                      </View>
                      <View style={styles.requestActionsRow}>
                        <Pressable
                          style={styles.declineBtn}
                          onPress={() => run(declineRequest, u.id)}
                          disabled={busy(u.id)}
                        >
                          <X size={18} color="#6D7B6B" />
                        </Pressable>
                        <Pressable
                          style={styles.acceptBtn}
                          onPress={() => run(acceptRequest, u.id, `${u.name} is now your friend`)}
                          disabled={busy(u.id)}
                        >
                          {busy(u.id) ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Check size={18} color="#FFFFFF" strokeWidth={2.4} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                    {idx < incoming.length - 1 && (
                      <View style={[styles.rowDivider, isDark && styles.dividerDark]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
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

          <View style={[styles.groupedCard, isDark && styles.cardDark]}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
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
                  >
                    <Avatar
                      uri={friend.avatarUrl}
                      name={friend.name}
                      size={48}
                      isOnline={friend.isOnline}
                    />
                    <View style={styles.friendTextWrap}>
                      <Text style={[styles.friendName, isDark && styles.textDark]}>
                        {friend.name}
                      </Text>
                      <Text style={styles.friendSub}>
                        {friend.isOnline
                          ? 'Online • End-to-end encrypted'
                          : 'Active recently'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#6D7B6B" />
                  </Pressable>
                  {idx < friends.length - 1 && (
                    <View style={[styles.rowDivider, isDark && styles.dividerDark]} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Dock */}
      <FloatingDock active="friends" navigation={navigation} />

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
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  qrButton: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  btnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  vaultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#D8E2FF',
    borderRadius: 16,
    padding: spacing.md,
    gap: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 88, 188, 0.12)',
  },
  vaultCardDark: {
    backgroundColor: '#17243B',
    borderColor: 'rgba(216, 226, 255, 0.15)',
  },
  vaultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 88, 188, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vaultTextWrap: {
    flex: 1,
  },
  vaultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#001A41',
    marginBottom: 2,
  },
  vaultTitleDark: {
    color: '#ADC6FF',
  },
  vaultDesc: {
    fontSize: 12.5,
    color: '#004493',
    lineHeight: 17,
  },
  vaultDescDark: {
    color: '#D8E2FF',
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
  groupedCard: {
    backgroundColor: '#F4F3F8',
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardDark: {
    backgroundColor: '#1A1B1F',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  requestAvatarWrap: {
    position: 'relative',
  },
  boltBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
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
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
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
    marginTop: 2,
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
    marginLeft: 72,
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
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
});
