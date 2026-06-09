'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/socket-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { Send, UserCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminChatPage() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('thread_history', (history) => {
      setMessages(history);
    });

    return () => {
      socket.off('new_message');
      socket.off('thread_history');
    };
  }, [socket]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !activeThreadId) return;

    socket.emit('send_message', {
      threadId: activeThreadId,
      content: inputText,
      senderRole: 'ADMIN',
    });
    
    // Optimistic UI update or let socket broadcast handle it depending on backend.
    setInputText('');
  };

  // For testing purposes, we hardcode joining a specific thread or listening to all
  useEffect(() => {
    if (socket && isConnected) {
      // In a real app, you would fetch threads via API and join them
      socket.emit('admin_join_all'); // Example event, depends on your gateway implementation
    }
  }, [socket, isConnected]);

  return (
    <div className="flex h-[calc(100vh-120px)] border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Sidebar Threads List */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b font-semibold bg-muted/30">Hộp thư (Chat)</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Mock Thread Item */}
          <div 
            onClick={() => setActiveThreadId('test-thread-1')}
            className={`p-3 rounded-lg cursor-pointer border hover:bg-muted/50 transition-colors ${activeThreadId === 'test-thread-1' ? 'bg-muted border-primary' : ''}`}
          >
            <div className="font-medium">Khách hàng vãng lai</div>
            <div className="text-xs text-muted-foreground truncate">Đang cần hỗ trợ đặt phòng...</div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="font-semibold flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-muted-foreground" />
            {activeThreadId ? 'Đang chat: Khách hàng' : 'Chọn một cuộc hội thoại'}
          </div>
          <div className="text-xs">
            Trạng thái kết nối: {isConnected ? <span className="text-green-500 font-bold">Online</span> : <span className="text-red-500 font-bold">Offline</span>}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeThreadId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Vui lòng chọn một đoạn chat bên trái
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAdmin = msg.senderRole === 'ADMIN';
              return (
                <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isAdmin ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                    {msg.sentAt ? format(new Date(msg.sentAt), 'HH:mm') : 'Bây giờ'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input 
              placeholder="Nhập tin nhắn..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!activeThreadId || !isConnected}
              className="flex-1"
            />
            <Button type="submit" disabled={!activeThreadId || !isConnected || !inputText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
