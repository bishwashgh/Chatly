import { registerEnumType } from '@nestjs/graphql';

export enum CallStatus {
  RINGING = 'RINGING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
}

registerEnumType(CallStatus, { name: 'CallStatus' });
