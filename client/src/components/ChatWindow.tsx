
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { Send, Users, User, Image, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatWithParticipants, MessageWithSender } from '../../../server/src/schema';

interface ChatWindowProps {
  chat: ChatWithParticipants;
  currentUserId: number;
  onMessageSent: () => void;
}

export function ChatWindow({ chat, currentUserId, onMessageSent }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getChatMessages.query({ 
        chat_id: chat.id,
        limit: 50,
        offset: 0
      });
      setMessages(result.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chat.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const sentMessage = await trpc.sendMessage.mutate({
        chat_id: chat.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
        message_type: 'text'
      });

      // Since the server is using stubs, we'll simulate adding the message
      const messageWithSender: MessageWithSender = {
        ...sentMessage,
        sender: {
          id: currentUserId,
          username: 'You',
          email: 'you@example.com',
          avatar_url: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      };

      setMessages((prev: MessageWithSender[]) => [...prev, messageWithSender]);
      setNewMessage('');
      onMessageSent();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatDisplayName = () => {
    if (chat.is_group) {
      return chat.name || '🎭 Group Chat';
    }
    const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
    return otherParticipant ? otherParticipant.username : 'Unknown User';
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'file': return <Paperclip className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/10 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/20 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 ring-2 ring-white/50">
              <AvatarImage src={chat.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white font-semibold">
                {getChatDisplayName().substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-white text-lg">{getChatDisplayName()}</h2>
              <div className="flex items-center space-x-2 text-white/70 text-sm">
                {chat.is_group ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span>
                  {chat.participants.length} participant{chat.participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          
          {chat.is_group && (
            <Badge className="bg-gradient-to-r from-green-400 to-blue-400 text-white">
              Group Chat 👥
            </Badge>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/70">
                <div className="animate-spin w-6 h-6 border-2 border-white/50 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/70">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg mb-2">No messages yet!</p>
                <p className="text-sm">⚠️ Server is using stub data - send a message to see the interface!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: MessageWithSender) => {
                const isOwnMessage = message.sender_id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-lg',
                        isOwnMessage
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/90 backdrop-blur-sm text-gray-800'
                      )}
                    >
                      {!isOwnMessage && chat.is_group && (
                        <p className="text-xs font-semibold text-purple-600 mb-1">
                          {message.sender.username}
                        </p>
                      )}
                      
                      <div className="flex items-start space-x-2">
                        {getMessageIcon(message.message_type)}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={cn(
                              'text-xs mt-1',
                              isOwnMessage ? 'text-white/70' : 'text-gray-500'
                            )}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/20 bg-white/20 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <Input
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type a message... 💭"
            className="flex-1 bg-white/90 backdrop-blur-sm border-white/30 focus:border-purple-400 focus:ring-purple-400"
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {isSending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
