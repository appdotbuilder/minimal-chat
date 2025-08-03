
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import {
  createUserInputSchema,
  createChatInputSchema,
  sendMessageInputSchema,
  getUserChatsInputSchema,
  getChatMessagesInputSchema,
  joinChatInputSchema,
  markMessagesReadInputSchema
} from './schema';
import { createUser } from './handlers/create_user';
import { createChat } from './handlers/create_chat';
import { sendMessage } from './handlers/send_message';
import { getUserChats } from './handlers/get_user_chats';
import { getChatMessages } from './handlers/get_chat_messages';
import { joinChat } from './handlers/join_chat';
import { markMessagesRead } from './handlers/mark_messages_read';
import { getUsers } from './handlers/get_users';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  // Chat management
  createChat: publicProcedure
    .input(createChatInputSchema)
    .mutation(({ input }) => createChat(input)),
  
  getUserChats: publicProcedure
    .input(getUserChatsInputSchema)
    .query(({ input }) => getUserChats(input)),
  
  joinChat: publicProcedure
    .input(joinChatInputSchema)
    .mutation(({ input }) => joinChat(input)),
  
  // Message management
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),
  
  getChatMessages: publicProcedure
    .input(getChatMessagesInputSchema)
    .query(({ input }) => getChatMessages(input)),
  
  markMessagesRead: publicProcedure
    .input(markMessagesReadInputSchema)
    .mutation(({ input }) => markMessagesRead(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
