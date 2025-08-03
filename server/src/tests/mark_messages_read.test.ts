
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatsTable, chatParticipantsTable, messagesTable } from '../db/schema';
import { type MarkMessagesReadInput } from '../schema';
import { markMessagesRead } from '../handlers/mark_messages_read';
import { eq, and } from 'drizzle-orm';

describe('markMessagesRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update last_read_at timestamp for user in chat', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: 'Test Chat',
        is_group: true,
        avatar_url: null
      })
      .returning()
      .execute();
    const chat = chatResult[0];

    // Create chat participant with null last_read_at
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: chat.id,
        user_id: user.id,
        last_read_at: null
      })
      .execute();

    const input: MarkMessagesReadInput = {
      chat_id: chat.id,
      user_id: user.id
    };

    // Mark messages as read
    await markMessagesRead(input);

    // Verify last_read_at was updated
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat.id),
          eq(chatParticipantsTable.user_id, user.id)
        )
      )
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].last_read_at).not.toBeNull();
    expect(participants[0].last_read_at).toBeInstanceOf(Date);
  });

  it('should update existing last_read_at timestamp', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: 'Test Chat',
        is_group: true,
        avatar_url: null
      })
      .returning()
      .execute();
    const chat = chatResult[0];

    // Set initial timestamp (1 hour ago)
    const initialTimestamp = new Date();
    initialTimestamp.setHours(initialTimestamp.getHours() - 1);

    // Create chat participant with existing last_read_at
    await db.insert(chatParticipantsTable)
      .values({
        chat_id: chat.id,
        user_id: user.id,
        last_read_at: initialTimestamp
      })
      .execute();

    const input: MarkMessagesReadInput = {
      chat_id: chat.id,
      user_id: user.id
    };

    // Mark messages as read
    await markMessagesRead(input);

    // Verify last_read_at was updated to a more recent time
    const participants = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat.id),
          eq(chatParticipantsTable.user_id, user.id)
        )
      )
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].last_read_at).not.toBeNull();
    expect(participants[0].last_read_at).toBeInstanceOf(Date);
    expect(participants[0].last_read_at!.getTime()).toBeGreaterThan(initialTimestamp.getTime());
  });

  it('should only update the specified user and chat combination', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        avatar_url: null
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create test chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: 'Test Chat',
        is_group: true,
        avatar_url: null
      })
      .returning()
      .execute();
    const chat = chatResult[0];

    // Create chat participants for both users
    await db.insert(chatParticipantsTable)
      .values([
        {
          chat_id: chat.id,
          user_id: user1.id,
          last_read_at: null
        },
        {
          chat_id: chat.id,
          user_id: user2.id,
          last_read_at: null
        }
      ])
      .execute();

    const input: MarkMessagesReadInput = {
      chat_id: chat.id,
      user_id: user1.id
    };

    // Mark messages as read for user1 only
    await markMessagesRead(input);

    // Verify only user1's last_read_at was updated
    const user1Participant = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat.id),
          eq(chatParticipantsTable.user_id, user1.id)
        )
      )
      .execute();

    const user2Participant = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, chat.id),
          eq(chatParticipantsTable.user_id, user2.id)
        )
      )
      .execute();

    expect(user1Participant[0].last_read_at).not.toBeNull();
    expect(user1Participant[0].last_read_at).toBeInstanceOf(Date);
    expect(user2Participant[0].last_read_at).toBeNull();
  });
});
