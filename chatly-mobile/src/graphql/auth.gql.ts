import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      name
      bio
      avatarUrl
      isOnline
      isActive
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      user {
        id
        email
        username
        name
        avatarUrl
        isOnline
      }
    }
  }
`;

export const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      accessToken
      refreshToken
      user {
        id
        email
        username
        name
        avatarUrl
        isOnline
      }
    }
  }
`;
