export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export type ChatUser = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean | null;
  isActive?: boolean | null;
  lastSeen?: string | null;
};

export type Reaction = {
  id: string;
  emoji: string;
  user: Pick<ChatUser, 'id' | 'name'>;
};

export type Message = {
  id: string;
  conversationId: string;
  content?: string | null;
  mediaUrl?: string | null;
  messageType: MessageType;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: string;
  sender: Pick<ChatUser, 'id' | 'name' | 'avatarUrl'>;
  reactions?: Reaction[];
};

export type ConversationParticipant = Pick<ChatUser, 'id' | 'name' | 'avatarUrl' | 'isOnline'>;

export type Conversation = {
  id: string;
  isGroup: boolean;
  title?: string | null;
  createdAt: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    messageType: MessageType;
    createdAt: string;
    sender: Pick<ChatUser, 'id' | 'name'>;
  } | null;
  participants: ConversationParticipant[];
};

export type FriendRequest = {
  id: string;
  user: Pick<ChatUser, 'id' | 'name' | 'username' | 'avatarUrl' | 'isOnline'>;
  createdAt: string;
};

export type FriendsState = {
  friends: ChatUser[];
  friendRequests: FriendRequest[];
  sentFriendRequests: FriendRequest[];
  blockedUsers: ChatUser[];
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: ChatUser;
};

export type VerificationChallenge = {
  challengeId: string;
  destination: string;
  expiresInSeconds: number;
};

export type TypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

export type CallType = 'AUDIO' | 'VIDEO';

export type CallStatus = 'RINGING' | 'ACCEPTED' | 'DECLINED' | 'ENDED' | 'MISSED';

/** Returned by `startCall`; `roomToken` belongs to the caller. */
export type CallSession = {
  id: string;
  roomToken: string;
  channelName: string;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  recipient: Pick<ChatUser, 'id' | 'name' | 'avatarUrl'>;
};

/** Payload pushed to the recipient over `incomingCallSignal`. */
export type CallOffer = {
  sessionId: string;
  roomToken: string;
  channelName: string;
  callType: CallType;
  caller: Pick<ChatUser, 'id' | 'name' | 'avatarUrl'>;
};

export type CallLogEntry = {
  id: string;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  endedAt?: string | null;
  peer: Pick<ChatUser, 'id' | 'name' | 'avatarUrl' | 'isOnline'>;
};

/** Normalized call state used by the call context and overlay. */
export type ActiveCall = {
  sessionId: string;
  channelName: string;
  callType: CallType;
  peer: { id: string; name: string; avatarUrl?: string | null };
  roomToken: string;
  isCaller: boolean;
};

export type MessageStatusEvent = {
  messageId: string;
  conversationId: string;
  isDelivered: boolean;
  isRead: boolean;
};
