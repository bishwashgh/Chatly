import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useSubscription } from '@apollo/client';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { PhoneOff, Phone, Mic, MicOff, Video as VideoIcon, Camera, RotateCcw, Volume2, Volume1 } from 'lucide-react-native';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import {
  INCOMING_CALL_SUBSCRIPTION,
  CALL_STATUS_UPDATED_SUBSCRIPTION,
  END_CALL,
  UPDATE_CALL_STATUS,
} from '../graphql/calls.gql';
import { useCall, ActiveCall } from '../lib/CallContext';
import { colors } from '../lib/theme';

const configuredLiveKitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;
const DEFAULT_LIVEKIT_URL = 'wss://chatly-q41rks5z.livekit.cloud';

// LiveKit expects the cloud websocket origin only. Reject stale values such as
// `wss://your-livekit-wss//...` instead of passing them to the native SDK.
function resolveLiveKitUrl(): string {
  const raw = configuredLiveKitUrl?.trim() ?? '';
  const valid =
    raw.startsWith('wss://') &&
    !/[<>\s]/.test(raw) &&
    !raw.includes('your-livekit') &&
    !raw.slice('wss://'.length).includes('//') &&
    !raw.includes('/rtc/') &&
    !raw.includes('?');

  if (!valid) {
    console.warn('[CallModal] Invalid LiveKit URL; using fallback');
    return DEFAULT_LIVEKIT_URL;
  }
  return raw.replace(/\/+$/, '');
}
const LIVEKIT_URL = resolveLiveKitUrl();
console.log('[CallModal] LiveKit URL configured:', LIVEKIT_URL);

// Bundled ringtone, looped while an incoming call is ringing.
const RINGTONE = require('../../assets/ringtone.wav');

// LiveKit addresses audio outputs differently per platform: Android can pick
// the physical device, while iOS only exposes a default-vs-forced-speaker
// switch (Bluetooth/AirPlay there go through the system route picker).
const SPEAKER_OUTPUT = Platform.OS === 'ios' ? 'force_speaker' : 'speaker';
const EARPIECE_OUTPUT = Platform.OS === 'ios' ? 'default' : 'earpiece';
const NOTICE_TIMEOUT_MS = 1800;
// The audio session starts asynchronously with the room, and
// AudioSession.getAudioOutputs() reports nothing until it has. Poll briefly.
const AUDIO_ROUTE_RETRIES = 6;
const AUDIO_ROUTE_RETRY_MS = 400;

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
  const remoteTracks = tracks.filter(
    (trackRef) => isTrackReference(trackRef) && !trackRef.participant.isLocal,
  );

  return (
    <View style={styles.grid}>
      {remoteTracks.length > 0 ? (            remoteTracks.map((trackRef) => (
          <VideoTrack
            key={trackRef.publication.trackSid}
            trackRef={trackRef}
            style={styles.videoTile}
            // Someone else's camera is never mirrored.
            mirror={false}
          />
        ))
      ) : (
        <View style={styles.waitingForPeer}>
          <Text style={styles.waitingText}>Waiting for {"your friend's"} camera…</Text>
        </View>
      )}
    </View>
  );
}

