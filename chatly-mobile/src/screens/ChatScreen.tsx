import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import {
  Send,
  Smile,
  Mic,
  Phone,
  Video as VideoIcon,
  CheckCheck,
  Check,
  Image as ImageIcon,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react-native';
import {
  MESSAGES_QUERY,
  SEND_MESSAGE,
  TOGGLE_REACTION,
  TYPING,
  MARK_AS_READ,
  UPLOAD_MESSAGE_MEDIA,
  MESSAGE_ADDED_SUBSCRIPTION,
  MESSAGE_REACTION_UPDATED_SUBSCRIPTION,
  MESSAGE_STATUS_UPDATED_SUBSCRIPTION,
  USER_TYPING_STATUS_SUBSCRIPTION,
} from '../graphql/messages.gql';
import { START_CALL } from '../graphql/calls.gql';
import { VoiceMessagePlayer } from '../components/VoiceMessagePlayer';
import { EmojiPicker } from '../components/EmojiPicker';
import { Avatar } from '../components/Avatar';
import { AmbientBackground } from '../components/AmbientBackground';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCall } from '../lib/CallContext';
import { colors, radii, shadows, spacing } from '../lib/theme';

const QUICK_REACTIONS = [String.fromCodePoint(0x2764, 0xFE0F), String.fromCodePoint(0x1F602), String.fromCodePoint(0x1F44D), String.fromCodePoint(0x1F62E), String.fromCodePoint(0x1F622)];
const TYPING_DEBOUNCE_MS = 2500;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

type ChatScreenProps = {
  conversationId: string;
  currentUserId: string;
  peerId?: string;
  peerName?: string;
  peerAvatarUrl?: string;
  peerIsOnline?: boolean;
  navigation?: any;
};

