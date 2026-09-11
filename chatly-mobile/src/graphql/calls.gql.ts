import { gql } from '@apollo/client';

export const START_CALL = gql`
  mutation StartCall($recipientId: ID!, $callType: CallType!) {
    startCall(recipientId: $recipientId, callType: $callType) {
      id roomToken channelName callType status recipient { id name avatarUrl }
    }
  }
`;

export const UPDATE_CALL_STATUS = gql`
  mutation UpdateCallStatus($sessionId: ID!, $status: CallStatus!) {
    updateCallStatus(sessionId: $sessionId, status: $status) { id status }
  }
`;

export const END_CALL = gql`
  mutation EndCall($sessionId: ID!) {
    endCall(sessionId: $sessionId) { id status }
  }
`;

export const INCOMING_CALL_SUBSCRIPTION = gql`
  subscription IncomingCallSignal($userId: ID!) {
    incomingCallSignal(userId: $userId) {
      sessionId roomToken channelName callType caller { id name avatarUrl }
    }
  }
`;

export const CALL_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription CallStatusUpdated($sessionId: ID!) {
    callStatusUpdated(sessionId: $sessionId) {
      id
      status
      channelName
      callType
    }
  }
`;

export const CALL_LOG_QUERY = gql`
  query CallLog {
    callLog { id callType status startedAt endedAt peer { id name avatarUrl isOnline } }
  }
`;
