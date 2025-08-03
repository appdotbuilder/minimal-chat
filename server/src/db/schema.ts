
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define message type enum
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chats table
export const chatsTable = pgTable('chats', {
  id: serial('id').primaryKey(),
  name: text('name'), // null for one-on-one chats
  is_group: boolean('is_group').notNull().default(false),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  chat_id: integer('chat_id').notNull().references(() => chatsTable.id, { onDelete: 'cascade' }),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  message_type: messageTypeEnum('message_type').notNull().default('text'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chat participants table (many-to-many relationship between users and chats)
export const chatParticipantsTable = pgTable('chat_participants', {
  id: serial('id').primaryKey(),
  chat_id: integer('chat_id').notNull().references(() => chatsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  joined_at: timestamp('joined_at').defaultNow().notNull(),
  last_read_at: timestamp('last_read_at')
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  sentMessages: many(messagesTable),
  chatParticipants: many(chatParticipantsTable)
}));

export const chatsRelations = relations(chatsTable, ({ many }) => ({
  messages: many(messagesTable),
  participants: many(chatParticipantsTable)
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [messagesTable.chat_id],
    references: [chatsTable.id]
  }),
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id]
  })
}));

export const chatParticipantsRelations = relations(chatParticipantsTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [chatParticipantsTable.chat_id],
    references: [chatsTable.id]
  }),
  user: one(usersTable, {
    fields: [chatParticipantsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Chat = typeof chatsTable.$inferSelect;
export type NewChat = typeof chatsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type ChatParticipant = typeof chatParticipantsTable.$inferSelect;
export type NewChatParticipant = typeof chatParticipantsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  chats: chatsTable,
  messages: messagesTable,
  chatParticipants: chatParticipantsTable
};
