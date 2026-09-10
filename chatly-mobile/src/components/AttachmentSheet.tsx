import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileText, Image as ImageIcon, MapPin, X } from 'lucide-react-native';
import { colors, darkColors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type AttachmentAction = 'camera' | 'photos' | 'document' | 'location';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAction: (action: AttachmentAction, asset?: any) => void;
};

export function AttachmentSheet({ visible, onClose, onAction }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const choose = async (action: AttachmentAction) => {
    if (action === 'document') {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (!result.canceled) onAction(action, result.assets[0]);
      return;
    }
    if (action === 'location') {
      Alert.alert('Share location', 'Location sharing is ready for a location provider to be connected.');
      onClose();
      return;
    }
    onAction(action);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.sheet, { backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.8)' }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Share something</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}><X size={18} color={colors.textPrimary} /></Pressable>
          </View>
          <View style={styles.grid}>
            <Action icon={<Camera size={23} color="#fff" />} label="Camera" color="#4A6CF7" onPress={() => choose('camera')} palette={palette} />
            <Action icon={<ImageIcon size={23} color="#fff" />} label="Photos" color="#34C1B0" onPress={() => choose('photos')} palette={palette} />
            <Action icon={<FileText size={23} color="#fff" />} label="Document" color="#8B5CF6" onPress={() => choose('document')} palette={palette} />
            <Action icon={<MapPin size={23} color="#fff" />} label="Location" color="#F97316" onPress={() => choose('location')} palette={palette} />
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

function Action({ icon, label, color, onPress, palette }: { icon: React.ReactNode; label: string; color: string; onPress: () => void; palette: typeof colors }) {
  return <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={onPress}>
    <View style={[styles.actionIcon, { backgroundColor: color }]}>{icon}</View>
    <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 36, ...shadows.lg },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(99,99,102,0.35)', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  action: { alignItems: 'center', gap: spacing.sm, minWidth: 65 },
  actionIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
