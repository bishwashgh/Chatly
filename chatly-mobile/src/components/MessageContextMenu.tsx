import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, CornerUpLeft, Forward, Trash2, X } from 'lucide-react-native';
import { colors, darkColors, radii, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type MessageMenuAction = 'reply' | 'forward' | 'delete';

type Props = {
  visible: boolean;
  message?: any;
  mine: boolean;
  onClose: () => void;
  onAction: (action: MessageMenuAction) => void;
  onReact: (emoji: string) => void;
};

const REACTIONS = ['❤️', '😂', '👍', '😮', '😢'];

export function MessageContextMenu({
  visible,
  message,
  mine,
  onClose,
  onAction,
  onReact,
}: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  const copy = async () => {
    if (!message?.content) return;
    await Clipboard.setStringAsync(message.content);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.menu,
            { backgroundColor: isDark ? 'rgba(28,28,30,0.96)' : 'rgba(255,255,255,0.96)' },
          ]}
        >
          <View style={styles.handle} />

          <View style={[styles.reactions, isDark && styles.reactionsDark]}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                style={({ pressed }) => [styles.reactionButton, pressed && styles.pressed]}
                onPress={() => {
                  onReact(emoji);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`React ${emoji}`}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Item
              icon={<CornerUpLeft size={18} color={palette.textPrimary} />}
              label="Reply"
              onPress={() => onAction('reply')}
            />
            <Item
              icon={<Copy size={18} color={palette.textPrimary} />}
              label="Copy"
              onPress={copy}
              disabled={!message?.content}
            />
            <Item
              icon={<Forward size={18} color={palette.textPrimary} />}
              label="Forward"
              onPress={() => onAction('forward')}
            />
          </View>

          {mine && (
            <Pressable
              style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}
              onPress={() => {
                onClose();
                Alert.alert(
                  'Delete message?',
                  'This message will be removed for everyone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => onAction('delete'),
                    },
                  ],
                );
              }}
            >
              <Trash2 size={18} color={colors.danger} />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          )}

          <Pressable style={styles.cancel} onPress={onClose}>
            <X size={17} color={palette.textSecondary} />
            <Text style={[styles.cancelText, isDark && styles.cancelTextDark]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Item({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={styles.itemText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    backgroundColor: 'rgba(99,99,102,0.35)',
    marginBottom: spacing.md,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(239,248,246,0.75)',
    borderRadius: radii.lg,
  },
  reactionsDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reactionButton: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  emoji: {
    fontSize: 27,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    borderRadius: radii.md,
  },
  itemText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAction: {
    minHeight: 48,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  cancel: {
    minHeight: 48,
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  cancelTextDark: {
    color: '#C2CEC0',
  },
  pressed: {
    backgroundColor: 'rgba(0,110,40,0.10)',
  },
  disabled: {
    opacity: 0.4,
  },
});
