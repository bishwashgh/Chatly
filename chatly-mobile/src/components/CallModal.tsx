import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useSubscription } from '@apollo/client';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { PhoneOff, Phone, Mic, MicOff, Video as VideoIcon, Camera, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { INCOMING_CALL_SUBSCRIPTION, END_CALL, UPDATE_CALL_STATUS } from '../graphql/calls.gql';
import { useCall, ActiveCall } from '../lib/CallContext';

const env = process.env as Record<string, string | undefined>;
// Validate and sanitize the LiveKit URL — Metro cache may serve stale/corrupted values
function resolveLiveKitUrl(): string {
  const raw = env.EXPO_PUBLIC_LIVEKIT_URL ?? '';
  // Detect corrupted URL patterns (double protocol, placeholder text, double slashes in host)
  if (!raw || raw.includes('your-livekit') || /wss?:\/\/.*\/\//.test(raw)) {
    console.warn('[CallModal] LiveKit URL invalid or corrupted, using fallback:', raw);
    return 'wss://chatly-q41rks5z.livekit.cloud';
  }
  return raw;
}
const LIVEKIT_URL = resolveLiveKitUrl();
console.log('[CallModal] LiveKit URL resolved to:', LIVEKIT_URL);

type CallModalProps = {
  currentUserId: string;
};

type Phase = 'incoming' | 'outgoing' | 'connected';

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCallGrid() {
  const tracks = useTracks([Track.Source.Camera]);
  return (
    <View style={styles.grid}>
      {tracks.filter(isTrackReference).map((trackRef) => (
        <VideoTrack key={trackRef.publication.trackSid} trackRef={trackRef} style={styles.videoTile} />
      ))}
    </View>
  );
}

function RingAvatar({ peer, size = 128 }: { peer: ActiveCall['peer']; size?: number }) {
  const ring = useSharedValue(1);
  useEffect(() => {
    ring.value = withRepeat(withTiming(1.18, { duration: 1000, easing: Easing.out(Easing.ease) }), -1, true);
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 1 - (ring.value - 1) * 2.5,
  }));

  const initials = (peer.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.ringHalo, ringStyle]} />
      {peer.avatarUrl ? (
        <Image source={{ uri: peer.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

function PulsingAcceptBtn({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={[styles.controlBtn, styles.acceptBtn]} onPress={onPress}>
        <Phone size={26} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

function CallBackdrop({ avatarUrl }: { avatarUrl?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={30}
        />
      ) : (
        <LinearGradient
          colors={['#1E2640', '#0E1322', '#06080E']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 7, 14, 0.72)' }]} />
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}

type CallRoomContentProps = {
  call: ActiveCall;
  phase: Phase;
  setPhase: (phase: Phase) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  elapsed: number;
  handleEnd: () => void;
};

function CallRoomContent({ call, phase, setPhase, isMuted, setIsMuted, elapsed, handleEnd }: CallRoomContentProps) {
  const isVideo = call.callType === 'VIDEO';
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const tracks = useTracks([isVideo ? Track.Source.Camera : Track.Source.Microphone]);
  const hasRemote = tracks.some((t) => !t.participant?.isLocal);

  useEffect(() => {
    if (hasRemote) setPhase('connected');
  }, [hasRemote, setPhase]);

  const isConnected = phase === 'connected';

  return (
    <>
      {isVideo ? (
        <View style={styles.videoStage}>
          <VideoCallGrid />
          <View style={styles.selfView}>
            <VideoIcon size={18} color="rgba(255,255,255,0.72)" />
            <Text style={styles.selfViewText}>You</Text>
          </View>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <RingAvatar peer={call.peer} />
        </View>
      )}

      <View style={styles.bottom}>
        <Text style={styles.name}>{call.peer.name}</Text>
        <Text style={styles.statusText}>
          {isConnected ? formatElapsed(elapsed) : call.isOutgoing ? 'Ringing…' : 'Connecting…'}
        </Text>

        <View style={styles.controls}>
          {isConnected ? (
            <>
              <Pressable style={[styles.controlBtn, isMuted && styles.activeControlBtn]} onPress={() => setIsMuted(!isMuted)}>
                {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
              </Pressable>
              {isVideo && (
                <Pressable style={[styles.controlBtn, !cameraEnabled && styles.activeControlBtn]} onPress={() => setCameraEnabled(!cameraEnabled)}>
                  {cameraEnabled ? <Camera size={24} color="#fff" /> : <VideoIcon size={24} color="#fff" />}
                </Pressable>
              )}
              <Pressable style={[styles.controlBtn, speakerEnabled && styles.activeControlBtn]} onPress={() => setSpeakerEnabled(!speakerEnabled)}>
                {speakerEnabled ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#fff" />}
              </Pressable>
              {isVideo && (
                <Pressable style={styles.controlBtn} onPress={() => {}}>
                  <RotateCcw size={22} color="#fff" />
                </Pressable>
              )}
              <Pressable style={[styles.controlBtn, styles.hangupBtn]} onPress={handleEnd}>
                <PhoneOff size={24} color="#fff" />
              </Pressable>
            </>
          ) : (
            <Pressable style={[styles.controlBtn, styles.hangupBtn]} onPress={handleEnd}>
              <PhoneOff size={24} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

export function CallModal({ currentUserId }: CallModalProps) {
  const insets = useSafeAreaInsets();
  const { activeCall, dismissCall, answerCall } = useCall();
  const [phase, setPhase] = useState<Phase>('outgoing');
  const [isMuted, setIsMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [endCall] = useMutation(END_CALL);
  const [updateCallStatus] = useMutation(UPDATE_CALL_STATUS);

  useSubscription(INCOMING_CALL_SUBSCRIPTION, {
    variables: { userId: currentUserId },
    onData: ({ data: subscriptionData }) => {
      const call = subscriptionData?.data?.incomingCall;
      if (call && !activeCall) {
        answerCall({
          sessionId: call.sessionId,
          channelName: call.channelName,
          callType: call.callType,
          roomToken: call.roomToken,
          peer: {
            id: call.caller.id,
            name: call.caller.name,
            avatarUrl: call.caller.avatarUrl,
          },
          isOutgoing: false,
        });
        setPhase('incoming');
      }
    },
  });

  useEffect(() => {
    if (!activeCall) {
      setElapsed(0);
      return;
    }
    setPhase(activeCall.isOutgoing ? 'outgoing' : 'incoming');
    setIsMuted(false);
  }, [activeCall]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  if (!activeCall) return null;

  const handleEnd = async () => {
    try {
      await updateCallStatus({ variables: { sessionId: activeCall.sessionId, status: phase === 'incoming' ? 'DECLINED' : 'ENDED' } });
      await endCall({ variables: { sessionId: activeCall.sessionId } });
    } catch {
      // ignore — closing locally regardless
    }
    dismissCall();
  };

  const callTypeLabel = activeCall.callType === 'VIDEO' ? 'Video call' : 'Audio call';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleEnd}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <CallBackdrop avatarUrl={activeCall.peer.avatarUrl} />

        {phase === 'incoming' ? (
          <>
            <View style={styles.centerContent}>
              <RingAvatar peer={activeCall.peer} />
              <Text style={styles.name}>{activeCall.peer.name}</Text>
              <Text style={styles.statusText}>Incoming {callTypeLabel.toLowerCase()}</Text>
            </View>
            <View style={styles.controls}>
              <Pressable style={[styles.controlBtn, styles.declineBtn]} onPress={handleEnd}>
                <PhoneOff size={26} color="#fff" />
              </Pressable>
              <PulsingAcceptBtn
                onPress={async () => {
                  await updateCallStatus({ variables: { sessionId: activeCall.sessionId, status: 'ACCEPTED' } });
                  setPhase('connected');
                }}
              />
            </View>
          </>
        ) : (
          <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={activeCall.roomToken}
            connect
            audio={!isMuted}
            video={activeCall.callType === 'VIDEO'}
            onDisconnected={() => dismissCall()}
          >
            <CallRoomContent
              call={activeCall}
              phase={phase}
              setPhase={setPhase}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              elapsed={elapsed}
              handleEnd={handleEnd}
            />
          </LiveKitRoom>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  videoStage: { flex: 1, position: 'relative', backgroundColor: 'transparent' },
  selfView: { position: 'absolute', right: 4, top: 16, width: 92, height: 124, borderRadius: 18, backgroundColor: 'rgba(28,28,30,0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  selfViewText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 5 },
  ringHalo: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: 'rgba(74,108,247,0.35)',
  },
  avatarFallback: {
    backgroundColor: '#1D1D27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 40, fontWeight: '700' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  statusText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  videoTile: { width: '48%', aspectRatio: 3 / 4, borderRadius: 16 },
  bottom: { alignItems: 'center', gap: 8, paddingBottom: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 8 },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControlBtn: { backgroundColor: '#4A6CF7' },
  acceptBtn: { backgroundColor: '#22C55E' },
  declineBtn: { backgroundColor: '#EF4444' },
  hangupBtn: { backgroundColor: '#EF4444' },
});