export function ChatScreen({
  conversationId,
  currentUserId,
  peerId,
  peerName,
  peerAvatarUrl,
  peerIsOnline,
  navigation,
}: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlashList<any>>(null);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const { presentCall } = useCall();

  const { data, loading, error, refetch } = useQuery(MESSAGES_QUERY, { variables: { conversationId } });
  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [toggleReaction] = useMutation(TOGGLE_REACTION);
  const [setTyping] = useMutation(TYPING);
  const [markAsRead] = useMutation(MARK_AS_READ);
  const [uploadMessageMedia] = useMutation(UPLOAD_MESSAGE_MEDIA);
  const [startCall] = useMutation(START_CALL);

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, { variables: { conversationId }, onData: () => refetch() });
  useSubscription(MESSAGE_REACTION_UPDATED_SUBSCRIPTION, { variables: { conversationId }, onData: () => refetch() });
  useSubscription(MESSAGE_STATUS_UPDATED_SUBSCRIPTION, {
    variables: { conversationId },
    onData: ({ client, data: subData }) => {
      const status = subData?.data?.messageStatusUpdated;
      if (!status) return;
      client.cache.modify({
        id: client.cache.identify({ __typename: 'Message', id: status.messageId }),
        fields: {
          isRead: () => status.isRead,
          isDelivered: () => status.isDelivered,
        },
      });
    },
  });
  useSubscription(USER_TYPING_STATUS_SUBSCRIPTION, {
    variables: { conversationId },
    onData: ({ data: subData }) => {
      const payload = subData?.data?.userTypingStatus;
      if (payload && payload.userId !== currentUserId) setPeerTyping(payload.isTyping);
    },
  });

  const messages = data?.messages ?? [];

  useEffect(() => {
    const unread = messages.filter((m: any) => m.sender.id !== currentUserId && !m.isRead);
    unread.forEach((m: any) => markAsRead({ variables: { conversationId, messageId: m.id } }));
  }, [messages, currentUserId, conversationId, markAsRead]);

  // Scroll to the newest message when new ones arrive.
  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      setTyping({ variables: { conversationId, isTyping: true } });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ variables: { conversationId, isTyping: false } });
      }, TYPING_DEBOUNCE_MS);
    },
    [conversationId, setTyping],
  );

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    await sendMessage({ variables: { input: { conversationId, content: draft, messageType: 'TEXT' } } });
    setDraft('');
    setTyping({ variables: { conversationId, isTyping: false } });
  }, [draft, conversationId, sendMessage, setTyping]);

  const handleVoiceSend = useCallback(async () => {
    const uri = await stopRecording();
    if (!uri) return;
    const { data: uploadData } = await uploadMessageMedia({
      variables: { file: { uri, name: 'voice-note.m4a', type: 'audio/m4a' } },
    });
    const mediaUrl = uploadData?.uploadMessageMedia ?? uri;
    await sendMessage({ variables: { input: { conversationId, mediaUrl, messageType: 'AUDIO' } } });
  }, [stopRecording, conversationId, sendMessage, uploadMessageMedia]);

  const handlePickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    const { data: uploadData } = await uploadMessageMedia({
      variables: {
        file: {
          uri: asset.uri,
          name: asset.fileName ?? ('media-' + Date.now()),
          type: isVideo ? 'video/mp4' : 'image/jpeg',
        },
      },
    });
    const mediaUrl = uploadData?.uploadMessageMedia ?? asset.uri;
    await sendMessage({
      variables: { input: { conversationId, mediaUrl, messageType: isVideo ? 'VIDEO' : 'IMAGE' } },
    });
  }, [conversationId, sendMessage, uploadMessageMedia]);

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction({ variables: { messageId, emojiId: emoji } });
      setActiveMessageId(null);
    },
    [toggleReaction],
  );

  const handleCall = useCallback(
    async (callType: 'AUDIO' | 'VIDEO') => {
      if (!peerId || calling) return;
      setCalling(true);
      try {
        const { data: callData } = await startCall({ variables: { recipientId: peerId, callType } });
        const session = callData?.startCall;
        if (!session) return;
        presentCall({
          sessionId: session.id,
          roomToken: session.roomToken,
          channelName: session.channelName,
          callType: session.callType,
          peer: { id: peerId, name: peerName ?? 'Call', avatarUrl: peerAvatarUrl },
          isOutgoing: true,
        });
      } finally {
        setCalling(false);
      }
    },
    [peerId, calling, peerName, peerAvatarUrl, startCall, presentCall],
  );

  const renderMessageContent = (item: any) => {
    switch (item.messageType) {
      case 'AUDIO':
        return <VoiceMessagePlayer uri={item.mediaUrl} />;
      case 'IMAGE':
        return (
          <Pressable onPress={() => setLightbox(item.mediaUrl)}>
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.mediaImage}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        );
      case 'VIDEO':
        return (
          <Video
            source={{ uri: item.mediaUrl }}
            style={styles.mediaVideo}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
          />
        );
      default:
        return <Text style={styles.bubbleText}>{item.content}</Text>;
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.sender.id === currentUserId;
    const showDay = index === 0 || !isSameDay(messages[index - 1].createdAt, item.createdAt);

    return (
      <View>
        {showDay && (
          <View style={styles.dayWrap}>
            <Text style={styles.dayChip}>{formatDay(item.createdAt)}</Text>
          </View>
        )}
        <LongPressGestureHandler
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.ACTIVE) setActiveMessageId(item.id);
          }}
        >
          <View style={[styles.messageRow, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              {renderMessageContent(item)}
              <View style={styles.metaRow}>
                <Text style={isMine ? styles.metaTextMine : styles.metaTextOther}>
                  {formatTime(item.createdAt)}
                </Text>
                {isMine &&
                  (item.isRead ? (
                    <CheckCheck size={13} color={colors.accent} />
                  ) : item.isDelivered ? (
                    <Check size={13} color={colors.textMuted} />
                  ) : (
                    <Check size={13} color="rgba(100,116,139,0.4)" />
                  ))}
              </View>
            </View>

            {item.reactions?.length > 0 && (
              <View style={styles.reactionRow}>
                {item.reactions.map((r: any) => (
                  <Text key={r.id} style={styles.reactionEmoji}>{r.emoji}</Text>
                ))}
              </View>
            )}

            {activeMessageId === item.id && (
              <View style={styles.quickReactions}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable key={emoji} onPress={() => handleReact(item.id, emoji)}>
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </LongPressGestureHandler>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <AmbientBackground />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) } ]}>
        <Pressable style={styles.headerIconBtn} onPress={() => navigation?.goBack()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Avatar uri={peerAvatarUrl} name={peerName} size={38} isOnline={peerIsOnline} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{peerName ?? 'Chat'}</Text>
          <Text style={styles.headerStatus}>{peerTyping ? 'Typing…' : peerIsOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <Pressable style={styles.headerIconBtn} onPress={() => handleCall('AUDIO')}>
          <Phone size={18} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.headerIconBtn} onPress={() => handleCall('VIDEO')}>
          <VideoIcon size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <FlashList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => {
          if (messages.length) listRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.stateText}>Loading messages…</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Couldn’t load messages</Text>
              <Text style={styles.stateText}>Check your connection and try again.</Text>
              <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                <RefreshCw size={15} color="#fff" />
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>Say hi to start the conversation 👋</Text>
          )
        }
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <View style={[styles.composer, { maxWidth: screenWidth - spacing.md * 2 }]}>
          <Pressable onPress={handlePickMedia} style={styles.composerIconBtn}>
            <ImageIcon size={21} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setPickerVisible(true)} style={styles.composerIconBtn}>
            <Smile size={22} color={colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={handleDraftChange}
            multiline
          />
          {draft.trim() ? (
            <Pressable style={styles.sendBtn} onPress={handleSend}>
              <Send size={17} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.sendBtn, isRecording && styles.recordingBtn]}
              onPressIn={startRecording}
              onPressOut={handleVoiceSend}
            >
              <Mic size={17} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      <EmojiPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(emoji: string) => {
          setDraft((prev) => prev + emoji);
          setPickerVisible(false);
        }}
      />

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightbox} onPress={() => setLightbox(null)}>
          <Image source={{ uri: lightbox ?? undefined }} style={styles.lightboxImage} contentFit="contain" />
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerText: { flex: 1 },
  headerName: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  headerStatus: { color: colors.textSecondary, fontSize: 12 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  listContent: { paddingVertical: spacing.md, paddingBottom: spacing.lg + 72 },
  messageRow: { paddingHorizontal: spacing.lg, paddingVertical: 4 },
  dayWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  dayChip: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.sm,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  bubbleMine: {
    backgroundColor: colors.lavender,
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(15,118,110,0.14)',
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  bubbleText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  metaTextMine: { color: 'rgba(15,118,110,0.72)', fontSize: 11 },
  metaTextOther: { color: colors.textMuted, fontSize: 11 },
  reactionRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reactionEmoji: { fontSize: 14 },
  quickReactions: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: 6,
    ...shadows.md,
  },
  quickReactionEmoji: { fontSize: 20 },
  mediaImage: { width: '100%', maxWidth: 220, height: 220, borderRadius: radii.md, marginBottom: 4 },
  mediaVideo: { width: '100%', maxWidth: 220, height: 260, borderRadius: radii.md, marginBottom: 4, backgroundColor: '#102A2B' },
  composerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: Math.max(spacing.sm, 4),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radii.xl,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(15,118,110,0.18)',
    ...shadows.md,
  },
  composerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 110,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBtn: { backgroundColor: colors.danger },
  stateBox: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 80, gap: spacing.sm },
  stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: 10, marginTop: spacing.sm, ...shadows.sm },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 80 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
});