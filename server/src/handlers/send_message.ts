
import { db } from '../db';
import { messagesTable, chatsTable, chatParticipantsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  try {
    // Verify that the sender is a participant of the chat
    const participantCheck = await db.select()
      .from(chatParticipantsTable)
      .where(
        and(
          eq(chatParticipantsTable.chat_id, input.chat_id),
          eq(chatParticipantsTable.user_id, input.sender_id)
        )
      )
      .execute();

    if (participantCheck.length === 0) {
      throw new Error('User is not a participant of this chat');
    }

    // Insert the message
    const messageResult = await db.insert(messagesTable)
      .values({
        chat_id: input.chat_id,
        sender_id: input.sender_id,
        content: input.content,
        message_type: input.message_type
      })
      .returning()
      .execute();

    // Update the chat's updated_at timestamp
    await db.update(chatsTable)
      .set({
        updated_at: new Date()
      })
      .where(eq(chatsTable.id, input.chat_id))
      .execute();

    return messageResult[0];
  } catch (error) {
    console.error('Message sending failed:', error);
    throw error;
  }
}
