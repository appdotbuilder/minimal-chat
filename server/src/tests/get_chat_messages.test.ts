
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type GetChatMessagesInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  avatar_url: null
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  avatar_url: 'https://example.com/avatar2.jpg'
};

const testChat = {
  name: 'Test Chat',
  is_group: true,
  avatar_url: null
};

describe('getChatMessages', () => {
  let userId1: number;
  let userId2: number;
  let chatId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();
    userId1 = users[0].id;
    userId2 = users[1].id;

    // Create test chat
    const chats = await db.insert(chatsTable)
      .values(testChat)
      .returning()
      .execute();
    chatId = chats[0].id;

    // Add participants to chat
    await db.insert(chatParticipantsTable)
      .values([
        { chat_id: chatId, user_id: userId1 },
        { chat_id: chatId, user_id: userId2 }
      ])
      .execute();
  });

  afterEach(resetDB);

  it('should get messages with sender information', async () => {
    // Create test messages with individual inserts to ensure different timestamps
    await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: userId1,
        content: 'Hello from user 1',
        message_type: 'text'
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: userId2,
        content: 'Hello from user 2',
        message_type: 'text'
      })
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chatId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    
    // Check that we have both messages (order may vary due to timestamps)
    const contents = result.map(msg => msg.content).sort();
    expect(contents).toEqual(['Hello from user 1', 'Hello from user 2']);

    // Check message structure
    const firstMessage = result[0];
    expect(firstMessage.chat_id).toBe(chatId);
    expect(firstMessage.message_type).toBe('text');
    expect(firstMessage.sender).toBeDefined();
    expect(firstMessage.created_at).toBeInstanceOf(Date);
    expect(firstMessage.updated_at).toBeInstanceOf(Date);
    expect(firstMessage.id).toBeDefined();
    expect(firstMessage.sender_id).toBeDefined();

    // Check sender information is properly populated
    const senders = result.map(msg => msg.sender.username).sort();
    expect(senders).toEqual(['testuser1', 'testuser2']);

    // Verify sender details
    result.forEach(message => {
      expect(message.sender.id).toBeDefined();
      expect(message.sender.email).toMatch(/@example\.com$/);
      expect(message.sender.created_at).toBeInstanceOf(Date);
      expect(message.sender.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should respect pagination parameters', async () => {
    // Create multiple test messages
    const messages = [];
    for (let i = 1; i <= 5; i++) {
      messages.push({
        chat_id: chatId,
        sender_id: userId1,
        content: `Message ${i}`,
        message_type: 'text' as const
      });
    }
    
    await db.insert(messagesTable)
      .values(messages)
      .execute();

    // Test limit
    const limitedInput: GetChatMessagesInput = {
      chat_id: chatId,
      limit: 3,
      offset: 0
    };

    const limitedResult = await getChatMessages(limitedInput);
    expect(limitedResult).toHaveLength(3);

    // Test offset
    const offsetInput: GetChatMessagesInput = {
      chat_id: chatId,
      limit: 3,
      offset: 2
    };

    const offsetResult = await getChatMessages(offsetInput);
    expect(offsetResult).toHaveLength(3);
    
    // Should be different messages due to offset
    expect(offsetResult[0].id).not.toBe(limitedResult[0].id);
  });

  it('should return messages ordered by creation time (newest first)', async () => {
    // Create messages with explicit delays to ensure different timestamps
    await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: userId1,
        content: 'First message',
        message_type: 'text'
      })
      .execute();

    // Delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(messagesTable)
      .values({
        chat_id: chatId,
        sender_id: userId2,
        content: 'Second message',
        message_type: 'text'
      })
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chatId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    // Newest message should be first
    expect(result[0].content).toBe('Second message');
    expect(result[1].content).toBe('First message');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(
      result[1].created_at.getTime()
    );
  });

  it('should return empty array for non-existent chat', async () => {
    const input: GetChatMessagesInput = {
      chat_id: 999999,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(input);
    expect(result).toHaveLength(0);
  });

  it('should handle different message types', async () => {
    await db.insert(messagesTable)
      .values([
        {
          chat_id: chatId,
          sender_id: userId1,
          content: 'Text message',
          message_type: 'text'
        },
        {
          chat_id: chatId,
          sender_id: userId2,
          content: 'image.jpg',
          message_type: 'image'
        },
        {
          chat_id: chatId,
          sender_id: userId1,
          content: 'document.pdf',
          message_type: 'file'
        }
      ])
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chatId,
      limit: 50,
      offset: 0
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(3);
    
    const messageTypes = result.map(msg => msg.message_type).sort();
    expect(messageTypes).toEqual(['file', 'image', 'text']);
  });
});
