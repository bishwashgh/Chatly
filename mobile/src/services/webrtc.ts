import type {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { ICE_SERVERS } from '../config';
import { wsService } from './websocket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { api } from './api';

type WebRTCEvents = {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionState: (state: string) => void;
};

// react-native-webrtc is a native module that is NOT bundled into Expo Go.
// Load it lazily so the rest of the app works in Expo Go; calls are only
// available in a development build.
let _webrtc: any = null;
let _webrtcChecked = false;

function getWebRTC(): any {
  if (!_webrtcChecked) {
    _webrtcChecked = true;
    try {
      _webrtc = require('react-native-webrtc');
    } catch (e) {
      console.warn('WebRTC unavailable in this runtime (Expo Go). Calls disabled.', e);
      _webrtc = null;
    }
  }
  return _webrtc;
}

export function isWebRTCAvailable(): boolean {
  return !!getWebRTC();
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteUserId: string | null = null;
  private callType: 'audio' | 'video' | null = null;
  private events: WebRTCEvents = {
    onLocalStream: () => {},
    onRemoteStream: () => {},
    onConnectionState: () => {},
  };

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  setEvents(events: Partial<WebRTCEvents>) {
    this.events = { ...this.events, ...events };
  }

  getRemoteUserId() {
    return this.remoteUserId;
  }

  private get userId(): string | null {
    return useAuthStore.getState().user?.id || null;
  }

  private async createPeerConnection(callType: 'audio' | 'video', remoteUserId: string) {
    const w = getWebRTC();
    this.remoteUserId = remoteUserId;
    this.callType = callType;

    this.peerConnection = new w.RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.peerConnection!.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
      if (event.candidate) {
        wsService.sendIceCandidate(remoteUserId, event.candidate);
      }
    };

    this.peerConnection!.ontrack = (event: { streams: MediaStream[]; track: MediaStreamTrack }) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.events.onRemoteStream(event.streams[0]);
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new w.MediaStream();
        }
        this.remoteStream!.addTrack(event.track);
        this.events.onRemoteStream(this.remoteStream!);
      }
    };

    this.peerConnection!.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || '';
      this.events.onConnectionState(state);
      if (state === 'failed' || state === 'closed') {
        this.cleanup();
      }
    };

    // Get local media stream
    this.localStream = await w.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });

    this.localStream!.getTracks().forEach((track: MediaStreamTrack) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.events.onLocalStream(this.localStream!);
  }

  // Caller side
  async startCall(targetUserId: string, callType: 'audio' | 'video') {
    const w = getWebRTC();
    if (!w) throw new Error('Calls are not available in Expo Go. Build the app to enable video/audio calls.');
    const userId = this.userId;
    if (!userId) throw new Error('Not authenticated');

    await this.createPeerConnection(callType, targetUserId);

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    wsService.sendCallOffer(targetUserId, callType, JSON.stringify(offer));
  }

  // Callee side
  async answerCall(offerSdp: string, fromUserId: string, callType: 'audio' | 'video') {
    const w = getWebRTC();
    if (!w) throw new Error('Calls are not available in Expo Go. Build the app to enable video/audio calls.');
    await this.createPeerConnection(callType, fromUserId);

    const offer = new w.RTCSessionDescription(JSON.parse(offerSdp));
    await this.peerConnection!.setRemoteDescription(offer);

    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    wsService.sendCallAnswer(fromUserId, JSON.stringify(answer));
  }

  async handleAnswer(answerSdp: string) {
    const w = getWebRTC();
    if (!this.peerConnection || !w) return;
    const answer = new w.RTCSessionDescription(JSON.parse(answerSdp));
    await this.peerConnection.setRemoteDescription(answer);
    this.events.onConnectionState('connected');
  }

  async handleIceCandidate(candidate: any) {
    const w = getWebRTC();
    if (!this.peerConnection || !w) return;
    try {
      const iceCandidate = new w.RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
    } catch (e) {
      console.warn('addIceCandidate error', e);
    }
  }

  async toggleMute() {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }

  async toggleCamera() {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }

  async switchCamera() {
    if (this.localStream && this.localStream.getVideoTracks().length > 0) {
      const track = this.localStream.getVideoTracks()[0] as any;
      if (track._switchCamera) {
        track._switchCamera();
      }
    }
  }

  rejectCall(targetUserId: string | null = this.remoteUserId) {
    if (targetUserId) {
      wsService.sendCallReject(targetUserId);
    }
    this.cleanup();
  }

  async endCall() {
    const remoteUserId = this.remoteUserId;
    const callType = this.callType;
    if (remoteUserId) {
      wsService.sendCallEnd(remoteUserId);
    }
    // Log the call to backend
    const userId = this.userId;
    if (userId && remoteUserId) {
      const startedAt = useCallStoreStartedAt();
      const duration = Math.floor((Date.now() - startedAt) / 1000);
      const conv = findConversationWithUser(remoteUserId);
      if (conv) {
        api.logCall({
          conversation_id: conv,
          callee_id: remoteUserId,
          call_type: callType || 'audio',
          status: 'ended',
          duration: Math.max(0, duration),
        }).catch(() => {});
      }
    }
    this.cleanup();
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteUserId = null;
    this.callType = null;
  }
}

function findConversationWithUser(userId: string): string | null {
  const conv = useChatStore.getState().conversations.find(
    (c) => !c.is_group && c.participants.some((p) => p.id === userId)
  );
  return conv ? conv.id : null;
}

function useCallStoreStartedAt(): number {
  // Avoid circular import: read via a lazily-required module
  const { useCallStore } = require('../store/callStore') as typeof import('../store/callStore');
  return useCallStore.getState().startedAt || 0;
}

export const webRTCService = new WebRTCService();