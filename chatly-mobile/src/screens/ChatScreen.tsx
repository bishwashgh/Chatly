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
  Shield,
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
                <View
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
                      <Check size={13} color="rgba(255,255,255,0.85)" />
                    ) : (
                      <Check size={13} color="rgba(255,255,255,0.55)" />
                    )}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleOther,
                    isDark && styles.bubbleOtherDark,
                    isNextSameSender && { borderBottomLeftRadius: 18 },
                  ]}
                >
                  {renderMessageContent(item)}
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaTextOther, isDark && styles.textSecondaryDark]}>{formatTime(item.createdAt)}</Text>
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

      {/* Top Navigation Bar */}
      <View style={[styles.chatTopBar, isDark && styles.chatTopBarDark, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.backLink} onPress={() => navigation?.goBack()} hitSlop={8}>
          <ChevronLeft size={22} color={isDark ? '#72FE88' : colors.primary} />
          <Text style={[styles.backLinkText, isDark && styles.backLinkTextDark]}>Conversation</Text>
        </Pressable>
        <Pressable onPress={() => navigation?.navigate('Settings')}>
          <Avatar uri={peerAvatarUrl} name={peerName} size={36} isOnline={peerIsOnline} />
        </Pressable>
      </View>

      {/* FriendGate™ Protected Security Banner */}
      <View style={[styles.securityBanner, isDark && styles.securityBannerDark]}>
        <View style={styles.securityBannerLeft}>
          <Shield size={14} color="#0058BC" strokeWidth={2.2} />
          <Text style={styles.securityBannerTitle}>FriendGate™ Protected</Text>
        </View>
        <Text style={styles.securityBannerSub}>Mutual friends verified</Text>
      </View>

      {/* User Info Bar with Call Actions */}
      <View style={[styles.userInfoBar, isDark && styles.userInfoBarDark]}>
        <View style={styles.userInfoLeft}>
          <Avatar uri={peerAvatarUrl} name={peerName} size={42} isOnline={peerIsOnline} />
          <View style={styles.userNameCol}>
            <Text style={[styles.chatHeaderName, isDark && styles.textDark]} numberOfLines={1}>
              {peerName ?? 'Chat'}
            </Text>
            <View style={styles.activeRow}>
              <View style={[styles.pulsingDot, !peerIsOnline && styles.offlineDot]} />
              <Text style={[styles.activeStatusText, isDark && styles.textSecondaryDark]}>
                {peerTyping ? 'Typing…' : peerIsOnline ? 'Active now' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.callBtnsRow}>
          <Pressable
            style={[styles.circleActionBtn, isDark && styles.circleActionBtnDark]}
            onPress={() => handleCall('AUDIO')}
            accessibilityLabel="Voice Call"
          >
            <Phone size={17} color={isDark ? '#F1F0F5' : '#3D4A3C'} />
          </Pressable>
          <Pressable
            style={[styles.circleActionBtn, isDark && styles.circleActionBtnDark]}
            onPress={() => handleCall('VIDEO')}
            accessibilityLabel="Video Call"
          >
            <VideoIcon size={17} color={isDark ? '#F1F0F5' : '#3D4A3C'} />
          </Pressable>
        </View>
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

      <View style={[styles.composerWrap, isDark && styles.composerWrapDark, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <View style={styles.composerRow}>
          <Pressable
            onPress={() => setAttachmentVisible(true)}
            style={[styles.composerCircleBtn, isDark && styles.composerCircleBtnDark]}
          >
            <Plus size={20} color={isDark ? '#F1F0F5' : '#3D4A3C'} strokeWidth={2.4} />
          </Pressable>

          <View style={[styles.inputPill, isDark && styles.inputPillDark]}>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Message..."
              placeholderTextColor="#6D7B6B"
              value={draft}
              onChangeText={handleDraftChange}
              multiline
            />
            <Pressable onPress={() => setPickerVisible(true)} hitSlop={6}>
              <Smile size={20} color="#6D7B6B" />
            </Pressable>
          </View>

          {draft.trim() ? (
            <Pressable style={styles.sendCircleBtn} onPress={handleSend}>
              <Send size={17} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.composerCircleBtn,
                isDark && styles.composerCircleBtnDark,
                isRecording && styles.recordingBtn,
              ]}
              onPressIn={startRecording}
              onPressOut={handleVoiceSend}
            >
              <Mic size={19} color={isRecording ? '#fff' : (isDark ? '#F1F0F5' : '#3D4A3C')} />
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
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chatTopBarDark: {
    backgroundColor: '#1A1B1F',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  backLinkTextDark: {
    color: '#72FE88',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(216, 226, 255, 0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 88, 188, 0.08)',
  },
  securityBannerDark: {
    backgroundColor: '#17243B',
    borderBottomColor: 'rgba(216, 226, 255, 0.10)',
  },
  securityBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004493',
  },
  securityBannerSub: {
    fontSize: 11.5,
    color: 'rgba(0, 68, 147, 0.8)',
  },
  userInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 27, 31, 0.06)',
    ...shadows.sm,
  },
  userInfoBarDark: {
    backgroundColor: '#1A1B1F',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  userNameCol: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34C759',
  },
  offlineDot: {
    backgroundColor: '#6D7B6B',
  },
  activeStatusText: {
    fontSize: 12,
    color: '#3D4A3C',
  },
  callBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEEDF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtnDark: {
    backgroundColor: '#28292E',
  },
  listContent: { paddingVertical: spacing.md, paddingBottom: spacing.lg + 72 },
  messageRow: { paddingHorizontal: spacing.md, paddingVertical: 4 },
  dayWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  dayChip: {
    color: '#6D7B6B',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#E9E7ED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  bubbleMine: {
    backgroundColor: '#0070EB',
    borderBottomRightRadius: 4,
    ...shadows.sm,
  },
  bubbleOther: {
    backgroundColor: '#EEEDF3',
    borderBottomLeftRadius: 4,
  },
  bubbleOtherDark: {
    backgroundColor: '#28292E',
  },
  bubbleText: { color: '#1A1B1F', fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  metaTextMine: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  metaTextOther: { color: '#6D7B6B', fontSize: 11 },
  reactionRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reactionEmoji: { fontSize: 14 },
  quickReactions: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: 6,
    ...shadows.md,
  },
  quickReactionEmoji: { fontSize: 20 },
  replyAction: { width: 58, alignItems: 'center', justifyContent: 'center' },
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEEDF3',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: spacing.md,
    marginTop: spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6D7B6B' },
  typingText: { color: '#6D7B6B', fontSize: 12, marginLeft: 4 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#EEEDF3',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 27, 31, 0.06)',
  },
  replyText: { flex: 1, color: '#3D4A3C', fontSize: 12 },
  replyClose: { color: '#3D4A3C', fontSize: 22 },
  mediaImage: { width: '100%', maxWidth: 220, height: 220, borderRadius: radii.md, marginBottom: 4 },
  mediaVideo: { width: '100%', maxWidth: 220, height: 260, borderRadius: radii.md, marginBottom: 4, backgroundColor: '#102A2B' },
  composerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 27, 31, 0.06)',
  },
  composerWrapDark: {
    backgroundColor: '#1A1B1F',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEDF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCircleBtnDark: {
    backgroundColor: '#28292E',
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEDF3',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 44,
  },
  inputPillDark: {
    backgroundColor: '#28292E',
  },
  input: {
    flex: 1,
    color: '#1A1B1F',
    fontSize: 15,
    maxHeight: 90,
  },
  inputDark: {
    color: '#F1F0F5',
  },
  sendCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  recordingBtn: { backgroundColor: colors.danger },
  stateBox: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 80, gap: spacing.sm },
  stateTitle: { color: '#1A1B1F', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateText: { color: '#6D7B6B', fontSize: 13, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: 10, marginTop: spacing.sm, ...shadows.sm },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { color: '#6D7B6B', textAlign: 'center', marginTop: 80 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  textDark: { color: '#F1F0F5' },
  textSecondaryDark: { color: '#C2CEC0' },
});
