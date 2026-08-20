import { create } from 'zustand';
import { api, Conversation, Message, ReactionSummary, UserBrief } from '../services/api';
import { useAuthStore } from './authStore';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  typing: Record<string, Record<string, boolean>>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendTextMessage: (conversationId: string, content: string) => Promise<Message | null>;
  sendMediaMessage: (
    conversationId: string,
    data: { media_url: string; message_type: string; file_name?: string; file_size?: number; media_duration?: number }
  ) => Promise<Message | null>;
  optimisticAdd: (conversationId: string, message: Message) => void;
  onNewMessage: (data: any) => void;
  onMessageStatus: (data: any) => void;
  onPresence: (data: any) => void;
  onTyping: (data: any) => void;
  onReaction: (data: any) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  markRead: (conversationId: string) => void;
  clearMessages: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  typing: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const conversations = await api.getConversations();
      set({ conversations, isLoadingConversations: false });
    } catch (e) {
      console.error('loadConversations error', e);
      set({ isLoadingConversations: false });
    }
  },

  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await api.getMessages(conversationId);
      // Messages come newest-first; reverse to oldest-first
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages.reverse() },
        isLoadingMessages: false,
      }));
      // Mark as read
      api.markConversationRead(conversationId).catch(() => {});
    } catch (e) {
      console.error('loadMessages error', e);
      set({ isLoadingMessages: false });
    }
  },

  sendTextMessage: async (conversationId, content) => {
    try {
      const message = await api.sendMessage(conversationId, { content, message_type: 'text' });
      get().optimisticAdd(conversationId, message);
      return message;
    } catch (e) {
      console.error('sendTextMessage error', e);
      return null;
    }
  },

  sendMediaMessage: async (conversationId, data) => {
    try {
      const message = await api.sendMessage(conversationId, {
        message_type: data.message_type,
        media_url: data.media_url,
        file_name: data.file_name,
        file_size: data.file_size,
        media_duration: data.media_duration,
      });
      get().optimisticAdd(conversationId, message);
      return message;
    } catch (e) {
      console.error('sendMediaMessage error', e);
      return null;
    }
  },

  optimisticAdd: (conversationId, message) => {
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // Avoid duplicate
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: { ...state.messages, [conversationId]: [...existing, message] },
      };
    });
  },

  onNewMessage: (data) => {
    const message: Message = data.message;
    if (!message) return;

    const conversationId = data.conversation_id || message.conversation_id;

    // Append to messages
    get().optimisticAdd(conversationId, message);

    // Update conversation list
    set((state) => {
      const conversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return { ...c, last_message: message, updated_at: message.created_at };
        }
        return c;
      });
      return { conversations };
    });
  },

  onMessageStatus: (data) => {
    const { message_id, status } = data;
    set((state) => {
      const messages = { ...state.messages };
      Object.keys(messages).forEach((convId) => {
        messages[convId] = messages[convId].map((m) =>
          m.id === message_id ? { ...m, status } : m
        );
      });
      return { messages };
    });
  },

  onPresence: (data) => {
    const { user_id, online } = data;
    set((state) => {
      const conversations = state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.id === user_id ? { ...p, is_online: online } : p
        ),
      }));
      return { conversations };
    });
  },

  onTyping: (data) => {
    const { conversation_id, user_id, is_typing } = data;
    set((state) => {
      const convTyping = state.typing[conversation_id] || {};
      return {
        typing: {
          ...state.typing,
          [conversation_id]: { ...convTyping, [user_id]: is_typing },
        },
      };
    });
  },

  markRead: (conversationId) => {
    api.markConversationRead(conversationId).catch(() => {});
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },

  onReaction: (data) => {
    const { conversation_id, message_id, emoji, added, user_id } = data;
    const currentUserId = useAuthStore.getState().user?.id;
    set((state) => {
      const list = state.messages[conversation_id];
      if (!list) return {};
      const updated = list.map((m) => {
        if (m.id !== message_id) return m;
        const reactions = (m.reactions || []).map((r) => ({ ...r }));
        const existing = reactions.find((r) => r.emoji === emoji);
        if (added) {
          if (existing) {
            existing.count += 1;
            if (user_id === currentUserId) existing.reacted_by_me = true;
          } else {
            reactions.push({
              emoji,
              count: 1,
              reacted_by_me: user_id === currentUserId,
            });
          }
        } else {
          if (existing) {
            existing.count -= 1;
            if (user_id === currentUserId) existing.reacted_by_me = false;
            if (existing.count <= 0) {
              return { ...m, reactions: reactions.filter((r) => r.emoji !== emoji) };
            }
          }
        }
        return { ...m, reactions };
      });
      return { messages: { ...state.messages, [conversation_id]: updated } };
    });
  },

  toggleReaction: async (conversationId, messageId, emoji) => {
    const currentUserId = useAuthStore.getState().user?.id;
    const list = get().messages[conversationId];
    const msg = list?.find((m) => m.id === messageId);
    const existing = msg?.reactions?.find((r) => r.emoji === emoji);
    const wasReacted = existing?.reacted_by_me ?? false;

    set((state) => {
      const updated = (state.messages[conversationId] || []).map((m) => {
        if (m.id !== messageId) return m;
        const reactions = (m.reactions || []).map((r) => ({ ...r }));
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (wasReacted) {
          if (idx >= 0) {
            reactions[idx].count -= 1;
            reactions[idx].reacted_by_me = false;
            if (reactions[idx].count <= 0) {
              reactions.splice(idx, 1);
            }
          }
        } else {
          if (idx >= 0) {
            reactions[idx].count += 1;
            reactions[idx].reacted_by_me = true;
          } else {
            reactions.push({ emoji, count: 1, reacted_by_me: true });
          }
        }
        return { ...m, reactions };
      });
      return { messages: { ...state.messages, [conversationId]: updated } };
    });

    try {
      if (wasReacted) {
        await api.removeReaction(conversationId, messageId, emoji);
      } else {
        await api.addReaction(conversationId, messageId, emoji);
      }
    } catch {
      const refresh = await api.getMessages(conversationId, 0);
      set((state) => ({ messages: { ...state.messages, [conversationId]: refresh } }));
    }
  },

  clearMessages: (conversationId) => {
    set((state) => {
      const messages = { ...state.messages };
      delete messages[conversationId];
      return { messages };
    });
  },
}));