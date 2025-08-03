
import { db } from '../db';
import { usersTable, chatsTable, messagesTable, chatParticipantsTable } from '../db/schema';
import { type GetUserChatsInput, type ChatWithParticipants } from '../schema';
import { eq, desc, and, count, gt } from 'drizzle-orm';

export async function getUserChats(input: GetUserChatsInput): Promise<ChatWithParticipants[]> {
  try {
    // First, get all chats where the user is a participant
    const userChats = await db.select({
      chat_id: chatParticipantsTable.chat_id,
      user_id: chatParticipantsTable.user_id,
      last_read_at: chatParticipantsTable.last_read_at,
      id: chatsTable.id,
      name: chatsTable.name,
      is_group: chatsTable.is_group,
      avatar_url: chatsTable.avatar_url,
      created_at: chatsTable.created_at,
      updated_at: chatsTable.updated_at
    })
    .from(chatParticipantsTable)
    .innerJoin(chatsTable, eq(chatParticipantsTable.chat_id, chatsTable.id))
    .where(eq(chatParticipantsTable.user_id, input.user_id))
    .execute();

    // For each chat, get participants, last message, and unread count
    const results: ChatWithParticipants[] = [];

    for (const chat of userChats) {
      // Get all participants for this chat
      const participants = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        avatar_url: usersTable.avatar_url,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      })
      .from(chatParticipantsTable)
      .innerJoin(usersTable, eq(chatParticipantsTable.user_id, usersTable.id))
      .where(eq(chatParticipantsTable.chat_id, chat.chat_id))
      .execute();

      // Get last message for this chat
      const lastMessageResult = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.chat_id, chat.chat_id))
        .orderBy(desc(messagesTable.created_at))
        .limit(1)
        .execute();

      const lastMessage = lastMessageResult.length > 0 ? lastMessageResult[0] : null;

      // Count unread messages (messages created after user's last_read_at)
      let unreadCount = 0;
      if (chat.last_read_at) {
        const unreadResult = await db.select({ count: count() })
          .from(messagesTable)
          .where(
            and(
              eq(messagesTable.chat_id, chat.chat_id),
              gt(messagesTable.created_at, chat.last_read_at)
            )
          )
          .execute();
        
        unreadCount = unreadResult[0].count;
      } else {
        // If never read, all messages are unread
        const unreadResult = await db.select({ count: count() })
          .from(messagesTable)
          .where(eq(messagesTable.chat_id, chat.chat_id))
          .execute();
        unreadCount = unreadResult[0].count;
      }

      results.push({
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        avatar_url: chat.avatar_url,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        participants,
        last_message: lastMessage,
        unread_count: unreadCount
      });
    }

    // Sort by most recent activity (last message timestamp, then chat creation)
    results.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return bTime.getTime() - aTime.getTime();
    });

    return results;
  } catch (error) {
    console.error('Get user chats failed:', error);
    throw error;
  }
}
