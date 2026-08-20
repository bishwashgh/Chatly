import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '💯', '😍', '🤔'];

type ReactionPickerProps = {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function ReactionPicker({ visible, onSelect, onClose }: ReactionPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>React</Text>
          <View style={styles.grid}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                style={({ pressed }) => [styles.emojiBtn, pressed && styles.emojiBtnPressed]}
                onPress={() => {
                  onSelect(e);
                  onClose();
                }}
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    width: '85%',
  },
  title: {
    ...typography.bodyMd,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnPressed: {
    backgroundColor: '#e0e5ec',
    transform: [{ scale: 1.15 }],
  },
  emoji: {
    fontSize: 26,
  },
});