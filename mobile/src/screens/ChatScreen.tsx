import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { Avatar } from '../components/Avatar';
import { ChatBubble } from '../components/ChatBubble';
import { MessageInput } from '../components/MessageInput';
import { ReactionPicker } from '../components/ReactionPicker';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { Conversation, Message, User } from '../services/api';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: Record<string, boolean> = {};

function AnimatedBubble({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

type ChatScreenProps = {
  conversation: Conversation;
  onBack: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onOpenProfile: () => void;
};

export function ChatScreen({ conversation, onBack, onStartCall, onOpenProfile }: ChatScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages[conversation.id] || EMPTY_MESSAGES);
  const typing = useChatStore((s) => s.typing[conversation.id] || EMPTY_TYPING);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendMediaMessage = useChatStore((s) => s.sendMediaMessage);
  const markRead = useChatStore((s) => s.markRead);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const callStatus = useCallStore((s) => s.status);

  const flatListRef = useRef<FlatList>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);

  const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
  const conversationTitle = conversation.name || otherParticipant?.display_name || otherParticipant?.username || 'Chat';
  const conversationAvatar = conversation.avatar_url || otherParticipant?.avatar_url || null;

  const isSomeoneTyping = otherParticipant ? typing[otherParticipant.id] : false;

  useEffect(() => {
    loadMessages(conversation.id);
    markRead(conversation.id);
  }, [conversation.id]);

  useEffect(() => {
    if (messages.length > 0) {
      // Mark received messages as read
      const latest = messages[messages.length - 1];
      if (latest.sender_id !== user?.id) {
        wsService.sendMessageRead(conversation.id, latest.id);
      }
    }
  }, [messages.length]);

  const handleSendText = (text: string) => {
    sendTextMessage(conversation.id, text);
    wsService.sendTyping(conversation.id, false);
  };

  const handleTyping = (isTyping: boolean) => {
    wsService.sendTyping(conversation.id, isTyping);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const upload = await api.uploadMedia(asset.uri, 'image/jpeg', asset.fileName || 'photo.jpg');
        await sendMediaMessage(conversation.id, {
          media_url: upload.url,
          message_type: 'image',
          file_name: upload.file_name,
          file_size: upload.file_size,
        });
      } catch (e: any) {
        Alert.alert('Upload failed', e.message || 'Could not upload image');
      }
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (e) {
      Alert.alert('Recording error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);

      if (uri) {
        const upload = await api.uploadMedia(uri, 'audio/m4a', 'voice_message.m4a');
        await sendMediaMessage(conversation.id, {
          media_url: upload.url,
          message_type: 'audio',
          file_name: 'voice_message.m4a',
          file_size: upload.file_size,
        });
      }
    } catch (e) {
      Alert.alert('Recording error', 'Could not save recording');
      setRecording(null);
      setIsRecording(false);
    }
  };

  const renderDateBubble = (createdAt: string) => {
    try {
      const date = new Date(createdAt);
      const now = new Date();
      let label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (now.getDate() === date.getDate()) label = 'Today';
      return (
        <View style={styles.dateWrap}>
          <View style={styles.dateBubble}>
            <Text style={styles.dateText}>{label}</Text>
          </View>
        </View>
      );
    } catch {
      return null;
    }
  };

  const renderHeader = () => (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerInfo} onPress={onOpenProfile}>
        <Avatar uri={conversationAvatar} name={conversationTitle} size={40} online={otherParticipant?.is_online} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{conversationTitle}</Text>
          <Text style={[styles.headerStatus, { color: otherParticipant?.is_online ? colors.success : colors.onSurfaceVariant }]}>
            {otherParticipant?.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={() => onStartCall('video')}>
          <Ionicons name="videocam" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={() => onStartCall('audio')}>
          <Ionicons name="call" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <AmbientBackground orbs={false}>
        <View style={styles.container}>
          {renderHeader()}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item, index }) => {
              const isOutgoing = item.sender_id === user?.id;
              // Show date bubble on first message of each day
              const prev = index > 0 ? messages[index - 1] : null;
              const showDate = !prev || new Date(prev.created_at).getDate() !== new Date(item.created_at).getDate();

              return (
                <AnimatedBubble>
                  {showDate && renderDateBubble(item.created_at)}
                  <ChatBubble
                    message={item}
                    isOutgoing={isOutgoing}
                    senderName={isOutgoing ? undefined : otherParticipant?.display_name}
                    onReact={setReactionTarget}
                  />
                </AnimatedBubble>
              );
            }}
            ListFooterComponent={
              isSomeoneTyping ? (
                <TypingIndicator />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.primary + '50'} />
                <Text style={styles.emptyChatText}>
                  Say hi to {conversationTitle.split(' ')[0]}! Messages are end-to-end delivered via Chatly.
                </Text>
              </View>
            }
          />

          {isRecording ? (
            <View style={styles.recorderBar}>
              <View style={styles.recordingPulse} />
              <Text style={styles.recordingText}>Recording...</Text>
              <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
                <Ionicons name="stop" size={24} color={colors.surfaceContainerLowest} />
              </TouchableOpacity>
            </View>
          ) : (
            <MessageInput
              onSendText={handleSendText}
              onSendImage={handlePickImage}
              onSendAudio={() => setShowRecorder(!showRecorder)}
              onTyping={handleTyping}
            />
          )}

          {showRecorder && !isRecording && (
            <View style={styles.recordButtonWrap}>
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <Ionicons name="mic" size={28} color={colors.surfaceContainerLowest} />
              </TouchableOpacity>
              <Text style={styles.recordHint}>Tap to record voice message</Text>
            </View>
          )}

          <ReactionPicker
            visible={reactionTarget !== null}
            onClose={() => setReactionTarget(null)}
            onSelect={(emoji) => {
              if (reactionTarget) {
                toggleReaction(conversation.id, reactionTarget.id, emoji);
              }
            }}
          />
        </View>
      </AmbientBackground>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMain,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  headerStatus: {
    ...typography.labelSm,
    fontSize: 10,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    flexGrow: 1,
  },
  dateWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateBubble: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dateText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyChatText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 260,
  },
  recorderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: spacing.marginMain,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  recordingText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  stopRecordingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonWrap: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 8,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  recordHint: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
});