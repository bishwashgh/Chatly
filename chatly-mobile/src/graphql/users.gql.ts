import { gql } from '@apollo/client';

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      username
      avatarUrl
      isOnline
      isActive
    }
  }
`;

// People to connect with: active accounts you are not already friends with and
// have not blocked. Backed by UsersService.suggested.
export const SUGGESTED_USERS_QUERY = gql`
  query SuggestedUsers($limit: Int) {
    suggestedUsers(limit: $limit) {
      id
      name
      username
      avatarUrl
      isOnline
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      bio
      avatarUrl
      friendGated
    }
  }
`;

export const DEACTIVATE_ACCOUNT = gql`
  mutation DeactivateAccount {
    deactivateAccount
  }
`;

export const USER_QUERY = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      username
      bio
      avatarUrl
      isOnline
      isActive
      lastSeen
      friendGated
    }
  }
`;
