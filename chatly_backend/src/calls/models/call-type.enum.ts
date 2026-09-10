import { registerEnumType } from '@nestjs/graphql';

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

registerEnumType(CallType, { name: 'CallType' });
