
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { Users, User, Plus } from 'lucide-react';
import type { User as UserType, ChatWithParticipants } from '../../../server/src/schema';

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserType[];
  currentUserId: number;
  onChatCreated: (chat: ChatWithParticipants) => void;
}

export function CreateChatDialog({ 
  open, 
  onOpenChange, 
  users, 
  currentUserId, 
  onChatCreated 
}: CreateChatDialogProps) {
  const [isGroup, setIsGroup] = useState(false);
  const [chatName, setChatName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds((prev: number[]) => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setIsCreating(true);
    try {
      const participantIds = [currentUserId, ...selectedUserIds];
      
      await trpc.createChat.mutate({
        name: isGroup ? (chatName.trim() || null) : null,
        is_group: isGroup,
        avatar_url: null,
        participant_ids: participantIds
      });

      // Create chat object for frontend display since backend returns placeholder data
      const createdChat: ChatWithParticipants = {
        id: Date.now(), // Temporary ID until backend is implemented
        name: isGroup ? (chatName.trim() || null) : null,
        is_group: isGroup,
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        participants: [
          {
            id: currentUserId,
            username: 'You',
            email: 'you@example.com',
            avatar_url: null,
            created_at: new Date(),
            updated_at: new Date()
          },
          ...users.filter(user => selectedUserIds.includes(user.id))
        ],
        last_message: null,
        unread_count: 0
      };

      onChatCreated(createdChat);
      
      // Reset form
      setIsGroup(false);
      setChatName('');
      setSelectedUserIds([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setIsGroup(false);
    setChatName('');
    setSelectedUserIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-purple-800">
            <Plus className="w-5 h-5" />
            <span>Create New Chat 💬</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chat Type Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-3">
              {isGroup ? (
                <Users className="w-5 h-5 text-purple-600" />
              ) : (
                <User className="w-5 h-5 text-blue-600" />
              )}
              <div>
                <Label className="font-semibold text-gray-800">
                  {isGroup ? 'Group Chat 👥' : 'Direct Message 💬'}
                </Label>
                <p className="text-sm text-gray-600">
                  {isGroup ? 'Chat with multiple people' : 'One-on-one conversation'}
                </p>
              </div>
            </div>
            <Switch
              checked={isGroup}
              onCheckedChange={setIsGroup}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Group Name Input */}
          {isGroup && (
            <div className="space-y-2">
              <Label htmlFor="chatName" className="text-gray-700 font-semibold">
                Group Name (Optional) ✨
              </Label>
              <Input
                id="chatName"
                value={chatName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatName(e.target.value)}
                placeholder="Enter group name..."
                className="bg-white/80 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
              />
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 font-semibold">
                Select Participants 👤
              </Label>
              {selectedUserIds.length > 0 && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {selectedUserIds.length} selected
                </Badge>
              )}
            </div>

            {users.length === 0 ? (
              <div className="p-6 text-center bg-white/60 rounded-lg border border-purple-200">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No users available 😔</p>
                <p className="text-sm text-gray-400">
                  ⚠️ Backend handlers are not implemented - users list is empty
                </p>
              </div>
            ) : (
              <ScrollArea className="h-48 border border-purple-200 rounded-lg bg-white/60">
                <div className="p-2 space-y-2">
                  {users.filter(user => user.id !== currentUserId).map((user: UserType) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-purple-100/50 cursor-pointer"
                      onClick={() => handleUserToggle(user.id)}
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-sm">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-purple-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedUserIds.length === 0 || isCreating}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Chat</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
