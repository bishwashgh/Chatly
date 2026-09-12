import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import {
  AtSign,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  Palette,
  Pencil,
  ShieldBan,
  User,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { ProfileModal } from '../components/ProfileModal';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { FRIENDS_STATE_QUERY } from '../graphql/friends.gql';
import { UPDATE_PROFILE } from '../graphql/users.gql';

export function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { currentUser, updateUser, logout } = useAuth();
  const { isDark, setDarkMode } = useTheme();

  // The profile editor is a modal that owns its own form state; this screen
  // just decides when it is open.
  const [editorVisible, setEditorVisible] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const { data: friendsState } = useQuery(FRIENDS_STATE_QUERY);
  const pendingCount: number = friendsState?.friendRequests?.length ?? 0;

  const friendGated = currentUser?.friendGated ?? false;

  // Version comes from the built app rather than a literal, so it can never
  // drift from what was actually shipped.
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode;

  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Log out of Chatly?', 'You can sign back in anytime with your account credentials.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleCopyUsername = async () => {
    if (!currentUser?.username) return;
    await Clipboard.setStringAsync(`@${currentUser.username}`);
    Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 1500);
  };

  const handleFriendGatedToggle = async (value: boolean) => {
    Haptics.selectionAsync?.();
    // Update locally first so the switch does not lag behind the tap, then
    // revert if the server refuses the change.
    updateUser({ friendGated: value });
    try {
      await updateProfile({ variables: { input: { friendGated: value } } });
    } catch (e) {
      console.error('friend-gated update failed:', e);
      updateUser({ friendGated: !value });
      Alert.alert(
        'Could not save setting',
        'Your friends-only preference was not changed. Check your connection and try again.',
      );
    }
  };

  const toggleTheme = () => {
    Haptics.selectionAsync?.();
    setDarkMode(!isDark);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={isDark ? '#F1F0F5' : '#1A1B1F'} />
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>Settings</Text>
        </Pressable>

        <View style={styles.headerProfileBadge}>
          {currentUser?.avatarUrl ? (
            <Image
              source={{ uri: currentUser.avatarUrl }}
              style={styles.headerBadgeImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.headerBadgeText}>
              {(currentUser?.name || currentUser?.username || 'U')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, isDark && styles.cardDark]}>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => setEditorVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit your profile"
          >
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.name || currentUser?.username || 'User'}
              size={96}
            />
            <View style={styles.editBadge}>
              <Pencil size={14} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>

          <Text style={[styles.profileName, isDark && styles.textDark]}>
            {currentUser?.name || 'Your name'}
          </Text>
          <Text style={[styles.profileUsername, isDark && styles.textSecondaryDark]}>
            {currentUser?.username ? `@${currentUser.username}` : 'No username yet'}
          </Text>

          {/* Status Message Pill - opens the editor */}
          <Pressable
            style={[styles.statusPill, isDark && styles.statusPillDark]}
            onPress={() => setEditorVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit your bio"
          >
            <User size={16} color={colors.primary} />
            <Text style={[styles.statusText, isDark && styles.textDark]} numberOfLines={2}>
              {currentUser?.bio || 'Add a bio so people know who you are'}
            </Text>
            <Pencil size={13} color="#6D7B6B" />
          </Pressable>
        </View>

        {/* Section 1: ACCOUNT */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>
            ACCOUNT
          </Text>
          <View style={[styles.groupCard, isDark && styles.cardDark]}>
            {/* Sign-in address. Static: Google accounts cannot change it here. */}
            <View style={styles.row}>
              <View style={[styles.rowIcon, styles.iconGreen]}>
                <Mail size={18} color={colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>Email Address</Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]} numberOfLines={1}>
                  {currentUser?.email || 'Not available'}
                </Text>
              </View>
            </View>

            <View style={[styles.rowDivider, isDark && styles.dividerDark]} />

            {/* Username - tapping copies it, which is how you get found. */}
            <Pressable style={styles.row} onPress={handleCopyUsername}>
              <View style={[styles.rowIcon, styles.iconGreen]}>
                <AtSign size={18} color={colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>Username</Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  Tap to copy - friends add you with this
                </Text>
              </View>
              {copiedUsername ? (
                <View style={styles.copiedWrap}>
                  <Check size={14} color={colors.primary} strokeWidth={3} />
                  <Text style={styles.copiedText}>Copied</Text>
                </View>
              ) : (
                <ChevronRight size={18} color="#6D7B6B" />
              )}
            </Pressable>

            {memberSince && (
              <>
                <View style={[styles.rowDivider, isDark && styles.dividerDark]} />
                <View style={styles.row}>
                  <View style={[styles.rowIcon, styles.iconGreen]}>
                    <CalendarDays size={18} color={colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, isDark && styles.textDark]}>Member Since</Text>
                    <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                      {memberSince}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Section 2: PRIVACY & SECURITY */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>
            PRIVACY & SECURITY
          </Text>
          <View style={[styles.groupCard, isDark && styles.cardDark]}>
            {/* Friend-Gated Status TOGGLE - persisted on the server */}
            <View style={styles.row}>
              <View style={[styles.rowIcon, styles.iconBlue]}>
                <Lock size={18} color={colors.secondary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                  Friend-Gated Status
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  {friendGated
                    ? 'Only friends can message you'
                    : 'Anyone can message you'}
                </Text>
              </View>
              <Switch
                value={friendGated}
                onValueChange={handleFriendGatedToggle}
                trackColor={{
                  false: isDark ? '#2F3035' : '#E9E7ED',
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? '#2F3035' : '#E9E7ED'}
              />
            </View>

            <View style={[styles.rowDivider, isDark && styles.dividerDark]} />

            {/* Pending Requests - count comes from the server */}
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('Friends')}
            >
              <View style={[styles.rowIcon, styles.iconBlue]}>
                <Users size={18} color={colors.secondary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                  Pending Requests
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  {pendingCount === 1
                    ? '1 waiting for approval'
                    : pendingCount > 1
                      ? `${pendingCount} waiting for approval`
                      : 'No pending requests'}
                </Text>
              </View>
              <View style={styles.rowTrailingWrap}>
                {pendingCount > 0 && (
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterBadgeText}>{pendingCount}</Text>
                  </View>
                )}
                <ChevronRight size={18} color="#6D7B6B" />
              </View>
            </Pressable>

            <View style={[styles.rowDivider, isDark && styles.dividerDark]} />

            {/* Blocked Contacts */}
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('BlockedContacts')}
            >
              <View style={[styles.rowIcon, styles.iconBlue]}>
                <ShieldBan size={18} color={colors.secondary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                  Blocked Contacts
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  Manage restricted users
                </Text>
              </View>
              <ChevronRight size={18} color="#6D7B6B" />
            </Pressable>
          </View>
        </View>

        {/* Section 3: PREFERENCES */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>
            PREFERENCES
          </Text>
          <View style={[styles.groupCard, isDark && styles.cardDark]}>
            {/* Push Notifications: not implemented yet. Shown as unavailable
                rather than as a switch that silently does nothing. */}
            <View style={styles.row}>
              <View style={[styles.rowIcon, styles.iconTertiary]}>
                <Bell size={18} color="#9C413D" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                  Push Notifications
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  Not available yet
                </Text>
              </View>
              <View style={styles.soonPill}>
                <Text style={styles.soonPillText}>SOON</Text>
              </View>
            </View>

            <View style={[styles.rowDivider, isDark && styles.dividerDark]} />

            {/* Appearance */}
            <Pressable style={styles.row} onPress={toggleTheme}>
              <View style={[styles.rowIcon, styles.iconTertiary]}>
                <Palette size={18} color="#9C413D" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                  Appearance
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  {isDark ? 'Dark & Clean' : 'Light & Vibrant'}
                </Text>
              </View>
              <ChevronRight size={18} color="#6D7B6B" />
            </Pressable>
          </View>
        </View>

        {/* Log Out Button */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutCard,
            isDark && styles.logoutCardDark,
            pressed && styles.pressed,
          ]}
          onPress={handleLogout}
        >
          <View style={styles.logoutLeft}>
            <View style={[styles.logoutIconBadge, isDark && styles.logoutIconBadgeDark]}>
              <LogOut size={18} color="#BA1A1A" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.logoutTitle}>Log Out</Text>
              <Text style={[styles.logoutSubtitle, isDark && styles.textSecondaryDark]}>
                Sign out of this device
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Version Info - read from the installed build */}
        <Text style={[styles.versionText, isDark && styles.textSecondaryDark]}>
          Chatly v{appVersion}
          {typeof buildNumber === 'number' ? ` (build ${buildNumber})` : ''}
        </Text>
      </ScrollView>

      <ProfileModal
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        navigation={navigation}
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
  headerProfileBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  headerBadgeImage: {
    width: '100%',
    height: '100%',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  profileCard: {
    backgroundColor: '#F4F3F8',
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardDark: {
    backgroundColor: '#1A1B1F',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  profileUsername: {
    fontSize: 13,
    color: '#6D7B6B',
    marginTop: 2,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 231, 237, 0.7)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
    maxWidth: '100%',
  },
  statusPillDark: {
    backgroundColor: '#28292E',
  },
  statusText: {
    flexShrink: 1,
    fontSize: 13.5,
    color: '#3D4A3C',
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D7B6B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#F4F3F8',
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGreen: {
    backgroundColor: 'rgba(0, 110, 40, 0.10)',
  },
  iconBlue: {
    backgroundColor: 'rgba(0, 88, 188, 0.10)',
  },
  iconTertiary: {
    backgroundColor: 'rgba(156, 65, 61, 0.10)',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1B1F',
  },
  rowSubtitle: {
    fontSize: 12.5,
    color: '#6D7B6B',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E9E7ED',
    marginLeft: 60,
  },
  dividerDark: {
    backgroundColor: '#28292E',
  },
  rowTrailingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copiedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soonPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: 'rgba(156, 65, 61, 0.12)',
  },
  soonPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9C413D',
    letterSpacing: 0.6,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 218, 214, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.16)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: '#BA1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutCardDark: {
    backgroundColor: 'rgba(186, 26, 26, 0.14)',
    borderColor: 'rgba(255, 180, 171, 0.22)',
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoutIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconBadgeDark: {
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BA1A1A',
    letterSpacing: -0.2,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: '#6D7B6B',
    marginTop: 2,
  },
  versionText: {
    fontSize: 12,
    color: '#6D7B6B',
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
  pressed: {
    opacity: 0.8,
  },
});
