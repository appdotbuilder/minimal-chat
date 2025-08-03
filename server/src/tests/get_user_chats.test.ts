
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type GetUserChatsInput } from '../schema';
import { getUserChats } from '../handlers/get_user_chats';

describe('getUserChats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no chats', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: GetUserChatsInput = {
      user_id: userId
    };

    const result = await getUserChats(input);

    expect(result).toEqual([]);
  });

  it('should return user chats with participants and last message', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', avatar_url: null },
        { username: 'user2', email: 'user2@example.com', avatar_url: null },
        { username: 'user3', email: 'user3@example.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const [user1, user2, user3] = users;

    // Create a group chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: 'Test Group',
        is_group: true,
        avatar_url: null
      })
      .returning()
      .execute();

    const chat = chatResult[0];

    // Add participants
    await db.insert(chatParticipantsTable)
      .values([
        { chat_id: chat.id, user_id: user1.id },
        { chat_id: chat.id, user_id: user2.id },
        { chat_id: chat.id, user_id: user3.id }
      ])
      .execute();

    // Add messages with explicit timing to ensure order
    await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        sender_id: user2.id,
        content: 'Hello everyone!',
        message_type: 'text'
      })
      .execute();

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        sender_id: user1.id,
        content: 'Hi there!',
        message_type: 'text'
      })
      .execute();

    const input: GetUserChatsInput = {
      user_id: user1.id
    };

    const result = await getUserChats(input);

    expect(result).toHaveLength(1);
    
    const userChat = result[0];
    expect(userChat.id).toEqual(chat.id);
    expect(userChat.name).toEqual('Test Group');
    expect(userChat.is_group).toBe(true);
    expect(userChat.participants).toHaveLength(3);
    expect(userChat.last_message).toBeDefined();
    expect(userChat.last_message?.content).toEqual('Hi there!');
    expect(userChat.unread_count).toBeGreaterThanOrEqual(0);

    // Verify participants contain all users
    const participantIds = userChat.participants.map(p => p.id).sort();
    expect(participantIds).toEqual([user1.id, user2.id, user3.id].sort());
  });

  it('should calculate unread count correctly', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', avatar_url: null },
        { username: 'user2', email: 'user2@example.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const [user1, user2] = users;

    // Create a chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: null,
        is_group: false,
        avatar_url: null
      })
      .returning()
      .execute();

    const chat = chatResult[0];

    // Add participants with last_read_at
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);

    await db.insert(chatParticipantsTable)
      .values([
        { 
          chat_id: chat.id, 
          user_id: user1.id,
          last_read_at: pastDate
        },
        { chat_id: chat.id, user_id: user2.id }
      ])
      .execute();

    // Add messages after last_read_at
    await db.insert(messagesTable)
      .values([
        {
          chat_id: chat.id,
          sender_id: user2.id,
          content: 'Unread message 1',
          message_type: 'text'
        },
        {
          chat_id: chat.id,
          sender_id: user2.id,
          content: 'Unread message 2',
          message_type: 'text'
        }
      ])
      .execute();

    const input: GetUserChatsInput = {
      user_id: user1.id
    };

    const result = await getUserChats(input);

    expect(result).toHaveLength(1);
    expect(result[0].unread_count).toEqual(2);
  });

  it('should sort chats by most recent activity', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', avatar_url: null },
        { username: 'user2', email: 'user2@example.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const [user1, user2] = users;

    // Create two chats
    const chatResults = await db.insert(chatsTable)
      .values([
        { name: 'Old Chat', is_group: false, avatar_url: null },
        { name: 'New Chat', is_group: false, avatar_url: null }
      ])
      .returning()
      .execute();

    const [oldChat, newChat] = chatResults;

    // Add user1 to both chats
    await db.insert(chatParticipantsTable)
      .values([
        { chat_id: oldChat.id, user_id: user1.id },
        { chat_id: oldChat.id, user_id: user2.id },
        { chat_id: newChat.id, user_id: user1.id },
        { chat_id: newChat.id, user_id: user2.id }
      ])
      .execute();

    // Add message to old chat first
    await db.insert(messagesTable)
      .values({
        chat_id: oldChat.id,
        sender_id: user2.id,
        content: 'Old message',
        message_type: 'text'
      })
      .execute();

    // Wait a bit, then add message to new chat
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(messagesTable)
      .values({
        chat_id: newChat.id,
        sender_id: user2.id,
        content: 'New message',
        message_type: 'text'
      })
      .execute();

    const input: GetUserChatsInput = {
      user_id: user1.id
    };

    const result = await getUserChats(input);

    expect(result).toHaveLength(2);
    // New chat should come first due to more recent message
    expect(result[0].name).toEqual('New Chat');
    expect(result[1].name).toEqual('Old Chat');
  });
});
