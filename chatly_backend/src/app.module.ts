import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import * as jwt from 'jsonwebtoken';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendshipsModule } from './friendships/friendships.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ReactionsModule } from './reactions/reactions.module';
import { EmojisModule } from './emojis/emojis.module';
import { CallsModule } from './calls/calls.module';
import { MediaModule } from './media/media.module';

async function setPresence(prisma: PrismaService, token: string | undefined, isOnline: boolean) {
  if (!token) return;
  try {
    const raw = token.replace('Bearer ', '');
    const payload = jwt.verify(raw, process.env.JWT_ACCESS_SECRET as string) as { sub: string };
    await prisma.user.update({ where: { id: payload.sub }, data: { isOnline, lastSeen: new Date() } });
  } catch {
    // invalid/expired token, ignore presence update
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        subscriptions: {
          'graphql-ws': {
            onConnect: async (context: any) => {
              const { connectionParams } = context;
              const authorization = connectionParams?.authorization;
              await setPresence(prisma, authorization, true);
              return { headers: { authorization } };
            },
            onDisconnect: async (context: any) => {
              const authorization = context?.connectionParams?.authorization;
              await setPresence(prisma, authorization, false);
            },
          },
        },
        context: ({ req }: any) => ({ req }),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FriendshipsModule,
    ConversationsModule,
    MessagesModule,
    ReactionsModule,
    EmojisModule,
    CallsModule,
    MediaModule,
  ],
})
export class AppModule {}
