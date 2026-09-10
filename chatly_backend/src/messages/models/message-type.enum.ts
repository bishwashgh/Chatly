import { registerEnumType } from '@nestjs/graphql';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
}

registerEnumType(MessageType, { name: 'MessageType' });
