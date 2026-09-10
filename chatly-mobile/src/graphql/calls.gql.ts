import { gql } from '@apollo/client';

export const START_CALL = gql`
  mutation StartCall($recipientId: ID!, $callType: CallType!) {
    startCall(recipientId: $recipientId, callType: $callType) {
      id
      roomToken
      channelName
      callType
      status
      recipient { id name avatarUrl }
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
      caller { id name avatarUrl }
    }
  }
`;
