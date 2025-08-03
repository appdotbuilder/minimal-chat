
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, User } from 'lucide-react';
import type { ChatWithParticipants } from '../../../server/src/schema';

interface ChatListProps {
  chats: ChatWithParticipants[];
  selectedChatId: number | null;
  onChatSelect: (chatId: number) => void;
}

export function ChatList({ chats, selectedChatId, onChatSelect }: ChatListProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getChatDisplayName = (chat: ChatWithParticipants) => {
    if (chat.is_group) {
      return chat.name || '🎭 Group Chat';
    }
    // For one-on-one chats, show the other participant's name
    const otherParticipant = chat.participants.find(p => p.id !== 1); // Assuming current user ID is 1
    return otherParticipant ? `💬 ${otherParticipant.username}` : '👤 Unknown User';
  };

  const getChatAvatar = (chat: ChatWithParticipants) => {
    if (chat.avatar_url) return chat.avatar_url;
    if (chat.is_group) return null;
    const otherParticipant = chat.participants.find(p => p.id !== 1);
    return otherParticipant?.avatar_url || null;
  };

  const getChatInitials = (chat: ChatWithParticipants) => {
    if (chat.is_group) {
      return chat.name ? chat.name.substring(0, 2).toUpperCase() : 'GC';
    }
    const otherParticipant = chat.participants.find(p => p.id !== 1);
    return otherParticipant ? otherParticipant.username.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="flex flex-col h-full">
      {chats.map((chat: ChatWithParticipants) => (
        <div
          key={chat.id}
          onClick={() => onChatSelect(chat.id)}
          className={cn(
            'flex items-center p-4 cursor-pointer border-b border-purple-100/50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200',
            selectedChatId === chat.id && 'bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-l-purple-500'
          )}
        >
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-purple-200">
              <AvatarImage src={getChatAvatar(chat) || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold">
                {getChatInitials(chat)}
              </AvatarFallback>
            </Avatar>
            {chat.is_group ? (
              <Users className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full p-0.5" />
            ) : (
              <User className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full p-0.5" />
            )}
          </div>

          <div className="flex-1 ml-3 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">
                {getChatDisplayName(chat)}
              </h3>
              <div className="flex items-center space-x-2">
                {chat.last_message && (
                  <span className="text-xs text-gray-500">
                    {formatTime(chat.last_message.created_at)}
                  </span>
                )}
                {chat.unread_count > 0 && (
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </Badge>
                )}
              </div>
            </div>
            
            {chat.last_message ? (
              <p className="text-sm text-gray-600 truncate mt-1">
                <span className="font-medium text-purple-600">
                  {chat.last_message.sender_id === 1 ? 'You' : 
                   chat.participants.find(p => p.id === chat.last_message?.sender_id)?.username || 'Someone'}:
                </span>
                {' '}
                {chat.last_message.message_type === 'text' ? 
                  chat.last_message.content : 
                  `📎 ${chat.last_message.message_type}`
                }
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic mt-1">No messages yet ✨</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
