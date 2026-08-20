import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { MEDIA_URL } from '../config';
import { Message } from '../services/api';

type ChatBubbleProps = {
  message: Message;
  isOutgoing: boolean;
  senderName?: string;
  onReact: (message: Message) => void;
};

export function ChatBubble({ message, isOutgoing, senderName, onReact }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const renderMedia = () => {
    if (!message.media_url) return null;

    if (message.message_type === 'image') {
      return (
        <Image
          source={{ uri: MEDIA_URL(message.media_url) }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      );
    }

    if (message.message_type === 'audio') {
      return (
        <View style={styles.audioBubble}>
          <Ionicons name="mic" size={22} color={isOutgoing ? '#ffffff' : colors.primary} />
          <Text style={[styles.audioText, { color: isOutgoing ? '#ffffff' : colors.onSurface }]}>
            Voice message
          </Text>
        </View>
      );
    }

    if (message.message_type === 'video') {
      return (
        <View style={styles.fileBubble}>
          <Ionicons name="videocam" size={22} color={isOutgoing ? '#ffffff' : colors.primary} />
          <Text style={[styles.fileText, { color: isOutgoing ? '#ffffff' : colors.onSurface }]}>
            {message.file_name || 'Video'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.fileBubble}>
        <Ionicons name="document" size={22} color={isOutgoing ? '#ffffff' : colors.primary} />
        <Text style={[styles.fileText, { color: isOutgoing ? '#ffffff' : colors.onSurface }]}>
          {message.file_name || 'File'}
        </Text>
      </View>
    );
  };

  const bubble = isOutgoing ? (
    <View style={[styles.bubble, styles.outgoingBubble, styles.outgoingRadius]}>
      {senderName && message.message_type !== 'text' && (
        <Text style={styles.senderNameOutgoing}>{senderName}</Text>
      )}
      {renderMedia()}
      {message.content ? (
        <Text style={styles.contentOutgoing}>{message.content}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.timeOutgoing}>{formatTime(message.created_at)}</Text>
        <Ionicons
          name={message.status === 'read' ? 'checkmark-done' : message.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
          size={14}
          color={message.status === 'read' ? '#b8e6ff' : '#ffffff'}
        />
      </View>
    </View>
  ) : (
    <View style={[styles.bubble, styles.incomingBubble, styles.incomingRadius]}>
      {senderName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      {renderMedia()}
      {message.content ? (
        <Text style={styles.content}>{message.content}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.time}>{formatTime(message.created_at)}</Text>
      </View>
    </View>
  );

  const reactions = message.reactions || [];

  return (
    <View style={[styles.row, isOutgoing ? styles.outgoingRow : styles.incomingRow]}>
      <Pressable
        onLongPress={() => onReact(message)}
        delayLongPress={250}
        style={styles.bubbleWrap}
      >
        {bubble}
        {reactions.length > 0 && (
          <View style={[styles.reactionRow, isOutgoing ? styles.reactionRowOutgoing : styles.reactionRowIncoming]}>
            {reactions.map((r) => (
              <View
                key={r.emoji}
                style={[styles.reactionChip, r.reacted_by_me && styles.reactionChipMine]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 24 * 60 * 60 * 1000 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  outgoingRow: {
    justifyContent: 'flex-end',
  },
  incomingRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  incomingBubble: {
    backgroundColor: '#e4e6eb',
  },
  outgoingBubble: {
    backgroundColor: colors.primary,
    shadowColor: 'rgba(0, 132, 255, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  incomingRadius: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  outgoingRadius: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  content: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  contentOutgoing: {
    ...typography.bodyMd,
    color: '#ffffff',
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    marginBottom: 6,
  },
  audioBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  audioText: {
    ...typography.bodyMd,
    fontWeight: '600',
  },
  fileBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  fileText: {
    ...typography.bodyMd,
    flexShrink: 1,
  },
  senderName: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 3,
  },
  senderNameOutgoing: {
    ...typography.labelSm,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  time: {
    ...typography.labelSm,
    fontSize: 10,
    color: '#65676b',
  },
  timeOutgoing: {
    ...typography.labelSm,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bubbleWrap: {
    maxWidth: '82%',
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
    marginHorizontal: 4,
    gap: 3,
  },
  reactionRowOutgoing: {
    justifyContent: 'flex-end',
  },
  reactionRowIncoming: {
    justifyContent: 'flex-start',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
  },
  reactionChipMine: {
    backgroundColor: '#e8f1ff',
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurface,
    fontWeight: '600',
  },
});