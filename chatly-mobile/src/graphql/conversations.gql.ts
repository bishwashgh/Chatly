import { gql } from '@apollo/client';

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      id
      isGroup
      title
      createdAt
      unreadCount
      lastMessage {
        id
        content
        mediaUrl
        messageType
        createdAt
        sender { id name }
      }
      participants {
        id
        name
        avatarUrl
        isOnline
      }
    }
  }
`;

export const CONVERSATION_UPDATED_SUBSCRIPTION = gql`
  subscription ConversationUpdated($userId: ID!) {
    conversationUpdated(userId: $userId) {
      conversationId
      lastMessage {
        id
        content
        mediaUrl
        messageType
        createdAt
        sender { id name }
      }
    }
  }
`;

export const CREATE_DIRECT_CONVERSATION = gql`
  mutation CreateDirectConversation($recipientId: ID!) {
    createDirectConversation(recipientId: $recipientId) {
      id
      isGroup
      title
      createdAt
      participants {
        id
        name
        avatarUrl
      }
    }
  }
`;