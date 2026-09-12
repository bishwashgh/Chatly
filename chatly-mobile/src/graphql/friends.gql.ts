import { gql } from '@apollo/client';

export const FRIENDS_STATE_QUERY = gql`
  query FriendsState {
    friends {
      id
      name
      username
      avatarUrl
      isOnline
      bio
    }
    friendRequests {
      id
      user {
        id
        name
        username
        avatarUrl
        isOnline
      }
      createdAt
    }
    sentFriendRequests {
      id
      user {
        id
        name
        username
        avatarUrl
        isOnline
      }
      createdAt
    }
    blockedUsers {
      id
      name
      username
      avatarUrl
      isOnline
    }
  }
`;

// Focused query for the Blocked Contacts screen; FRIENDS_STATE_QUERY bundles
// this with friends and requests, which that screen does not need.
export const BLOCKED_USERS_QUERY = gql`
  query BlockedUsers {
    blockedUsers {
      id
      name
      username
      avatarUrl
      isOnline
    }
  }
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