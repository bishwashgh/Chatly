import { gql } from '@apollo/client';

const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    username
    name
    bio
    avatarUrl
    isOnline
    isActive
    lastSeen
  }
`;

export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    conversationId
    content
    mediaUrl
    messageType
    isRead
    isDelivered
    createdAt
    sender {
      id
      name
      avatarUrl
    }
    reactions {
      id
      emoji
      user {
        id
        name
      }
    }
  }
`;

export const PUBLIC_USER_FIELDS = gql`
  fragment PublicUserFields on User {
    id
    name
    username
    avatarUrl
    isOnline
  }
`;

/* ------------------------------------------------------------------ auth */

export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      challengeId
      destination
      expiresInSeconds
    }
  }
`;

export const RESEND_SIGNUP_CODE = gql`
  mutation ResendSignupCode($challengeId: String!) {
    resendSignupCode(challengeId: $challengeId) {
      challengeId
      destination
      expiresInSeconds
    }
  }
`;

export const VERIFY_SIGNUP = gql`
  mutation VerifySignup($input: VerifyCodeInput!) {
    verifySignup(input: $input) {
      accessToken
      refreshToken
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($input: RequestResetInput!) {
    requestPasswordReset(input: $input) {
      challengeId
      destination
      expiresInSeconds
    }
  }
`;

export const RESEND_PASSWORD_RESET_CODE = gql`
  mutation ResendPasswordResetCode($email: String!, $challengeId: String!) {
    resendPasswordResetCode(email: $email, challengeId: $challengeId) {
      challengeId
      destination
      expiresInSeconds
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: CompleteResetInput!) {
    resetPassword(input: $input) {
      id
    }
  }
`;

/* ----------------------------------------------------------------- users */

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      ...PublicUserFields
    }
  }
  ${PUBLIC_USER_FIELDS}
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      bio
      avatarUrl
    }
  }
`;

export const DEACTIVATE_ACCOUNT = gql`
  mutation DeactivateAccount {
    deactivateAccount
  }
`;

/* ------------------------------------------------------------ friendships */

export const FRIENDS_STATE_QUERY = gql`
  query FriendsState {
    friends {
      ...PublicUserFields
      bio
    }
    friendRequests {
      id
      user {
        ...PublicUserFields
      }
      createdAt
    }
    sentFriendRequests {
      id
      user {
        ...PublicUserFields
      }
      createdAt
    }
    blockedUsers {
      ...PublicUserFields
    }
  }
  ${PUBLIC_USER_FIELDS}
`;

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($userId: ID!) {
    sendFriendRequest(userId: $userId) {
      id
      status
    }
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($userId: ID!) {
    acceptFriendRequest(userId: $userId) {
      id
      status
    }
  }
`;

export const DECLINE_FRIEND_REQUEST = gql`
  mutation DeclineFriendRequest($userId: ID!) {
    declineFriendRequest(userId: $userId)
  }
`;

export const CANCEL_FRIEND_REQUEST = gql`
  mutation CancelFriendRequest($userId: ID!) {
    cancelFriendRequest(userId: $userId)
  }
`;

export const REMOVE_FRIEND = gql`
  mutation RemoveFriend($userId: ID!) {
    removeFriend(userId: $userId)
  }
`;

export const BLOCK_USER = gql`
  mutation BlockUser($userId: ID!) {
    blockUser(userId: $userId)
  }
`;

export const UNBLOCK_USER = gql`
  mutation UnblockUser($userId: ID!) {
    unblockUser(userId: $userId)
  }
`;

/* ---------------------------------------------------------- conversations */

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
        sender {
          id
          name
        }
      }
      participants {
        ...PublicUserFields
      }
    }
  }
  ${PUBLIC_USER_FIELDS}
`;

export const CREATE_DIRECT_CONVERSATION = gql`
  mutation CreateDirectConversation($recipientId: ID!) {
    createDirectConversation(recipientId: $recipientId) {
      id
      isGroup
      title
      createdAt
      unreadCount
      participants {
        ...PublicUserFields
      }
    }
  }
  ${PUBLIC_USER_FIELDS}
`;

/* --------------------------------------------------------------- messages */

export const MESSAGES_QUERY = gql`
  query Messages($conversationId: ID!) {
    messages(conversationId: $conversationId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      ...MessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const UPLOAD_MESSAGE_MEDIA = gql`
  mutation UploadMessageMedia($file: Upload!) {
    uploadMessageMedia(file: $file)
  }
`;

export const TOGGLE_REACTION = gql`
  mutation ToggleReaction($messageId: ID!, $emojiId: String!) {
    toggleReaction(messageId: $messageId, emojiId: $emojiId) {
      id
      reactions {
        id
        emoji
        user {
          id
          name
        }
      }
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

/* ---------------------------------------------------------- subscriptions */

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const MESSAGE_REACTION_UPDATED_SUBSCRIPTION = gql`
  subscription MessageReactionUpdated($conversationId: ID!) {
    messageReactionUpdated(conversationId: $conversationId) {
      id
      reactions {
        id
        emoji
        user {
          id
          name
        }
      }
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

export const USER_TYPING_STATUS_SUBSCRIPTION = gql`
  subscription UserTypingStatus($conversationId: ID!) {
    userTypingStatus(conversationId: $conversationId) {
      conversationId
      userId
      isTyping
    }
  }
`;

/* ------------------------------------------------------------------ calls */

export const START_CALL = gql`
  mutation StartCall($recipientId: ID!, $callType: CallType!) {
    startCall(recipientId: $recipientId, callType: $callType) {
      id
      roomToken
      channelName
      callType
      status
      startedAt
      recipient {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const UPDATE_CALL_STATUS = gql`
  mutation UpdateCallStatus($sessionId: ID!, $status: CallStatus!) {
    updateCallStatus(sessionId: $sessionId, status: $status) {
      id
      status
    }
  }
`;

export const END_CALL = gql`
  mutation EndCall($sessionId: ID!) {
    endCall(sessionId: $sessionId) {
      id
      status
    }
  }
`;

export const INCOMING_CALL_SUBSCRIPTION = gql`
  subscription IncomingCallSignal($userId: ID!) {
    incomingCallSignal(userId: $userId) {
      sessionId
      roomToken
      channelName
      callType
      caller {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const CALL_LOG_QUERY = gql`
  query CallLog {
    callLog {
      id
      callType
      status
      startedAt
      endedAt
      peer {
        id
        name
        avatarUrl
        isOnline
      }
    }
  }
`;

/* --------------------------------------------------------------- emojis */

export const CREATE_GROUP_CONVERSATION = gql`
  mutation CreateGroupConversation($title: String!, $memberIds: [ID!]!) {
    createGroupConversation(title: $title, memberIds: $memberIds) {
      id
      isGroup
      title
      createdAt
      unreadCount
      participants {
        ...PublicUserFields
      }
    }
  }
  ${PUBLIC_USER_FIELDS}
`;