function LocalVideoPreview() {
  const tracks = useTracks([Track.Source.Camera]);
  const localTrack = tracks.find(
    (trackRef) => isTrackReference(trackRef) && trackRef.participant.isLocal,
  );

  return (
    <View style={styles.selfView}>
      {localTrack && isTrackReference(localTrack) ? (
        // Explicitly un-mirrored: the self view should show what the other
        // person actually receives, not a mirror image.
        <VideoTrack trackRef={localTrack} style={styles.selfVideoTile} mirror={false} />
      ) : (
        <VideoIcon size={18} color="rgba(255,255,255,0.72)" />
      )}
      <Text style={styles.selfViewText}>You</Text>
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
  /** Briefly surface a one-line message over the call UI. */
  onNotice: (message: string | null) => void;
};

function CallRoomContent({ call, phase, setPhase, isMuted, setIsMuted, elapsed, handleEnd, onNotice }: CallRoomContentProps) {
  const isVideo = call.callType === 'VIDEO';
  const [cameraEnabled, setCameraEnabled] = useState(true);
  // Video calls start on the loudspeaker, audio calls on the earpiece - the
  // phone-dialer convention. The effect below applies this to the real audio
  // session on connect, so the switch always reflects where sound is going.
  const [speakerEnabled, setSpeakerEnabled] = useState(isVideo);
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);
  const tracks = useTracks([isVideo ? Track.Source.Camera : Track.Source.Microphone]);
  const hasRemote = tracks.some((t) => !t.participant?.isLocal);

  /**
   * Flip between the front and back camera.
   *
   * livekit-client 2.22 has no switchCamera on LocalParticipant, so this goes
   * one level down to the underlying react-native-webrtc MediaStreamTrack,
   * which exposes the native `_switchCamera()`.
   */
  const switchCamera = () => {
    const localRef = tracks.find(
      (trackRef) => isTrackReference(trackRef) && trackRef.participant?.isLocal,
    );
    const mediaStream = (localRef?.publication?.track as any)?.mediaStream;
    const streamTrack = mediaStream?.getVideoTracks?.()?.[0];

    if (!streamTrack?._switchCamera) {
      console.warn('[CallModal] Camera switching is not available on this track');
      return;
    }

    streamTrack._switchCamera();
    setUsingFrontCamera((prev) => !prev);
    Haptics.selectionAsync?.();
  };

  useEffect(() => {
    if (hasRemote) setPhase('connected');
  }, [hasRemote, setPhase]);

  const isConnected = phase === 'connected';

  // Mirrors speakerEnabled for effects that must not re-run when it changes.
  const desiredSpeakerRef = useRef(speakerEnabled);
  // Set once this call's output has been decided, so later re-runs (the mic
  // toggle below) never repeat the one-time headset detection.
  const routeResolvedRef = useRef(false);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show a short-lived message over the call UI. */
  const notify = useCallback(
    (message: string) => {
      onNotice(message);
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = setTimeout(() => {
        noticeTimeoutRef.current = null;
        onNotice(null);
      }, NOTICE_TIMEOUT_MS);
    },
    [onNotice],
  );

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  /**
   * Point the audio session at the loudspeaker or the earpiece.
   *
   * Resolves false when the device offers no such output, so callers can leave
   * the switch alone instead of showing a control that does nothing.
   */
  const applyAudioRoute = useCallback(async (toSpeaker: boolean): Promise<boolean> => {
    const target = toSpeaker ? SPEAKER_OUTPUT : EARPIECE_OUTPUT;
    try {
      const outputs = await AudioSession.getAudioOutputs();
      if (!outputs.includes(target)) {
        console.warn(`[CallModal] Audio output "${target}" is not available`, outputs);
        return false;
      }
      await AudioSession.selectAudioOutput(target);
      return true;
    } catch (error) {
      console.warn('[CallModal] Could not switch audio output:', error);
      return false;
    }
  }, []);

  // Pick the route once per call, after the room has started the audio session
  // (getAudioOutputs needs an active session). A connected headset wins: audio
  // is already going somewhere the user deliberately plugged in, so leave it.
  useEffect(() => {
    if (!isConnected || routeResolvedRef.current) return;
    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < AUDIO_ROUTE_RETRIES; attempt++) {
        let outputs: string[] = [];
        try {
          outputs = await AudioSession.getAudioOutputs();
        } catch (error) {
          console.warn('[CallModal] Could not read audio outputs:', error);
        }
        if (cancelled || routeResolvedRef.current) return;

        if (outputs.length > 0) {
          routeResolvedRef.current = true;

          if (outputs.includes('bluetooth') || outputs.includes('headset')) {
            desiredSpeakerRef.current = false;
            setSpeakerEnabled(false);
            return;
          }

          desiredSpeakerRef.current = isVideo;
          setSpeakerEnabled(isVideo);
          await applyAudioRoute(isVideo);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, AUDIO_ROUTE_RETRY_MS));
      }

      // Session never reported any outputs. Leave the platform default alone
      // rather than applying a route we could not verify.
      if (!cancelled) routeResolvedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, isVideo, applyAudioRoute]);

  // Muting and unmuting re-configures the audio session, which can reset the
  // route to the system default. Re-assert whatever the user last chose.
  useEffect(() => {
    if (!isConnected || !routeResolvedRef.current) return;
    applyAudioRoute(desiredSpeakerRef.current);
  }, [isMuted, isConnected, applyAudioRoute]);

  /** Loudspeaker <-> earpiece, applied to the real audio session. */
  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    desiredSpeakerRef.current = next;
    setSpeakerEnabled(next);
    Haptics.selectionAsync?.();

    applyAudioRoute(next).then((applied) => {
      if (applied) return;
      // Never claim a route the device refused.
      desiredSpeakerRef.current = !next;
      setSpeakerEnabled(!next);
      notify(next ? 'Speaker unavailable on this device' : 'Earpiece unavailable on this device');
    });
  };

  return (
    <>
      {isVideo ? (
        <View style={styles.videoStage}>
          <VideoCallGrid />
          <LocalVideoPreview />
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
              <Pressable
                style={[styles.controlBtn, speakerEnabled && styles.activeControlBtn]}
                onPress={toggleSpeaker}
                accessibilityRole="button"
                accessibilityState={{ selected: speakerEnabled }}
                accessibilityLabel={
                  speakerEnabled ? 'Speaker on, switch to earpiece' : 'Speaker off, switch to loudspeaker'
                }
              >
                {speakerEnabled ? <Volume2 size={24} color="#fff" /> : <Volume1 size={24} color="#fff" />}
              </Pressable>
              {isVideo && (
                <Pressable
                  style={[styles.controlBtn, !usingFrontCamera && styles.activeControlBtn]}
                  onPress={switchCamera}
                  accessibilityRole="button"
                  accessibilityLabel={
                    usingFrontCamera ? 'Switch to back camera' : 'Switch to front camera'
                  }
                >
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
  const [notice, setNotice] = useState<string | null>(null);

  const [endCall] = useMutation(END_CALL);
  const [updateCallStatus] = useMutation(UPDATE_CALL_STATUS);

  // Latest call kept in a ref so subscription callbacks never read stale state.
  const activeCallRef = useRef<ActiveCall | null>(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Guards against reacting twice to the same end event (for example the status
  // subscription firing after this client already hung up).
  const closingRef = useRef(false);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  /** Show a short reason for a remotely-ended call, then close the modal. */
  const finishRemotely = useCallback(
    (message: string) => {
      if (closingRef.current) return;
      closingRef.current = true;
      clearRingTimeout();
      const sessionId = activeCallRef.current?.sessionId;
      setNotice(message);
      finishTimeoutRef.current = setTimeout(() => {
        finishTimeoutRef.current = null;
        closingRef.current = false;
        setNotice(null);
        // Only close the call this notice belongs to; a newer call may have
        // arrived in the meantime.
        if (activeCallRef.current?.sessionId === sessionId) dismissCall();
      }, 1400);
    },
    [clearRingTimeout, dismissCall],
  );

  useSubscription(INCOMING_CALL_SUBSCRIPTION, {
    variables: { userId: currentUserId },
    onData: ({ data: subscriptionData }) => {
      const call = subscriptionData?.data?.incomingCallSignal;
      if (call && !activeCallRef.current) {
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

  // Learn about the other side accepting, declining or hanging up. Without this
  // the caller would keep ringing until its own timeout after a decline, and the
  // recipient would keep ringing after the caller cancels.
  useSubscription(CALL_STATUS_UPDATED_SUBSCRIPTION, {
    variables: { sessionId: activeCall?.sessionId ?? '' },
    skip: !activeCall,
    onData: ({ data: subscriptionData }) => {
      const updated = subscriptionData?.data?.callStatusUpdated;
      if (!updated) return;
      const outgoing = activeCallRef.current?.isOutgoing ?? false;

      if (updated.status === 'DECLINED') {
        // A decline on the recipient side is this client's own action, already
        // handled by handleEnd.
        if (!outgoing) return;
        finishRemotely('Call declined');
        return;
      }
      if (updated.status === 'ENDED' || updated.status === 'MISSED') {
        finishRemotely(outgoing ? 'Call ended' : 'Missed call');
        return;
      }
      if (updated.status === 'ACCEPTED' && outgoing) {
        // Answered: stop the no-answer timer. The room flips to connected once
        // the remote live audio/video participant actually joins.
        clearRingTimeout();
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

  // Give up on an unanswered outgoing call instead of ringing forever.
  useEffect(() => {
    if (!activeCall?.isOutgoing || phase !== 'outgoing') {
      clearRingTimeout();
      return;
    }
    clearRingTimeout();
    ringTimeoutRef.current = setTimeout(() => {
      endCall({ variables: { sessionId: activeCall.sessionId } }).catch(() => {});
      finishRemotely('No answer');
    }, 45_000);
    return clearRingTimeout;
  }, [activeCall, phase, clearRingTimeout, finishRemotely, endCall]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Ring while an incoming call is waiting to be answered, and stop the moment
  // it is answered, declined or ends. Only reachable while the app is running -
  // see the note on notifications for calls that arrive with the app closed.
  useEffect(() => {
    if (phase !== 'incoming') return;

    let cancelled = false;
    let sound: Audio.Sound | null = null;

    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const created = await Audio.Sound.createAsync(RINGTONE, {
          isLooping: true,
          volume: 1.0,
          shouldPlay: true,
        });
        if (cancelled) {
          await created.sound.unloadAsync().catch(() => {});
          return;
        }
        sound = created.sound;
      } catch (error) {
        console.warn('[CallModal] Could not start ringtone:', error);
      }
    })();

    return () => {
      cancelled = true;
      const current = sound;
      sound = null;
      if (current) {
        current.stopAsync().catch(() => {}).finally(() => {
          current.unloadAsync().catch(() => {});
        });
      }
    };
  }, [phase]);

  // Never leave a timer running past unmount.
  useEffect(() => {
    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  if (!activeCall) return null;

  const handleEnd = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearRingTimeout();
    try {
      await updateCallStatus({ variables: { sessionId: activeCall.sessionId, status: phase === 'incoming' ? 'DECLINED' : 'ENDED' } });
      await endCall({ variables: { sessionId: activeCall.sessionId } });
    } catch (error) {
      console.warn('[CallModal] Failed to update call status:', error);
    } finally {
      closingRef.current = false;
      // Always close the native room/modal locally, even if the API is waking up
      // or the network is temporarily unavailable.
      dismissCall();
    }
  };

  const callTypeLabel = activeCall.callType === 'VIDEO' ? 'Video call' : 'Audio call';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleEnd}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <CallBackdrop avatarUrl={activeCall.peer.avatarUrl} />

        {notice && (
          <View style={styles.notice} pointerEvents="none">
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

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
                  try {
                    await updateCallStatus({ variables: { sessionId: activeCall.sessionId, status: 'ACCEPTED' } });
                    setPhase('connected');
                  } catch (error) {
                    console.warn('[CallModal] Failed to accept call:', error);
                    dismissCall();
                  }
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
              onNotice={setNotice}
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
  selfView: { position: 'absolute', right: 4, top: 16, width: 92, height: 124, borderRadius: 18, backgroundColor: 'rgba(28,28,30,0.88)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  selfVideoTile: { ...StyleSheet.absoluteFillObject },
  selfViewText: { position: 'absolute', left: 8, bottom: 7, color: '#fff', fontSize: 11, fontWeight: '600' },
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
  videoTile: { width: '100%', height: '100%', borderRadius: 16 },
  waitingForPeer: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(28,28,30,0.72)' },
  waitingText: { color: 'rgba(255,255,255,0.72)', fontSize: 14 },
  notice: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  noticeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
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
  // Brand green, matching dockActive and the rest of the app's accents.
  activeControlBtn: { backgroundColor: colors.primary },
  acceptBtn: { backgroundColor: '#22C55E' },
  declineBtn: { backgroundColor: '#EF4444' },
  hangupBtn: { backgroundColor: '#EF4444' },
});