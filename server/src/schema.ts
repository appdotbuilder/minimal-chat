
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Chat schema
export const chatSchema = z.object({
  id: z.number(),
  name: z.string().nullable(), // null for one-on-one chats
  is_group: z.boolean(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Chat = z.infer<typeof chatSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  message_type: z.enum(['text', 'image', 'file']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Chat participant schema
export const chatParticipantSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  user_id: z.number(),
  joined_at: z.coerce.date(),
  last_read_at: z.coerce.date().nullable()
});

export type ChatParticipant = z.infer<typeof chatParticipantSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  avatar_url: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createChatInputSchema = z.object({
  name: z.string().min(1).max(100).nullable(),
  is_group: z.boolean(),
  avatar_url: z.string().nullable(),
  participant_ids: z.array(z.number()).min(1)
});

export type CreateChatInput = z.infer<typeof createChatInputSchema>;

export const sendMessageInputSchema = z.object({
  chat_id: z.number(),
  sender_id: z.number(),
  content: z.string().min(1),
  message_type: z.enum(['text', 'image', 'file']).default('text')
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const getUserChatsInputSchema = z.object({
  user_id: z.number()
});

export type GetUserChatsInput = z.infer<typeof getUserChatsInputSchema>;

export const getChatMessagesInputSchema = z.object({
  chat_id: z.number(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetChatMessagesInput = z.infer<typeof getChatMessagesInputSchema>;

export const joinChatInputSchema = z.object({
  chat_id: z.number(),
  user_id: z.number()
});

export type JoinChatInput = z.infer<typeof joinChatInputSchema>;

export const markMessagesReadInputSchema = z.object({
  chat_id: z.number(),
  user_id: z.number()
});

export type MarkMessagesReadInput = z.infer<typeof markMessagesReadInputSchema>;

// Response schemas for complex queries
export const chatWithParticipantsSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  is_group: z.boolean(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  participants: z.array(userSchema),
  last_message: messageSchema.nullable(),
  unread_count: z.number().int().nonnegative()
});

export type ChatWithParticipants = z.infer<typeof chatWithParticipantsSchema>;

export const messageWithSenderSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  message_type: z.enum(['text', 'image', 'file']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  sender: userSchema
});

export type MessageWithSender = z.infer<typeof messageWithSenderSchema>;
