
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { CreateChatDialog } from '@/components/CreateChatDialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import type { ChatWithParticipants, User } from '../../server/src/schema';

function App() {
  const [chats, setChats] = useState<ChatWithParticipants[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId] = useState(1); // Current user ID - would come from auth context in real app
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadChats = useCallback(async () => {
    try {
      const result = await trpc.getUserChats.query({ user_id: currentUserId });
      setChats(result);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadChats();
    loadUsers();
  }, [loadChats, loadUsers]);

  const selectedChat = chats.find((chat: ChatWithParticipants) => chat.id === selectedChatId);

  const handleChatCreated = (newChat: ChatWithParticipants) => {
    setChats((prev: ChatWithParticipants[]) => [newChat, ...prev]);
    setSelectedChatId(newChat.id);
    setIsCreateChatOpen(false);
  };

  const handleMessageSent = () => {
    // Refresh chats to update last message and unread counts
    loadChats();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white/95 backdrop-blur-sm shadow-xl border-r border-white/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white">💬 ChatApp</h1>
            </div>
            <Button
              onClick={() => setIsCreateChatOpen(true)}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading chats...
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No chats yet! 🌟</p>
              <p className="text-sm text-gray-400 mb-4">
                ⚠️ Backend handlers are not implemented - create a chat to see the interface!
              </p>
              <Button
                onClick={() => setIsCreateChatOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Chatting
              </Button>
            </div>
          ) : (
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onChatSelect={setSelectedChatId}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            currentUserId={currentUserId}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white/10 backdrop-blur-sm">
            <div className="text-center">
              <MessageCircle className="w-24 h-24 text-white/50 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to ChatApp! 🎉</h2>
              <p className="text-white/80 mb-6">Select a chat to start messaging or create a new one</p>
              <Button
                onClick={() => setIsCreateChatOpen(true)}
                size="lg"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                variant="outline"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat Dialog */}
      <CreateChatDialog
        open={isCreateChatOpen}
        onOpenChange={setIsCreateChatOpen}
        users={users}
        currentUserId={currentUserId}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}

export default App;
