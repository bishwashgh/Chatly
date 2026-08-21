import { WS_URL } from '../config';
import { getAuthToken } from './api';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';

type WsEventHandler = (data: any) => void;

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private handlers: Map<string, Set<WsEventHandler>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  getState(): ConnectionState {
    return this.connectionState;
  }

  onStateChange(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach(l => l(state));
  }

  connect() {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token for WebSocket');
      return;
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.disconnect();
    this.open(token);
  }

  private open(token: string) {
    this.setState('connecting');
    try {
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.routeMessage(data);
        } catch (e) {
          console.warn('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        this.stopHeartbeat();
        this.setState('disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (e) => {
        console.warn('WebSocket error', e);
      };
    } catch (e) {
      console.error('WebSocket open error', e);
      this.setState('disconnected');
      if (this.shouldReconnect) this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      const token = getAuthToken();
      if (token && this.shouldReconnect) {
        this.open(token);
      }
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private routeMessage(data: any) {
    const type = data.type;
    if (!type) return;

    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try { handler(data); } catch (e) { console.error('Handler error:', e); }
      });
    }

    switch (type) {
      case 'new_message':
        useChatStore.getState().onNewMessage(data);
        break;
      case 'message_status':
        useChatStore.getState().onMessageStatus(data);
        break;
      case 'presence':
        useChatStore.getState().onPresence(data);
        break;
      case 'typing':
        useChatStore.getState().onTyping(data);
        break;
      case 'message_reaction':
        useChatStore.getState().onReaction(data);
        break;
      case 'call_offer':
      case 'call_answer':
      case 'ice_candidate':
      case 'call_reject':
      case 'call_end':
      case 'call_ring':
        useCallStore.getState().onSignal(data);
        break;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  on(type: string, handler: WsEventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    this.send({ type: 'typing', conversation_id: conversationId, is_typing: isTyping });
  }

  sendMessageRead(conversationId: string, messageId: string) {
    this.send({ type: 'message_read', conversation_id: conversationId, message_id: messageId });
  }

  sendCallOffer(targetId: string, callType: 'audio' | 'video', sdp: string) {
    this.send({ type: 'call_offer', target_id: targetId, call_type: callType, sdp });
  }

  sendCallAnswer(targetId: string, sdp: string) {
    this.send({ type: 'call_answer', target_id: targetId, sdp });
  }

  sendIceCandidate(targetId: string, candidate: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null }) {
    this.send({
      type: 'ice_candidate',
      target_id: targetId,
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      },
    });
  }

  sendCallReject(targetId: string) {
    this.send({ type: 'call_reject', target_id: targetId });
  }

  sendCallEnd(targetId: string) {
    this.send({ type: 'call_end', target_id: targetId });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }
}

export const wsService = new WebSocketService();