import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { Copy, CornerUpLeft, Forward, Trash2, X } from 'lucide-react-native';
import { colors, darkColors, radii, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type MessageMenuAction = 'reply' | 'forward' | 'delete' | 'react';
type Props = { visible: boolean; message?: any; mine: boolean; onClose: () => void; onAction: (action: MessageMenuAction) => void };export function MessageContextMenu({ visible, message, mine, onClose, onAction }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const copy = async () => {
 if (message?.content) await Clipboard.setStringAsync(message.content); onClose(); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.root}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={[styles.menu, { backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.82)' }]}>
        <View style={styles.handle} />
        <View style={styles.reactions}>{['❤️', '😂', '👍', '😮', '😢'].map((emoji) => <Pressable key={emoji} onPress={() => { onAction('react'); onClose(); }}><Text style={styles.emoji}>{emoji}</Text></Pressable>)}</View>
        <Item icon={<CornerUpLeft size={18} color={palette.textPrimary} />} label="Reply" onPress={() => onAction('reply')} />
        <Item icon={<Copy size={18} color={palette.textPrimary} />} label="Copy" onPress={copy} disabled={!message?.content} />
        <Item icon={<Forward size={18} color={palette.textPrimary} />} label="Forward" onPress={() => onAction('forward')} />
        {mine && <Item icon={<Trash2 size={18} color={colors.danger} />} label="Delete" danger onPress={() => { onClose(); Alert.alert('Delete message?', 'This message will be removed for everyone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onAction('delete') }]); }} />}
        <Pressable style={styles.cancel} onPress={onClose}><X size={17} color={colors.textSecondary} /><Text style={styles.cancelText}>Cancel</Text></Pressable>
      </BlurView>
    </View>
  </Modal>;
}
function Item({ icon, label, onPress, danger, disabled }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) { return <Pressable style={({ pressed }) => [styles.item, pressed && styles.pressed, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>{icon}<Text style={[styles.itemText, danger && { color: colors.danger }]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'flex-end' }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' }, menu: { padding: spacing.lg, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' }, handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: 'rgba(99,99,102,0.35)', marginBottom: spacing.md }, reactions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: radii.lg }, emoji: { fontSize: 28 }, item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.md }, itemText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' }, cancel: { minHeight: 48, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, cancelText: { color: colors.textSecondary, fontWeight: '700' }, pressed: { backgroundColor: 'rgba(0,0,0,0.06)' }, disabled: { opacity: 0.4 } });
