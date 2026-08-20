import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { GlassPanel } from './GlassPanel';
import { useTheme } from '../store/themeStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MessageInputProps = {
  onSendText: (text: string) => void;
  onSendImage: () => void;
  onSendAudio: () => void;
  onTyping: (isTyping: boolean) => void;
};

export function MessageInput({ onSendText, onSendImage, onSendAudio, onTyping }: MessageInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const EMOJIS = [
    '😀', '😂', '😍', '😎', '🥳', '😢', '😡', '🥰',
    '👍', '👎', '👏', '🙏', '💪', '🔥', '❤️', '💯',
    '🎉', '🎂', '⚽', '🚀', '🍕', '☕', '🌹', '✨',
  ];

  const handleSend = () => {
    if (text.trim()) {
      onSendText(text.trim());
      setText('');
    }
  };

  const toggleAttachments = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAttachments(!showAttachments);
    if (showEmoji) setShowEmoji(false);
  };

  const toggleEmoji = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmoji(!showEmoji);
    if (showAttachments) setShowAttachments(false);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    onTyping(true);
  };

  const handleChangeText = (value: string) => {
    setText(value);
    onTyping(value.length > 0);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      {showEmoji && (
        <GlassPanel variant="card" rounded="default" style={styles.emojiPanel}>
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={styles.emojiItem}
              onPress={() => insertEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </GlassPanel>
      )}

      {showAttachments && (
        <GlassPanel variant="card" rounded="default" style={styles.attachPanel}>
          <TouchableOpacity
            style={styles.attachItem}
            onPress={() => {
              setShowAttachments(false);
              onSendImage();
            }}
          >
            <View style={[styles.attachIcon, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="image" size={22} color={colors.primary} />
            </View>
            <Text style={styles.attachLabel}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachItem}
            onPress={() => {
              setShowAttachments(false);
              onSendAudio();
            }}
          >
            <View style={[styles.attachIcon, { backgroundColor: colors.secondary + '22' }]}>
              <Ionicons name="mic" size={22} color={colors.secondary} />
            </View>
            <Text style={styles.attachLabel}>Voice</Text>
          </TouchableOpacity>
        </GlassPanel>
      )}

      <GlassPanel variant="panel" rounded="default" style={styles.inputBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={toggleAttachments}
        >
          <Ionicons name={showAttachments ? 'close' : 'add'} size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={toggleEmoji}
        >
          <Ionicons name={showEmoji ? 'close' : 'happy-outline'} size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder="Message..."
          placeholderTextColor={colors.onSurfaceVariant + '80'}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color={text.trim() ? '#ffffff' : colors.onSurfaceVariant} />
        </TouchableOpacity>
      </GlassPanel>
    </View>
  );
}

// Text import
import { Text } from 'react-native';

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.marginMain,
    paddingBottom: 24,
    paddingTop: 8,
  },
  attachPanel: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
    gap: 12,
  },
  attachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    padding: 12,
    gap: 4,
  },
  emojiItem: {
    width: '11%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    ...typography.bodyMd,
    paddingVertical: 10,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.primary + '33',
  },
  sendButtonPlaceholder: {
    width: 40,
    height: 40,
  },
});