import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronRight, HelpCircle, LockKeyhole, LogOut, Pencil, ShieldCheck, UserRound } from 'lucide-react-native';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { AmbientBackground } from '../components/AmbientBackground';
import { FloatingDock } from '../components/FloatingDock';
import { colors, radii, shadows, spacing } from '../lib/theme';

export function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = React.useState(true);

  const handleLogout = () => {
    Alert.alert('Log out of Chatly?', 'You can sign back in anytime with Google.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const Row = ({ icon: Icon, title, subtitle, onPress, trailing }: any) => (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowIcon}><Icon size={18} color={colors.primary} strokeWidth={2.2} /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? <ChevronRight size={18} color={colors.textMuted} />}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AmbientBackground />
      <View style={styles.header}><Text style={styles.headerTitle}>Profile</Text><View style={styles.headerRule} /></View>
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Avatar uri={currentUser?.avatarUrl} name={currentUser?.name} size={92} showRing />
          <View style={styles.editBadge}><Pencil size={13} color="#fff" /></View>
        </View>
        <Text style={styles.name}>{currentUser?.name}</Text>
        <Text style={styles.username}>@{currentUser?.username}</Text>
        <Text style={styles.bio}>{currentUser?.bio || 'Make every conversation count.'}</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>ACCOUNT</Text>
        <Row icon={UserRound} title="Edit profile" subtitle="Name, photo, and bio" onPress={() => Alert.alert('Edit profile', 'Open your profile from the avatar menu on the Chats screen.')} />
        <Row icon={LockKeyhole} title="Privacy" subtitle="Control who can connect with you" onPress={() => Alert.alert('Privacy', 'Chatly only allows conversations between friends.')} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>PREFERENCES</Text>
        <Row icon={Bell} title="Notifications" subtitle="Message and call alerts" trailing={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#CBD5D5', true: colors.primaryLight }} thumbColor="#fff" />} />
        <Row icon={ShieldCheck} title="Chat privacy" subtitle="Your conversations stay between friends" onPress={() => Alert.alert('Chat privacy', 'Only accepted friends can start a conversation with you.')} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>SUPPORT</Text>
        <Row icon={HelpCircle} title="Help & feedback" onPress={() => Alert.alert('Help & feedback', 'Thanks for helping make Chatly better.')} />
        <Row icon={LogOut} title="Log out" onPress={handleLogout} />
      </View>
      <FloatingDock active="profile" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  headerRule: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.primaryLight, marginTop: 8 },
  profileCard: { alignItems: 'center', marginHorizontal: spacing.lg, padding: spacing.xl, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', ...shadows.md },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  editBadge: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  username: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 3 },
  bio: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: spacing.md },
  group: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  groupLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginLeft: spacing.md, marginBottom: spacing.xs },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.72 },
});
