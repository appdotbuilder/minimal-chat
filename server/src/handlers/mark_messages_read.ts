
import { db } from '../db';
import { chatParticipantsTable } from '../db/schema';
import { type MarkMessagesReadInput } from '../schema';
import { and, eq } from 'drizzle-orm';

export async function markMessagesRead(input: MarkMessagesReadInput): Promise<void> {
  try {
    // Update the last_read_at timestamp for the user in the specified chat
    await db.update(chatParticipantsTable)
      .set({
        last_read_at: new Date()
      })
      .where(
        and(
          eq(chatParticipantsTable.chat_id, input.chat_id),
          eq(chatParticipantsTable.user_id, input.user_id)
        )
      )
      .execute();
  } catch (error) {
    console.error('Mark messages read failed:', error);
    throw error;
  }
}
