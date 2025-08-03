
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testChatId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: 'Test Chat',
        is_group: true,
        avatar_url: null
      })
      .returning()
      .execute();
    testChatId = chatResult[0].id;

    // Add user as participant to the chat
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: testChatId,
        user_id: testUserId
      })
      .execute();
  });

  const testInput: SendMessageInput = {
    chat_id: 0, // Will be set in tests
    sender_id: 0, // Will be set in tests
    content: 'Hello, this is a test message!',
    message_type: 'text'
  };

  it('should send a message successfully', async () => {
    const input = {
      ...testInput,
      chat_id: testChatId,
      sender_id: testUserId
    };

    const result = await sendMessage(input);

    expect(result.chat_id).toEqual(testChatId);
    expect(result.sender_id).toEqual(testUserId);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.message_type).toEqual('text');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const input = {
      ...testInput,
      chat_id: testChatId,
      sender_id: testUserId
    };

    const result = await sendMessage(input);

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Hello, this is a test message!');
    expect(messages[0].chat_id).toEqual(testChatId);
    expect(messages[0].sender_id).toEqual(testUserId);
    expect(messages[0].message_type).toEqual('text');
  });

  it('should update chat updated_at timestamp', async () => {
    // Get initial chat timestamp
    const initialChat = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, testChatId))
      .execute();
    const initialUpdatedAt = initialChat[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input = {
      ...testInput,
      chat_id: testChatId,
      sender_id: testUserId
    };

    await sendMessage(input);

    // Check that chat's updated_at was modified
    const updatedChat = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, testChatId))
      .execute();

    expect(updatedChat[0].updated_at).not.toEqual(initialUpdatedAt);
    expect(updatedChat[0].updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should send different message types', async () => {
    const imageInput = {
      ...testInput,
      chat_id: testChatId,
      sender_id: testUserId,
      content: 'https://example.com/image.jpg',
      message_type: 'image' as const
    };

    const result = await sendMessage(imageInput);

    expect(result.message_type).toEqual('image');
    expect(result.content).toEqual('https://example.com/image.jpg');
  });

  it('should reject message from non-participant', async () => {
    // Create another user who is not a participant
    const nonParticipantResult = await db.insert(usersTable)
      .values({
        username: 'nonparticipant',
        email: 'nonparticipant@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    const nonParticipantId = nonParticipantResult[0].id;

    const input = {
      ...testInput,
      chat_id: testChatId,
      sender_id: nonParticipantId
    };

    await expect(sendMessage(input)).rejects.toThrow(/not a participant/i);
  });

  it('should reject message to non-existent chat', async () => {
    const input = {
      ...testInput,
      chat_id: 999999, // Non-existent chat ID
      sender_id: testUserId
    };

    await expect(sendMessage(input)).rejects.toThrow(/not a participant/i);
  });
});
