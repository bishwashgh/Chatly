import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { useCallStore } from '../store/callStore';
import { useAuthStore } from '../store/authStore';
import { Conversation } from '../services/api';

// RTCView is a native component not present in Expo Go. Resolve lazily so the
// screen module loads safely; video rendering is only shown when available.
let RTCView: any = null;
try {
  ({ RTCView } = require('react-native-webrtc'));
} catch (e) {
  RTCView = null;
}

type CallScreenProps = {
  conversation: Conversation;
  onEnded: () => void;
};

export function CallScreen({ conversation, onEnded }: CallScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    status,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall,
    rejectCall,
  } = useCallStore();

  const user = useAuthStore((s) => s.user);
  const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
  const otherName = otherParticipant?.display_name || otherParticipant?.username || 'User';
  const [elapsed, setElapsed] = useState(0);

  const isVideo = callType === 'video';

  useEffect(() => {
    if (status === 'connected') {
      const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'ended' || status === 'rejected' || status === 'missed') {
      const timer = setTimeout(() => onEnded(), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Incoming call...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatTime(elapsed);
      case 'rejected': return 'Call declined';
      case 'missed': return 'Call missed';
      case 'ended': return 'Call ended';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {isVideo && status === 'connected' && remoteStream && RTCView ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
        />
      ) : (
        <LinearGradient
          colors={['#0f1a2e', '#0a1220', '#060b14']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {isVideo && status === 'connected' && (
        <>
          <View style={styles.ambientOrb1} />
          <View style={styles.ambientOrb2} />
        </>
      )}

      {isVideo && status === 'connected' && localStream && RTCView && (
        <TouchableOpacity
          style={styles.pipContainer}
          activeOpacity={0.9}
          onPress={toggleCamera}
        >
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.pipVideo}
            objectFit="cover"
            zOrder={1}
          />
          {isCameraOff && (
            <View style={styles.pipOff}>
              <Ionicons name="videocam-off" size={20} color={colors.onSurface} />
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={[styles.overlay, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 60 }]}>
        <View style={styles.topSection}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, isVideo && status === 'connected' && styles.avatarRingVideo]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {otherName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.name}>{otherName}</Text>
          <Text style={[styles.statusText, status === 'connected' && styles.connectedText]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.controlsRow}>
            <ControlButton
              icon={isMuted ? 'mic-off' : 'mic'}
              label={isMuted ? 'Unmute' : 'Mute'}
              active={isMuted}
              onPress={toggleMute}
            />
            {isVideo && status === 'connected' && (
              <ControlButton
                icon={isCameraOff ? 'videocam-off' : 'videocam'}
                label={isCameraOff ? 'Camera on' : 'Camera off'}
                active={isCameraOff}
                onPress={toggleCamera}
              />
            )}
          </View>

          <TouchableOpacity style={styles.endButton} onPress={endCall} activeOpacity={0.8}>
            <Ionicons name="call" size={28} color={colors.error} />
          </TouchableOpacity>

          <Text style={styles.hintText}>
            {status === 'connected' ? 'End call to return to chat' : 'You can end the call anytime'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.controlButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.controlIcon, active && styles.controlIconActive]}>
        <Ionicons name={icon} size={24} color={active ? colors.tertiary : colors.onSurface} />
      </View>
      <Text style={[styles.controlLabel, active && { color: colors.tertiary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  ambientOrb1: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 132, 255, 0.1)',
  },
  ambientOrb2: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 178, 255, 0.08)',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarWrap: { marginBottom: 20 },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingVideo: { display: 'none' },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  avatarInitials: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  name: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  statusText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  connectedText: {
    color: colors.secondary,
    fontFamily: 'Manrope',
  },
  pipContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 110,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pipVideo: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pipOff: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  bottomSection: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 30,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
  },
  controlIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconActive: {
    backgroundColor: colors.errorContainer + '44',
  },
  controlLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  endButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  hintText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 16,
    opacity: 0.7,
  },
});