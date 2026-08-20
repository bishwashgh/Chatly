import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { typography, spacing, ThemeColors } from '../theme';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { Avatar } from '../components/Avatar';
import { BottomNav, TabKey } from '../components/BottomNav';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { api, CallLog } from '../services/api';

type ProfileScreenProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

export function ProfileScreen({ activeTab, onTabPress }: ProfileScreenProps) {
  const { colors, isDark, toggleDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ friends: 0, conversations: 0, messages: 0 });
  const [notifications, setNotifications] = useState(true);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [showCalls, setShowCalls] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name || '');
    setBio(user?.bio || '');
  }, [user]);

  useEffect(() => {
    api
      .getMyStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('chatly_notifications').then((v) => {
      if (v !== null) setNotifications(v === 'on');
    }).catch(() => {});
  }, []);

  const toggleNotifications = (value: boolean) => {
    setNotifications(value);
    AsyncStorage.setItem('chatly_notifications', value ? 'on' : 'off').catch(() => {});
  };

  const openPrivacy = () => {
    Alert.alert(
      'Privacy Settings',
      'Your profile is visible to friends. Story visibility follows your friend list.\n\nMore privacy controls are coming soon.'
    );
  };

  const openCallHistory = async () => {
    try {
      const calls = await api.getCallHistory();
      setCallHistory(calls);
      setShowCalls(true);
    } catch {
      Alert.alert('Call History', 'No call history available yet.');
    }
  };

  const openStorage = () => {
    Alert.alert(
      'Media & Storage',
      'Your photos, voice messages and files are stored securely.\n\nMedia is hosted on the server and streamed on demand.'
    );
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        const mimeType = avatarUri.includes('.png') ? 'image/png' : 'image/jpeg';
        const upload = await api.uploadMedia(avatarUri, mimeType, 'avatar.jpg');
        avatarUrl = upload.url;
      }
      await api.updateProfile({
        display_name: displayName || undefined,
        bio: bio || undefined,
        avatar_url: avatarUrl,
      });
      const updated = await api.getMe();
      useAuthStore.getState().updateUser(updated);
      setEditMode(false);
      setAvatarUri(null);
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.display_name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <GlassPanel variant="card" rounded="lg" style={styles.heroCard}>
            <LinearGradient
              colors={[colors.primary + '22', 'transparent']}
              style={styles.heroGradient}
            />
            <View style={styles.heroHeader}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={editMode ? pickAvatar : undefined}
                activeOpacity={0.8}
                disabled={!editMode}
              >
                <LinearGradient
                  colors={[colors.primary, colors.gradientSecondary]}
                  style={styles.avatarRing}
                >
                  <Avatar
                    uri={avatarUri || user?.avatar_url}
                    name={user?.display_name}
                    size={104}
                  />
                </LinearGradient>
                {editMode && (
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={18} color={colors.surfaceContainerLowest} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.heroText}>
                <Text style={styles.displayName}>{user?.display_name}</Text>
                <Text style={styles.username}>@{user?.username}</Text>
                <Text style={styles.bio}>{user?.bio || 'Welcome to Chatly'}</Text>
              </View>
            </View>

            {editMode ? (
              <View style={styles.editPanel}>
                <Text style={styles.editLabel}>Display name</Text>
                <GlassPanel variant="panel" rounded="pill" style={styles.editInput}>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor={colors.onSurfaceVariant + '80'}
                    style={styles.editInputText}
                  />
                </GlassPanel>
                <Text style={styles.editLabel}>Bio</Text>
                <GlassPanel variant="panel" rounded="default" style={styles.editBioInput}>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell people about yourself"
                    placeholderTextColor={colors.onSurfaceVariant + '80'}
                    style={styles.editInputText}
                    multiline
                  />
                </GlassPanel>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.saveButton]}
                    onPress={handleSaveProfile}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditMode(false);
                      setAvatarUri(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => setEditMode(true)}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </GlassPanel>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: colors.glassBorderLight }]}>
              <Text style={styles.statValue}>{stats.friends}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
            <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: colors.glassBorderLight }]}>
              <Text style={styles.statValue}>{stats.conversations}</Text>
              <Text style={styles.statLabel}>Chats</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.messages}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>

          {/* Settings list */}
          <View style={styles.settingsList}>
            <SettingItem icon="lock-closed" color={colors.primary} title="Privacy Settings" subtitle="Manage who sees your activity" onPress={openPrivacy} />
            <SettingItem icon="notifications" color={colors.secondary} title="Notifications" subtitle="Push, Email, and SMS alerts" toggle value={notifications} onChange={toggleNotifications} />
            <SettingItem icon="moon" color={colors.tertiary} title="Dark Mode" subtitle={isDark ? 'Dark theme enabled' : 'Clean light interface'} toggle value={isDark} onChange={() => toggleDark()} />
            <SettingItem icon="call" color={colors.primary} title="Call History" subtitle="View your recent calls" onPress={openCallHistory} />
            <SettingItem icon="cloud-upload" color={colors.secondary} title="Media & Storage" subtitle="Photos, voice and videos" onPress={openStorage} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chatly v1.0.0</Text>
            <Text style={styles.footerText2}>Made with ❤ in Nepal</Text>
          </View>
        </ScrollView>

        <Modal
          visible={showCalls}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCalls(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Call History</Text>
                <TouchableOpacity onPress={() => setShowCalls(false)} hitSlop={10}>
                  <Ionicons name="close" size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              {callHistory.length === 0 ? (
                <Text style={styles.modalEmpty}>No calls yet. Start a call from any chat.</Text>
              ) : (
                <FlatList
                  data={callHistory}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => (
                    <View style={styles.callRow}>
                      <Ionicons
                        name={item.status === 'completed' ? 'call' : 'call-outline'}
                        size={18}
                        color={item.status === 'missed' ? '#ff3b30' : colors.secondary}
                      />
                      <View style={styles.callRowText}>
                        <Text style={styles.callRowType}>
                          {item.call_type === 'video' ? 'Video call' : 'Voice call'}
                        </Text>
                        <Text style={styles.callRowStatus}>
                          {item.status} · {item.duration}s
                        </Text>
                      </View>
                      <Text style={styles.callRowTime}>
                        {item.started_at ? new Date(item.started_at).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        <BottomNav activeTab={activeTab} onTabPress={onTabPress} />
      </View>
    </AmbientBackground>
  );
}

function SettingItem({
  icon,
  color,
  title,
  subtitle,
  toggle,
  value,
  onChange,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  toggle?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const enabled = toggle ? !!value : undefined;
  return (
    <TouchableOpacity style={styles.settingItem} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {toggle ? (
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleOn]}
          onPress={() => onChange && onChange(!enabled)}
        >
          <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      )}
    </TouchableOpacity>
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMain,
    paddingBottom: 110,
    gap: 16,
  },
  heroCard: {
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    borderRadius: 54,
    padding: 2,
  },
  heroText: {
    alignItems: 'center',
  },
  displayName: {
    ...typography.headlineLgMobile,
    color: colors.onBackground,
    textAlign: 'center',
  },
  username: {
    ...typography.bodyMd,
    color: colors.primary,
    marginTop: 2,
  },
  bio: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
  },
  editProfileText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
  },
  editPanel: {
    padding: 20,
    gap: 8,
  },
  editLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  editInput: {
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
  },
  editBioInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editInputText: {
    color: colors.onSurface,
    ...typography.bodyMd,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.surfaceContainerLowest,
    ...typography.bodyMd,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cancelButtonText: {
    color: colors.onSurface,
    ...typography.bodyMd,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 24,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headlineMd,
    color: colors.onBackground,
  },
  statLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  settingsList: {
    gap: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 24,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyLg,
    color: colors.onBackground,
    fontWeight: '600',
  },
  settingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '33',
    borderWidth: 1,
    borderColor: colors.primary + '80',
    justifyContent: 'center',
    padding: 3,
  },
  toggleOn: {
    backgroundColor: colors.primary + '66',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.onSurfaceVariant,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  footerText2: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    opacity: 0.7,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.marginMain,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  modalEmpty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 24,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  callRowText: {
    flex: 1,
    marginLeft: 12,
  },
  callRowType: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  callRowStatus: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  callRowTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});