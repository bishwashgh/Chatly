import { create } from 'zustand';
import type { MediaStream } from 'react-native-webrtc';
import { webRTCService } from '../services/webrtc';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'rejected';

interface CallState {
  status: CallStatus;
  callType: 'audio' | 'video' | null;
  remoteUserId: string | null;
  isInitiator: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  startedAt: number;
  pendingOffer: string | null;
  setCallState: (partial: Partial<CallState>) => void;
  setStatus: (status: CallStatus) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  startCall: (targetUserId: string, callType: 'audio' | 'video') => Promise<void>;
  answerCall: (offerSdp: string, fromUserId: string, callType: 'audio' | 'video') => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectCall: (targetUserId?: string) => void;
  endCall: () => void;
  onSignal: (data: any) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  callType: null,
  remoteUserId: null,
  isInitiator: false,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  startedAt: 0,

  setCallState: (partial) => set(partial),
  setStatus: (status) => set({ status }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),

  toggleMute: () => {
    webRTCService.toggleMute();
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleCamera: () => {
    webRTCService.toggleCamera();
    set((state) => ({ isCameraOff: !state.isCameraOff }));
  },

  startCall: async (targetUserId, callType) => {
    set({ startedAt: Date.now(), remoteUserId: targetUserId, callType, isInitiator: true, status: 'calling' });
    await webRTCService.startCall(targetUserId, callType);
  },

  answerCall: async (offerSdp, fromUserId, callType) => {
    set({ startedAt: Date.now(), remoteUserId: fromUserId, callType, isInitiator: false, status: 'connecting' });
    await webRTCService.answerCall(offerSdp, fromUserId, callType);
  },

  acceptIncomingCall: async () => {
    const { pendingOffer, remoteUserId, callType } = get();
    if (pendingOffer && remoteUserId && callType) {
      await get().answerCall(pendingOffer, remoteUserId, callType);
    }
  },

  rejectCall: (targetUserId) => {
    webRTCService.rejectCall(targetUserId);
  },

  endCall: () => {
    webRTCService.endCall();
  },

  onSignal: async (data) => {
    const userId = data.from_id;

    switch (data.type) {
      case 'call_offer': {
        // Someone is calling us
        const offerSdp = data.sdp;
        const callType = data.call_type || 'audio';
        set({
          status: 'ringing',
          callType,
          remoteUserId: userId,
          isInitiator: false,
          startedAt: Date.now(),
        });
        // Auto-answer is handled by the IncomingCallOverlay accept flow
        // Stash the pending offer for when the user accepts
        get().pendingOffer = offerSdp;
        break;
      }
      case 'call_answer': {
        set({ status: 'connecting' });
        await webRTCService.handleAnswer(data.sdp);
        break;
      }
      case 'ice_candidate': {
        await webRTCService.handleIceCandidate(data.candidate);
        break;
      }
      case 'call_reject': {
        set({ status: 'rejected' });
        setTimeout(() => {
          get().resetCall();
          webRTCService.cleanup();
        }, 1500);
        break;
      }
      case 'call_end': {
        set({ status: 'ended' });
        setTimeout(() => {
          get().resetCall();
          webRTCService.cleanup();
        }, 1500);
        break;
      }
      case 'call_ring': {
        break;
      }
    }
  },

  pendingOffer: null as string | null,

  resetCall: () =>
    set({
      status: 'idle',
      callType: null,
      remoteUserId: null,
      isInitiator: false,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      startedAt: 0,
      pendingOffer: null,
    }),
}));

// Register WebRTC event handlers to sync streams into the store
webRTCService.setEvents({
  onLocalStream: (stream) => useCallStore.getState().setLocalStream(stream),
  onRemoteStream: (stream) => {
    useCallStore.setState({ remoteStream: stream });
    if (useCallStore.getState().status === 'connecting') {
      useCallStore.setState({ status: 'connected' });
    }
  },
  onConnectionState: (state) => {
    if (state === 'connected') {
      useCallStore.setState({ status: 'connected' });
    }
  },
});