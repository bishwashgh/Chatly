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
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  Paperclip,
  Plus,
  ChevronLeft,
  RefreshCw,
  Reply,
  Trash2,
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
  DELETE_MESSAGE,
} from '../graphql/messages.gql';
import { START_CALL } from '../graphql/calls.gql';
import { VoiceMessagePlayer } from '../components/VoiceMessagePlayer';
import { EmojiPicker } from '../components/EmojiPicker';
import { Avatar } from '../components/Avatar';
import { AmbientBackground } from '../components/AmbientBackground';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCall } from '../lib/CallContext';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { AttachmentSheet, AttachmentAction } from '../components/AttachmentSheet';
import { MessageContextMenu, MessageMenuAction } from '../components/MessageContextMenu';

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
  const { isDark } = useTheme();
  const [draft, setDraft] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [attachmentVisible, setAttachmentVisible] = useState(false);
  const [contextMessage, setContextMessage] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
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
  const [deleteMessage] = useMutation(DELETE_MESSAGE);
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
    await Haptics.selectionAsync();
    const content = replyingTo ? `↪ ${replyingTo.content ?? 'Message'}\n${draft.trim()}` : draft.trim();
    await sendMessage({ variables: { input: { conversationId, content, messageType: 'TEXT' } } });
    setDraft('');
    setReplyingTo(null);
    setTyping({ variables: { conversationId, isTyping: false } });
  }, [draft, replyingTo, conversationId, sendMessage, setTyping]);

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

  const handleAttachment = useCallback(async (action: AttachmentAction, asset?: any) => {
    setAttachmentVisible(false);
    if (action === 'photos') return handlePickMedia();
    if (action === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      const picked = result.assets[0];
      const isVideo = picked.type === 'video';
      const { data: uploadData } = await uploadMessageMedia({ variables: { file: { uri: picked.uri, name: picked.fileName ?? `camera-${Date.now()}`, type: isVideo ? 'video/mp4' : 'image/jpeg' } } });
      await sendMessage({ variables: { input: { conversationId, mediaUrl: uploadData?.uploadMessageMedia ?? picked.uri, messageType: isVideo ? 'VIDEO' : 'IMAGE' } } });
      return;
    }
    if (action === 'document' && asset?.uri) {
      const { data: uploadData } = await uploadMessageMedia({ variables: { file: { uri: asset.uri, name: asset.name ?? `file-${Date.now()}`, type: asset.mimeType ?? 'application/octet-stream' } } });
      await sendMessage({ variables: { input: { conversationId, mediaUrl: uploadData?.uploadMessageMedia ?? asset.uri, content: asset.name, messageType: 'FILE' } } });
    }
  }, [conversationId, handlePickMedia, sendMessage, uploadMessageMedia]);

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction({ variables: { messageId, emojiId: emoji } });
      setActiveMessageId(null);
    },
    [toggleReaction],
  );

  const handleMenuAction = useCallback((action: MessageMenuAction) => {
    const message = contextMessage;
    setContextMessage(null);
    if (!message) return;
    if (action === 'reply') setReplyingTo(message);
    if (action === 'delete') deleteMessage({ variables: { messageId: message.id }, refetchQueries: [{ query: MESSAGES_QUERY, variables: { conversationId } }] });
    if (action === 'react') handleReact(message.id, '❤️');
  }, [contextMessage, deleteMessage, conversationId, handleReact]);

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
    const isNextSameSender =
      index < messages.length - 1 &&
      messages[index + 1].sender.id === item.sender.id &&
      isSameDay(messages[index + 1].createdAt, item.createdAt);

    return (
      <View>
        {showDay && (
          <View style={styles.dayWrap}>
            <Text style={styles.dayChip}>{formatDay(item.createdAt)}</Text>
          </View>
        )}
        <Swipeable
          overshootLeft={false}
          renderLeftActions={() => (
            <View style={styles.replyAction}>
              <Reply size={18} color={colors.primary} />
            </View>
          )}
          onSwipeableOpen={() => {
            Haptics.selectionAsync();
            setReplyingTo(item);
          }}
        >
          <LongPressGestureHandler
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.ACTIVE) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setContextMessage(item);
              }
            }}
          >
            <View
              style={[
                styles.messageRow,
                {
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                  paddingBottom: isNextSameSender ? 2 : 7,
                  paddingTop: 2,
                },
              ]}
            >
              {isMine ? (
                <LinearGradient
                  colors={['#4A6CF7', '#34C1B0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.bubble,
                    styles.bubbleMine,
                    isNextSameSender && { borderBottomRightRadius: 18 },
                  ]}
                >
                  {renderMessageContent(item)}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaTextMine}>{formatTime(item.createdAt)}</Text>
                    {item.isRead ? (
                      <CheckCheck size={13} color="#FFFFFF" />
                    ) : item.isDelivered ? (
                      <Check size={13} color="rgba(255,255,255,0.76)" />
                    ) : (
                      <Check size={13} color="rgba(255,255,255,0.48)" />
                    )}
                  </View>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleOther,
                    isNextSameSender && { borderBottomLeftRadius: 18 },
                  ]}
                >
                  {renderMessageContent(item)}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaTextOther}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              )}

              {item.reactions?.length > 0 && (
                <View style={styles.reactionRow}>
                  {item.reactions.map((r: any) => (
                    <Text key={r.id} style={styles.reactionEmoji}>
                      {r.emoji}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </LongPressGestureHandler>
        </Swipeable>
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

      <BlurView
        intensity={85}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, spacing.sm) }]}
      >
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
      </BlurView>

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
        ListFooterComponent={peerTyping ? <View style={styles.typingBubble}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /><Text style={styles.typingText}>Typing…</Text></View> : null}
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
          <Pressable onPress={() => setAttachmentVisible(true)} style={styles.composerIconBtn}>
            <Plus size={22} color={colors.primary} strokeWidth={2.5} />
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

      {replyingTo && <View style={styles.replyBar}><Reply size={15} color={colors.primary} /><Text style={styles.replyText} numberOfLines={1}>Replying to {replyingTo.sender?.name ?? 'message'}: {replyingTo.content ?? 'attachment'}</Text><Pressable onPress={() => setReplyingTo(null)}><Text style={styles.replyClose}>×</Text></Pressable></View>}

      <AttachmentSheet visible={attachmentVisible} onClose={() => setAttachmentVisible(false)} onAction={handleAttachment} />
      <MessageContextMenu visible={!!contextMessage} message={contextMessage} mine={contextMessage?.sender?.id === currentUserId} onClose={() => setContextMessage(null)} onAction={handleMenuAction} />

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
  headerDark: { backgroundColor: 'rgba(28,28,30,0.94)' },
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
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  bubbleOther: {
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  bubbleText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  metaTextMine: { color: 'rgba(255,255,255,0.76)', fontSize: 11 },
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
  replyAction: { width: 58, alignItems: 'center', justifyContent: 'center' },
  typingBubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginLeft: spacing.lg, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  typingText: { color: colors.textMuted, fontSize: 12, marginLeft: 4 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  replyText: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  replyClose: { color: colors.textSecondary, fontSize: 22 },
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