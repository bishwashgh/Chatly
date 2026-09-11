import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useSubscription } from '@apollo/client';
// Type-only imports are erased at build time; the LiveKit runtime is loaded
// lazily in `connectRoom` so it stays out of the initial bundle.
import type { Participant, Room, Track } from 'livekit-client';
import { useAuth } from './AuthContext';
import {
  CALL_STATUS_UPDATED_SUBSCRIPTION,
  END_CALL,
  INCOMING_CALL_SUBSCRIPTION,
  START_CALL,
  UPDATE_CALL_STATUS,
} from '../graphql/operations';
import { isCallingConfigured, liveKitUrl } from '../lib/livekit';
import { readableError } from '../lib/format';
import type {
  ActiveCall,
  CallOffer,
  CallSession,
  CallStatusUpdate,
  CallType,
} from '../lib/types';

/** How long the caller waits for an answer before giving up. */
const RING_TIMEOUT_MS = 45_000;

export type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'active';

export type CallTrackInfo = {
  key: string;
  participantId: string;
  participantName: string;
  isLocal: boolean;
  kind: 'audio' | 'video';
  track: Track;
};

type StartCallArgs = {
  peerId: string;
  peerName?: string;
  peerAvatarUrl?: string | null;
  callType: CallType;
};

type CallContextValue = {
  phase: CallPhase;
  call: ActiveCall | null;
  tracks: CallTrackInfo[];
  isMuted: boolean;
  isCameraOn: boolean;
  durationSeconds: number;
  error: string | null;
  notice: string | null;
  isConfigured: boolean;
  /** True when a remote participant has actually joined. */
  peerConnected: boolean;
  startCall: (args: StartCallArgs) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  dismissError: () => void;
  dismissNotice: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  const [phase, setPhase] = useState<CallPhase>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [tracks, setTracks] = useState<CallTrackInfo[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [peerConnected, setPeerConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while this client is ending/declining the call, so its own status event
  // does not surface as a "call ended" notice.
  const closingRef = useRef(false);

  // Keep refs in sync so event handlers never read stale state.
  useEffect(() => {
    callRef.current = call;
  }, [call]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [startCallMutation] = useMutation<{ startCall: CallSession }>(START_CALL);
  const [updateCallStatus] = useMutation(UPDATE_CALL_STATUS);
  const [endCallMutation] = useMutation(END_CALL);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  /** Read the room's current local + remote tracks into renderable state. */
  const syncTracks = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setTracks([]);
      return;
    }

    const next: CallTrackInfo[] = [];

    const collect = (participant: Participant, isLocal: boolean) => {
      participant.trackPublications.forEach((publication) => {
        const track = publication.track;
        if (!track) return;
        next.push({
          key: publication.trackSid,
          participantId: participant.identity,
          participantName: participant.name || participant.identity,
          isLocal,
          kind: String(track.kind) === 'video' ? 'video' : 'audio',
          track,
        });
      });
    };

    collect(room.localParticipant, true);
    room.remoteParticipants.forEach((participant) => collect(participant, false));

    setTracks(next);
  }, []);

  /** Tear everything down. Safe to call repeatedly. */
  const teardown = useCallback(async () => {
    clearRingTimeout();

    const room = roomRef.current;
    roomRef.current = null;

    if (room) {
      room.removeAllListeners();
      await room.disconnect().catch(() => {
        /* already disconnected */
      });
    }

    setTracks([]);
    setCall(null);
    setPhase('idle');
    setIsMuted(false);
    setIsCameraOn(false);
    setDurationSeconds(0);
    setPeerConnected(false);
    closingRef.current = false;
  }, [clearRingTimeout]);

  const connectRoom = useCallback(
    async (active: ActiveCall) => {
      if (!liveKitUrl) throw new Error('LiveKit is not configured for this deployment');

      // Replace any stale room before starting a new session.
      const existing = roomRef.current;
      if (existing) {
        existing.removeAllListeners();
        await existing.disconnect().catch(() => {});
        roomRef.current = null;
      }

      // Loaded here so the LiveKit SDK never ships in the initial bundle.
      const { Room: LiveKitRoom, RoomEvent } = await import('livekit-client');

      const room = new LiveKitRoom({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, syncTracks);
      room.on(RoomEvent.TrackUnsubscribed, syncTracks);
      room.on(RoomEvent.LocalTrackPublished, syncTracks);
      room.on(RoomEvent.LocalTrackUnpublished, syncTracks);

      room.on(RoomEvent.ParticipantConnected, () => {
        setPeerConnected(true);
        setPhase((current) => (current === 'outgoing' ? 'active' : current));
        clearRingTimeout();
        syncTracks();
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        syncTracks();
        if (room.remoteParticipants.size === 0) {
          setPeerConnected(false);
          void teardown();
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        void teardown();
      });

      await room.connect(liveKitUrl, active.roomToken);

      await room.localParticipant.setMicrophoneEnabled(true);
      if (active.callType === 'VIDEO') {
        await room.localParticipant.setCameraEnabled(true);
        setIsCameraOn(true);
      }
      setIsMuted(false);
      syncTracks();
    },
    [clearRingTimeout, syncTracks, teardown],
  );

  /* --------------------------------------------------------- incoming */

  useSubscription<{ incomingCallSignal: CallOffer }>(INCOMING_CALL_SUBSCRIPTION, {
    variables: { userId: currentUser?.id ?? '' },
    skip: !currentUser?.id,
    onData: ({ data }) => {
      const offer = data?.data?.incomingCallSignal;
      if (!offer) return;

      // Already busy: tell the caller immediately so they stop ringing.
      if (phaseRef.current !== 'idle') {
        void updateCallStatus({
          variables: { sessionId: offer.sessionId, status: 'DECLINED' },
        }).catch(() => {});
        return;
      }

      setError(null);
      setNotice(null);
      setCall({
        sessionId: offer.sessionId,
        channelName: offer.channelName,
        callType: offer.callType,
        peer: offer.caller,
        roomToken: offer.roomToken,
        isCaller: false,
      });
      setPhase('incoming');
    },
  });

  /* ------------------------------------------- ring-state reconciliation */

  const isRinging = phase === 'outgoing' || phase === 'incoming';

  /**
   * The backend pushes `callStatusUpdated` to both participants of a session, so
   * a decline, cancellation or answer is known immediately. The subscription is
   * only active while a call is ringing.
   */
  useSubscription<{ callStatusUpdated: CallStatusUpdate }>(
    CALL_STATUS_UPDATED_SUBSCRIPTION,
    {
      variables: { sessionId: call?.sessionId ?? '' },
      skip: !isRinging || !call?.sessionId,
      onData: ({ data }) => {
        const update = data?.data?.callStatusUpdated;
        if (!update) return;
        if (closingRef.current) return;

        const current = callRef.current;
        if (!current || current.sessionId !== update.id) return;

        if (phaseRef.current === 'outgoing') {
          if (update.status === 'ACCEPTED') {
            // Stop the ring timeout; the LiveKit join confirms audio flow.
            clearRingTimeout();
            setPhase('active');
            return;
          }
          if (update.status === 'DECLINED') {
            setNotice('Call declined');
            void teardown();
            return;
          }
          if (update.status === 'ENDED' || update.status === 'MISSED') {
            setNotice('Call ended');
            void teardown();
          }
          return;
        }

        // Still ringing as the recipient: the caller hung up or gave up. A
        // DECLINED event here could only be this client's own decline, which is
        // already being handled locally.
        if (update.status === 'ENDED' || update.status === 'MISSED') {
          setNotice('Missed call');
          void teardown();
        }
      },
    },
  );

  /* ------------------------------------------------------- duration */

  useEffect(() => {
    if (phase !== 'active') return;

    const interval = setInterval(() => {
      setDurationSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  /* --------------------------------------------------------- actions */

  const startCall = useCallback(
    async ({ peerId, peerName, peerAvatarUrl, callType }: StartCallArgs) => {
      if (!isCallingConfigured) {
        setError('Calling is unavailable because LiveKit is not configured.');
        return;
      }
      if (phaseRef.current !== 'idle') return;

      setError(null);
      setNotice(null);
      setDurationSeconds(0);

      try {
        const { data } = await startCallMutation({
          variables: { recipientId: peerId, callType },
        });

        const session = data?.startCall;
        if (!session?.roomToken) throw new Error('The call session was not created');

        const active: ActiveCall = {
          sessionId: session.id,
          channelName: session.channelName,
          callType: session.callType,
          peer: {
            id: peerId,
            name: peerName ?? session.recipient?.name ?? 'Contact',
            avatarUrl: peerAvatarUrl ?? session.recipient?.avatarUrl ?? null,
          },
          roomToken: session.roomToken,
          isCaller: true,
        };

        setCall(active);
        setPhase('outgoing');

        await connectRoom(active);

        // Give up if nobody answers.
        clearRingTimeout();
        ringTimeoutRef.current = setTimeout(() => {
          void (async () => {
            closingRef.current = true;
            await endCallMutation({ variables: { sessionId: active.sessionId } }).catch(() => {});
            setNotice('No answer');
            await teardown();
          })();
        }, RING_TIMEOUT_MS);
      } catch (caught) {
        setError(readableError(caught));
        await teardown();
      }
    },
    [clearRingTimeout, connectRoom, endCallMutation, startCallMutation, teardown],
  );

  const acceptIncoming = useCallback(async () => {
    const pending = callRef.current;
    if (!pending || pending.isCaller) return;

    setError(null);
    setNotice(null);
    setPhase('active');

    try {
      await updateCallStatus({
        variables: { sessionId: pending.sessionId, status: 'ACCEPTED' },
      }).catch(() => {
        /* the caller still joins even if this signal is lost */
      });

      await connectRoom(pending);
    } catch (caught) {
      setError(readableError(caught));
      await teardown();
    }
  }, [connectRoom, teardown, updateCallStatus]);

  const declineIncoming = useCallback(async () => {
    const pending = callRef.current;
    closingRef.current = true;
    if (pending && !pending.isCaller) {
      await updateCallStatus({
        variables: { sessionId: pending.sessionId, status: 'DECLINED' },
      }).catch(() => {});
    }
    await teardown();
  }, [teardown, updateCallStatus]);

  const hangUp = useCallback(async () => {
    const current = callRef.current;
    closingRef.current = true;
    if (current) {
      await endCallMutation({ variables: { sessionId: current.sessionId } }).catch(() => {
        /* the session is already gone */
      });
    }
    await teardown();
  }, [endCallMutation, teardown]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const currentlyEnabled = room.localParticipant.isMicrophoneEnabled;

    try {
      await room.localParticipant.setMicrophoneEnabled(!currentlyEnabled);
      setIsMuted(currentlyEnabled);
      syncTracks();
    } catch (caught) {
      setError(readableError(caught));
    }
  }, [syncTracks]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const currentlyEnabled = room.localParticipant.isCameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(!currentlyEnabled);
      setIsCameraOn(!currentlyEnabled);
      syncTracks();
    } catch (caught) {
      setError(readableError(caught));
    }
  }, [syncTracks]);

  const dismissError = useCallback(() => setError(null), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // Clean up if the provider unmounts mid-call.
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) {
        room.removeAllListeners();
        void room.disconnect().catch(() => {});
      }
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({
      phase,
      call,
      tracks,
      isMuted,
      isCameraOn,
      durationSeconds,
      error,
      notice,
      isConfigured: isCallingConfigured,
      peerConnected,
      startCall,
      acceptIncoming,
      declineIncoming,
      hangUp,
      toggleMute,
      toggleCamera,
      dismissError,
      dismissNotice,
    }),
    [
      phase,
      call,
      tracks,
      isMuted,
      isCameraOn,
      durationSeconds,
      error,
      notice,
      peerConnected,
      startCall,
      acceptIncoming,
      declineIncoming,
      hangUp,
      toggleMute,
      toggleCamera,
      dismissError,
      dismissNotice,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used inside a CallProvider');
  }
  return context;
}
