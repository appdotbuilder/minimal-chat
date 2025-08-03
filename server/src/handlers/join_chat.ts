
import { db } from '../db';
import { chatsTable, chatParticipantsTable } from '../db/schema';
import { type JoinChatInput, type ChatParticipant } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function joinChat(input: JoinChatInput): Promise<ChatParticipant> {
  try {
    // Verify that the chat exists
    const chat = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, input.chat_id))
      .execute();

    if (chat.length === 0) {
      throw new Error('Chat not found');
    }

    // For one-on-one chats, restrict joining (only group chats allow new participants)
    if (!chat[0].is_group) {
      throw new Error('Cannot join one-on-one chat');
    }

    // Check if user is already a participant
    const existingParticipant = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, input.chat_id),
          eq(chatParticipantsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingParticipant.length > 0) {
      throw new Error('User is already a participant in this chat');
    }

    // Add user as a participant
    const result = await db.insert(chatParticipantsTable)
      .values({
        chat_id: input.chat_id,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Join chat failed:', error);
    throw error;
  }
}
