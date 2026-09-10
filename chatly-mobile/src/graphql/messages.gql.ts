import { gql } from '@apollo/client';

export const MESSAGES_QUERY = gql`
  query Messages($conversationId: ID!) {
    messages(conversationId: $conversationId) {
      id
      conversationId
      content
      mediaUrl
      messageType
      isRead
      isDelivered
      createdAt
      sender { id name avatarUrl }
      reactions { id emoji user { id name } }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      conversationId
      content
      mediaUrl
      messageType
      isRead
      isDelivered
      createdAt
      sender { id name avatarUrl }
    }
  }
`;

export const TOGGLE_REACTION = gql`
  mutation ToggleReaction($messageId: ID!, $emojiId: String!) {
    toggleReaction(messageId: $messageId, emojiId: $emojiId) {
      id
      reactions { id emoji user { id name } }
    }
  }
`;

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: ID!) {
    deleteMessage(messageId: $messageId)
  }
`;

export const TYPING = gql`
  mutation Typing($conversationId: ID!, $isTyping: Boolean!) {
    typing(conversationId: $conversationId, isTyping: $isTyping)
  }
`;

export const MARK_AS_READ = gql`
  mutation MarkAsRead($conversationId: ID!, $messageId: ID!) {
    markAsRead(conversationId: $conversationId, messageId: $messageId) {
      id
      isRead
      isDelivered
    }
  }
`;

export const UPLOAD_MESSAGE_MEDIA = gql`
  mutation UploadMessageMedia($file: Upload!) {
    uploadMessageMedia(file: $file)
  }
`;

export const CUSTOM_EMOJIS_QUERY = gql`
  query CustomEmojis($category: String) {
    customEmojis(category: $category) {
      id
      name
      imageUrl
      category
    }
  }
`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      id
      conversationId
      content
      mediaUrl
      messageType
      isRead
      isDelivered
      createdAt
      sender { id name avatarUrl }
    }
  }
`;

export const MESSAGE_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription MessageStatusUpdated($conversationId: ID!) {
    messageStatusUpdated(conversationId: $conversationId) {
      messageId
      conversationId
      isDelivered
      isRead
    }
  }
`;

export const MESSAGE_REACTION_UPDATED_SUBSCRIPTION = gql`
  subscription MessageReactionUpdated($conversationId: ID!) {
    messageReactionUpdated(conversationId: $conversationId) {
      id
      reactions { id emoji user { id name } }
    }
  }
`;

export const USER_TYPING_STATUS_SUBSCRIPTION = gql`
  subscription UserTypingStatus($conversationId: ID!) {
    userTypingStatus(conversationId: $conversationId) {
      conversationId
      userId
      isTyping
    }
  }
`;
