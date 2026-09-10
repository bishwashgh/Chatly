import React from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows } from '../lib/theme';

const SYSTEM_EMOJIS = [
  String.fromCodePoint(0x1F600), String.fromCodePoint(0x1F603), String.fromCodePoint(0x1F604),
  String.fromCodePoint(0x1F60A), String.fromCodePoint(0x1F60D), String.fromCodePoint(0x1F602),
  String.fromCodePoint(0x1F923), String.fromCodePoint(0x1F60E), String.fromCodePoint(0x1F610),
  String.fromCodePoint(0x1F62E), String.fromCodePoint(0x1F622), String.fromCodePoint(0x1F62D),
  String.fromCodePoint(0x1F621), String.fromCodePoint(0x1F614), String.fromCodePoint(0x1F644),
  String.fromCodePoint(0x1F928),
  String.fromCodePoint(0x2764, 0xFE0F), String.fromCodePoint(0x1F493), String.fromCodePoint(0x1F49B),
  String.fromCodePoint(0x1F49C), String.fromCodePoint(0x1F525), String.fromCodePoint(0x1F44D),
  String.fromCodePoint(0x1F44E), String.fromCodePoint(0x1F44F), String.fromCodePoint(0x1F64F),
  String.fromCodePoint(0x1F389), String.fromCodePoint(0x1F388), String.fromCodePoint(0x1F4A1),
  String.fromCodePoint(0x1F4AA), String.fromCodePoint(0x1F91D), String.fromCodePoint(0x1F440),
  String.fromCodePoint(0x2728),
];

export function EmojiPicker({ visible, onClose, onSelect }: any) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <FlatList
          data={SYSTEM_EMOJIS}
          numColumns={8}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelect(item)} style={styles.emojiCell}>
              <Text style={styles.emojiText}>{item}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: '55%',
    ...shadows.lg,
  },
  handleWrap: { alignItems: 'center', marginBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: radii.full, backgroundColor: 'rgba(15,23,42,0.12)' },
  emojiCell: { width: '12.5%', height: 44, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
});