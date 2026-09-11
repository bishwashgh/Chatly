import type { Conversation, ConversationParticipant } from './types';

/**
 * The other participant in a direct conversation. Returns null for groups or
 * when the conversation only contains the current user.
 */
export function conversationPeer(
  conversation: Conversation,
  currentUserId: string,
): ConversationParticipant | null {
  if (conversation.isGroup) return null;
  return conversation.participants.find((participant) => participant.id !== currentUserId) ?? null;
}

export function conversationTitle(conversation: Conversation, currentUserId: string): string {
  if (conversation.isGroup) {
    return conversation.title?.trim() || 'Group chat';
  }

  const peer = conversationPeer(conversation, currentUserId);
  if (peer?.name) return peer.name;

  if (conversation.participants.length > 0) {
    return conversation.participants.map((participant) => participant.name).join(', ');
  }

  return 'Conversation';
}

/** Sort conversations by most recent activity, falling back to creation time. */
export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((first, second) => {
    const firstAt = first.lastMessage?.createdAt ?? first.createdAt;
    const secondAt = second.lastMessage?.createdAt ?? second.createdAt;
    return new Date(secondAt).getTime() - new Date(firstAt).getTime();
  });
}
