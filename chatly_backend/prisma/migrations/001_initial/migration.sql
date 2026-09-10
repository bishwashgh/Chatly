-- Create enum MessageType
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- Create enum CallType
CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');

-- Create enum CallStatus
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACCEPTED', 'DECLINED', 'ENDED', 'MISSED');

-- Create enum FriendshipStatus
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- Create table User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "passwordHash" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshToken" TEXT,
    "signupCodeHash" TEXT,
    "signupCodeExpiresAt" TIMESTAMP(3),
    "resetCodeHash" TEXT,
    "resetCodeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create index for User email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create index for User username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Create index for User googleId
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- Create table Conversation
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- Create table ConversationParticipant
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConversationParticipant_conversationId_userId_key" UNIQUE ("conversationId", "userId")
);

-- Create table Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Create table Reaction
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Reaction_messageId_userId_emoji_key" UNIQUE ("messageId", "userId", "emoji")
);

-- Create table CustomEmoji
CREATE TABLE "CustomEmoji" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomEmoji_pkey" PRIMARY KEY ("id")
);

-- Create table Friendship
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Friendship_requesterId_addresseeId_key" UNIQUE ("requesterId", "addresseeId")
);

-- Create index for Friendship addresseeId and status
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- Create table BlockedUser
CREATE TABLE "BlockedUser" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BlockedUser_blockerId_blockedId_key" UNIQUE ("blockerId", "blockedId")
);

-- Create index for BlockedUser blockedId
CREATE INDEX "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");

-- Create table CallSession
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "roomToken" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId")
    REFERENCES "Conversation"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId")
    REFERENCES "Conversation"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Reaction"
    ADD CONSTRAINT "Reaction_messageId_fkey"
    FOREIGN KEY ("messageId")
    REFERENCES "Message"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Reaction"
    ADD CONSTRAINT "Reaction_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "CustomEmoji"
    ADD CONSTRAINT "CustomEmoji_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "Friendship"
    ADD CONSTRAINT "Friendship_requesterId_fkey"
    FOREIGN KEY ("requesterId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Friendship"
    ADD CONSTRAINT "Friendship_addresseeId_fkey"
    FOREIGN KEY ("addresseeId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "BlockedUser"
    ADD CONSTRAINT "BlockedUser_blockerId_fkey"
    FOREIGN KEY ("blockerId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "BlockedUser"
    ADD CONSTRAINT "BlockedUser_blockedId_fkey"
    FOREIGN KEY ("blockedId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "CallSession"
    ADD CONSTRAINT "CallSession_callerId_fkey"
    FOREIGN KEY ("callerId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "CallSession"
    ADD CONSTRAINT "CallSession_recipientId_fkey"
    FOREIGN KEY ("recipientId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
