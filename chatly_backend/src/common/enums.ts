import { registerEnumType } from '@nestjs/graphql';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
}

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  RINGING = 'RINGING',
  ONGOING = 'ONGOING',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
  DECLINED = 'DECLINED',
}

registerEnumType(MessageType, { name: 'MessageType' });
registerEnumType(CallType, { name: 'CallType' });
registerEnumType(CallStatus, { name: 'CallStatus' });
