
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, chatParticipantsTable } from '../db/schema';
import { type JoinChatInput } from '../schema';
import { joinChat } from '../handlers/join_chat';
import { eq, and } from 'drizzle-orm';

describe('joinChat', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testGroupChat: any;
  let testOneOnOneChat: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'test1@example.com',
          avatar_url: null
        },
        {
          username: 'testuser2',
          email: 'test2@example.com',
          avatar_url: null
        }
      ])
      .returning()
      .execute();

    testUser = users[0];

    // Create test chats
    const chats = await db.insert(chatsTable)
      .values([
        {
          name: 'Test Group Chat',
          is_group: true,
          avatar_url: null
        },
        {
          name: null,
          is_group: false,
          avatar_url: null
        }
      ])
      .returning()
      .execute();

    testGroupChat = chats[0];
    testOneOnOneChat = chats[1];

    // Add second user to one-on-one chat
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: testOneOnOneChat.id,
        user_id: users[1].id
      })
      .execute();
  });

  it('should successfully add user to group chat', async () => {
    const input: JoinChatInput = {
      chat_id: testGroupChat.id,
      user_id: testUser.id
    };

    const result = await joinChat(input);

    expect(result.chat_id).toEqual(testGroupChat.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.joined_at).toBeInstanceOf(Date);
    expect(result.last_read_at).toBeNull();
  });

  it('should save participant to database', async () => {
    const input: JoinChatInput = {
      chat_id: testGroupChat.id,
      user_id: testUser.id
    };

    const result = await joinChat(input);

    const participant = await db.select()
      .from(chatParticipantsTable)
      .where(eq(chatParticipantsTable.id, result.id))
      .execute();

    expect(participant).toHaveLength(1);
    expect(participant[0].chat_id).toEqual(testGroupChat.id);
    expect(participant[0].user_id).toEqual(testUser.id);
    expect(participant[0].joined_at).toBeInstanceOf(Date);
  });

  it('should throw error when chat does not exist', async () => {
    const input: JoinChatInput = {
      chat_id: 99999,
      user_id: testUser.id
    };

    expect(joinChat(input)).rejects.toThrow(/chat not found/i);
  });

  it('should throw error when trying to join one-on-one chat', async () => {
    const input: JoinChatInput = {
      chat_id: testOneOnOneChat.id,
      user_id: testUser.id
    };

    expect(joinChat(input)).rejects.toThrow(/cannot join one-on-one chat/i);
  });

  it('should throw error when user is already a participant', async () => {
    // First join
    const input: JoinChatInput = {
      chat_id: testGroupChat.id,
      user_id: testUser.id
    };

    await joinChat(input);

    // Try to join again
    expect(joinChat(input)).rejects.toThrow(/already a participant/i);
  });

  it('should verify participant exists in database after joining', async () => {
    const input: JoinChatInput = {
      chat_id: testGroupChat.id,
      user_id: testUser.id
    };

    await joinChat(input);

    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, testGroupChat.id),
          eq(chatParticipantsTable.user_id, testUser.id)
        )
      )
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].chat_id).toEqual(testGroupChat.id);
    expect(participants[0].user_id).toEqual(testUser.id);
  });
});
