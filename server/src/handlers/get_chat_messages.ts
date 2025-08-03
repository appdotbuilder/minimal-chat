
import { db } from '../db';
import { messagesTable, usersTable, chatParticipantsTable } from '../db/schema';
import { type GetChatMessagesInput, type MessageWithSender } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getChatMessages(input: GetChatMessagesInput): Promise<MessageWithSender[]> {
  try {
    // Query messages with sender information, ordered by creation time (newest first)
    const results = await db.select()
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.sender_id, usersTable.id))
      .where(eq(messagesTable.chat_id, input.chat_id))
      .orderBy(desc(messagesTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Map results to MessageWithSender format
    return results.map(result => ({
      id: result.messages.id,
      chat_id: result.messages.chat_id,
      sender_id: result.messages.sender_id,
      content: result.messages.content,
      message_type: result.messages.message_type,
      created_at: result.messages.created_at,
      updated_at: result.messages.updated_at,
      sender: {
        id: result.users.id,
        username: result.users.username,
        email: result.users.email,
        avatar_url: result.users.avatar_url,
        created_at: result.users.created_at,
        updated_at: result.users.updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
}
