import { API_URL } from '../config';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body === 'string') message = body;
      else if (body.message) message = body.message;
      else if (body.detail) message = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Auth
export const api = {
  // Auth
  register: (data: { username: string; email: string; password: string; display_name: string; phone?: string; avatar_url?: string; otp_code?: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendOtp: (data: { email: string; purpose: 'signup' | 'password_reset' }) =>
    request<{ message: string; expires_in?: number; dev_code?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: { email: string; code: string; new_password: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  googleSignIn: (idToken: string) =>
    request<{ token: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),

  verify: () => request<User>('/api/auth/verify'),

  // Users
  getMe: () => request<User>('/api/users/me'),
  searchUsers: (query: string) =>
    request<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`),
  getUser: (id: string) => request<User>(`/api/users/${id}`),
  updateProfile: (data: Partial<{ display_name: string; bio: string; avatar_url: string; phone: string }>) =>
    request<User>('/api/users/me/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyStats: () =>
    request<{ friends: number; conversations: number; messages: number }>('/api/users/me/stats'),

  // Friends
  getFriends: () => request<User[]>('/api/friends'),
  getFriendRequests: () => request<User[]>('/api/friends/requests'),
  getOutgoingFriendRequests: () => request<User[]>('/api/friends/outgoing'),
  getFriendStatus: (userId: string) =>
    request<{ status: string }>(`/api/friends/status/${userId}`),
  sendFriendRequest: (userId: string) =>
    request<{ status: string }>('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  acceptFriendRequest: (userId: string) =>
    request<{ status: string }>('/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  declineFriendRequest: (userId: string) =>
    request<{ status: string }>('/api/friends/decline', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  // Conversations
  getConversations: () => request<Conversation[]>('/api/conversations'),
  getConversation: (id: string) => request<Conversation>(`/api/conversations/${id}`),
  createConversation: (participantId: string, name?: string) =>
    request<Conversation>('/api/conversations/create', {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId, name }),
    }),
  getMessages: (conversationId: string, limit = 50, offset = 0) =>
    request<Message[]>(`/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`),
  sendMessage: (conversationId: string, data: SendMessageRequest) =>
    request<Message>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markConversationRead: (conversationId: string) =>
    request<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' }),

  // Reactions
  addReaction: (conversationId: string, messageId: string, emoji: string) =>
    request<{ message_id: string; emoji: string; reacted_by_me: boolean }>(
      `/api/conversations/${conversationId}/messages/${messageId}/reactions`,
      { method: 'POST', body: JSON.stringify({ emoji }) }
    ),
  removeReaction: (conversationId: string, messageId: string, emoji: string) =>
    request<{ message_id: string; emoji: string; reacted_by_me: boolean }>(
      `/api/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'DELETE' }
    ),

  // Media upload
  uploadMedia: async (uri: string, mimeType: string, fileName: string) => {
    const formData = new FormData();
    // @ts-ignore - React Native FormData
    formData.append('file', { uri, type: mimeType, name: fileName } as any);

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json() as Promise<UploadResponse>;
  },

  // Calls
  getCallHistory: () => request<CallLog[]>('/api/calls/history'),
  logCall: (data: { conversation_id: string; callee_id: string; call_type: 'audio' | 'video'; status: string; duration?: number }) =>
    request<CallLog>('/api/calls/log', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Stories
  getStories: () => request<StoryGroup[]>('/api/stories'),
  createStory: (data: { media_url: string; media_type?: string; file_name?: string; caption?: string }) =>
    request<Story>('/api/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteStory: (storyId: string) =>
    request<void>(`/api/stories/${storyId}`, { method: 'DELETE' }),
};

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string;
  is_online: boolean;
  last_seen?: string | null;
  email_verified?: boolean;
  auth_provider?: string;
}

export interface UserBrief {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  media_duration: number | null;
  file_name: string | null;
  file_size: number | null;
  reply_to: string | null;
  status: string;
  created_at: string;
  reactions?: ReactionSummary[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  created_at: string;
  participants: UserBrief[];
  last_message: Message | null;
  unread_count: number;
}

export interface SendMessageRequest {
  content?: string;
  message_type?: string;
  media_url?: string;
  media_duration?: number;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
}

export interface UploadResponse {
  url: string;
  file_name: string;
  file_size: number;
  media_type: string;
}

export interface CallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration: number;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  file_name: string | null;
  caption: string | null;
  created_at: string;
}

export interface StoryGroup {
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
  stories: Story[];
}