
import { db } from '../db';
import { chatsTable, chatParticipantsTable, usersTable } from '../db/schema';
import { type CreateChatInput, type Chat } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export async function createChat(input: CreateChatInput): Promise<Chat> {
  try {
    // Verify all participant users exist
    const existingUsers = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.id, input.participant_ids))
      .execute();

    if (existingUsers.length !== input.participant_ids.length) {
      throw new Error('One or more participant users do not exist');
    }

    // Create the chat
    const chatResult = await db.insert(chatsTable)
      .values({
        name: input.name,
        is_group: input.is_group,
        avatar_url: input.avatar_url
      })
      .returning()
      .execute();

    const chat = chatResult[0];

    // Create chat participants entries
    const participantValues = input.participant_ids.map(userId => ({
      chat_id: chat.id,
      user_id: userId
    }));

    await db.insert(chatParticipantsTable)
      .values(participantValues)
      .execute();

    return chat;
  } catch (error) {
    console.error('Chat creation failed:', error);
    throw error;
  }
}
