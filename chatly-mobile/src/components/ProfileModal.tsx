import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Camera, X, LogOut, UserRoundX, ShieldCheck, GripHorizontal } from 'lucide-react-native';
import { UPDATE_PROFILE, DEACTIVATE_ACCOUNT } from '../graphql/users.gql';
import { UPLOAD_MESSAGE_MEDIA } from '../graphql/messages.gql';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from './Avatar';
import { colors, radii, shadows, spacing } from '../lib/theme';

type ProfileModalProps = { visible: boolean; onClose: () => void };

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { currentUser, updateUser, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [uploadMedia] = useMutation(UPLOAD_MESSAGE_MEDIA);
  const [deactivateAccount] = useMutation(DEACTIVATE_ACCOUNT);

  useEffect(() => {
    if (visible && currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio ?? '');
      setAvatarUrl(currentUser.avatarUrl);
      setAvatarDirty(false);
      scrollY.value = 0;
    }
  }, [visible, currentUser, scrollY]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow Chatly to access your photos so you can choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const { data: uploadData } = await uploadMedia({
        variables: {
          file: { uri: asset.uri, name: asset.fileName ?? `avatar-${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg' },
        },
      });
      const url = uploadData?.uploadMessageMedia;
      if (!url) throw new Error('No upload URL returned');
      setAvatarUrl(url);
      setAvatarDirty(true);
    } catch (e) {
      console.error('avatar upload failed:', e);
      Alert.alert('Upload failed', 'Could not upload the new photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateProfile({
        variables: {
          input: {
            name: name.trim(),
            bio: bio.trim() || undefined,
            ...(avatarDirty ? { avatarUrl: avatarUrl || undefined } : {}),
          },
        },
      });
      if (data?.updateProfile) updateUser(data.updateProfile);
      onClose();
    } catch (e) {
      console.error('profile update failed:', e);
      Alert.alert('Something went wrong', 'Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out of Chatly?', 'You can sign back in anytime with Google.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            onClose();
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeactivate = () => {
    Alert.alert('Deactivate your account?', 'Your session will end and your account will be made inactive. This can be reversed by contacting support.', [
      { text: 'Keep account', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          setDeactivating(true);
          try {
            await deactivateAccount();
            onClose();
            await logout();
          } catch (e) {
            console.error('account deactivation failed:', e);
            Alert.alert('Could not deactivate', 'Please try again in a moment.');
          } finally {
            setDeactivating(false);
          }
        },
      },
    ]);
  };

  const actionDisabled = saving || uploading || loggingOut || deactivating;
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 110], [164, 100], Extrapolation.CLAMP),
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, 110], [1, 0.58], Extrapolation.CLAMP) }],
  }));
  const heroTextStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 110], [0, -12], Extrapolation.CLAMP) }],
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={styles.sheetKeyboard}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.grabber}><GripHorizontal size={22} color={colors.textMuted} /></View>
            <Animated.View style={[styles.hero, heroStyle]} pointerEvents="box-none">
              <Animated.View style={avatarStyle}>
                <Pressable onPress={pickAvatar} disabled={actionDisabled}>
                  {uploading ? (
                    <View style={styles.avatarLoading}><ActivityIndicator size="small" color={colors.primary} /></View>
                  ) : (
                    <Avatar uri={avatarUrl} name={name || currentUser?.name} size={96} showRing />
                  )}
                  <View style={styles.cameraBadge}><Camera size={16} color="#fff" /></View>
                </Pressable>
              </Animated.View>
              <Animated.View style={[styles.heroText, heroTextStyle]}>
                <Text style={styles.sheetTitle}>Your profile</Text>
                <Text style={styles.sheetSubtitle}>Make Chatly feel like yours</Text>
              </Animated.View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <X size={18} color={colors.textPrimary} />
              </Pressable>
            </Animated.View>

            <Animated.ScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.avatarHint}>Tap your photo to change it</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textMuted} editable={!actionDisabled} />
              <Text style={styles.label}>Bio</Text>
              <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} placeholder="Tell people about yourself" placeholderTextColor={colors.textMuted} multiline editable={!actionDisabled} />
              <Text style={styles.username}>@{currentUser?.username}</Text>

              <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} onPress={handleSave} disabled={actionDisabled}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save changes</Text>}
              </Pressable>

              <View style={styles.securityNote}>
                <ShieldCheck size={16} color={colors.success} />
                <Text style={styles.securityText}>Your profile details are only visible to your Chatly connections.</Text>
              </View>

              <View style={styles.divider} />
              <Pressable style={({ pressed }) => [styles.accountAction, pressed && styles.pressed]} onPress={handleLogout} disabled={actionDisabled}>
                {loggingOut ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <LogOut size={17} color={colors.textSecondary} />}
                <Text style={styles.accountActionText}>Log out</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.accountAction, styles.deactivateAction, pressed && styles.pressed]} onPress={handleDeactivate} disabled={actionDisabled}>
                {deactivating ? <ActivityIndicator size="small" color={colors.danger} /> : <UserRoundX size={17} color={colors.danger} />}
                <Text style={styles.deactivateText}>Deactivate account</Text>
              </Pressable>
            </Animated.ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.46)' },
  sheetKeyboard: { width: '100%', maxHeight: '82%' },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    ...shadows.lg,
  },
  grabber: { alignItems: 'center', height: 22, justifyContent: 'center' },
  hero: { alignItems: 'center', justifyContent: 'flex-start', position: 'relative', overflow: 'hidden' },
  heroText: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  closeBtn: { position: 'absolute', right: 0, top: 0, width: 34, height: 34, borderRadius: radii.full, backgroundColor: 'rgba(244,242,250,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarLoading: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: 2, bottom: 2, width: 29, height: 29, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  avatarHint: { color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xl },
  scrollContent: { paddingTop: 0, paddingBottom: spacing.xxl + spacing.lg },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: { backgroundColor: 'rgba(244,242,250,0.86)', borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.textPrimary, fontSize: 15, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  bioInput: { borderRadius: radii.md, minHeight: 76, textAlignVertical: 'top' },
  username: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  saveBtn: { backgroundColor: colors.charcoal, borderRadius: radii.full, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.md },
  securityText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  accountAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radii.md, paddingHorizontal: spacing.sm, backgroundColor: 'rgba(244,242,250,0.9)', borderWidth: 1, borderColor: colors.borderSoft, marginBottom: spacing.sm },
  deactivateAction: { backgroundColor: 'rgba(224,76,100,0.08)', borderColor: 'rgba(224,76,100,0.22)' },
  accountActionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  deactivateText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
