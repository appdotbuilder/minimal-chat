
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, chatParticipantsTable } from '../db/schema';
import { type CreateChatInput } from '../schema';
import { createChat } from '../handlers/create_chat';
import { eq, inArray } from 'drizzle-orm';

describe('createChat', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a group chat with participants', async () => {
    // Create test users first
    const userResults = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com', avatar_url: null },
        { username: 'user2', email: 'user2@test.com', avatar_url: null },
        { username: 'user3', email: 'user3@test.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const testInput: CreateChatInput = {
      name: 'Test Group Chat',
      is_group: true,
      avatar_url: 'https://example.com/avatar.jpg',
      participant_ids: userResults.map(user => user.id)
    };

    const result = await createChat(testInput);

    // Validate chat creation
    expect(result.name).toEqual('Test Group Chat');
    expect(result.is_group).toBe(true);
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create one-on-one chat with null name', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com', avatar_url: null },
        { username: 'user2', email: 'user2@test.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const testInput: CreateChatInput = {
      name: null,
      is_group: false,
      avatar_url: null,
      participant_ids: userResults.map(user => user.id)
    };

    const result = await createChat(testInput);

    expect(result.name).toBeNull();
    expect(result.is_group).toBe(false);
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save chat to database', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com', avatar_url: null },
        { username: 'user2', email: 'user2@test.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const testInput: CreateChatInput = {
      name: 'Test Chat',
      is_group: true,
      avatar_url: null,
      participant_ids: userResults.map(user => user.id)
    };

    const result = await createChat(testInput);

    // Verify chat exists in database
    const chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, result.id))
      .execute();

    expect(chats).toHaveLength(1);
    expect(chats[0].name).toEqual('Test Chat');
    expect(chats[0].is_group).toBe(true);
  });

  it('should create chat participants for all participant_ids', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com', avatar_url: null },
        { username: 'user2', email: 'user2@test.com', avatar_url: null },
        { username: 'user3', email: 'user3@test.com', avatar_url: null }
      ])
      .returning()
      .execute();

    const participantIds = userResults.map(user => user.id);
    const testInput: CreateChatInput = {
      name: 'Test Chat',
      is_group: true,
      avatar_url: null,
      participant_ids: participantIds
    };

    const result = await createChat(testInput);

    // Verify chat participants were created
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(eq(chatParticipantsTable.chat_id, result.id))
      .execute();

    expect(participants).toHaveLength(3);
    
    const participantUserIds = participants.map(p => p.user_id).sort();
    const expectedUserIds = participantIds.sort();
    expect(participantUserIds).toEqual(expectedUserIds);

    // Verify all participants have joined_at timestamp
    participants.forEach(participant => {
      expect(participant.joined_at).toBeInstanceOf(Date);
      expect(participant.last_read_at).toBeNull();
    });
  });

  it('should throw error when participant user does not exist', async () => {
    const testInput: CreateChatInput = {
      name: 'Test Chat',
      is_group: false,
      avatar_url: null,
      participant_ids: [999, 1000] // Non-existent user IDs
    };

    await expect(createChat(testInput)).rejects.toThrow(/do not exist/i);
  });

  it('should throw error when some participants do not exist', async () => {
    // Create one valid user
    const userResult = await db.insert(usersTable)
      .values({ username: 'user1', email: 'user1@test.com', avatar_url: null })
      .returning()
      .execute();

    const testInput: CreateChatInput = {
      name: 'Test Chat',
      is_group: true,
      avatar_url: null,
      participant_ids: [userResult[0].id, 999] // One valid, one invalid
    };

    await expect(createChat(testInput)).rejects.toThrow(/do not exist/i);
  });
});
