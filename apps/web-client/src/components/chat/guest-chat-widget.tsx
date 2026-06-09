import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, X, Send } from 'lucide-react';

export function GuestChatWidget({ propertyId }: { propertyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Connect to ChatGateway using a temporary guest token or session ID
    // Note: In real implementation, you might need to call an API to get a temporary guest token first.
    const socketUrl = import.meta.env.VITE_API_URL || '';
    
    const newSocket = io(`${socketUrl}/chat`, {
      transports: ['websocket'],
      path: '/socket.io/',
      // auth: { token: guestToken }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Automatically join property thread
      newSocket.emit('join_property', { propertyId });
    });

    newSocket.on('disconnect', () => setIsConnected(false));
    
    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('thread_history', (history) => {
      setMessages(history);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isOpen, propertyId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('send_message', {
      propertyId,
      content: inputText,
      senderRole: 'GUEST',
    });
    
    setInputText('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-background border rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all animate-in slide-in-from-bottom-5">
          <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center">
            <div className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat với Lễ tân
            </div>
            <button type="button" className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground rounded flex items-center justify-center" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Xin chào! Chúng tôi có thể giúp gì cho bạn?
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isGuest = msg.senderRole === 'GUEST';
                return (
                  <div key={idx} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isGuest ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t flex gap-2 bg-background">
            <input 
              placeholder="Nhập tin nhắn..." 
              value={inputText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
              className="rounded-full flex-1 px-3 py-2 border text-sm outline-none focus:ring-2 focus:ring-primary"
              disabled={!isConnected}
            />
            <button type="submit" className="rounded-full shrink-0 h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50" disabled={!isConnected || !inputText.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        className={`h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-105 bg-primary text-primary-foreground flex items-center justify-center ${isOpen ? 'rotate-90 scale-0 opacity-0 hidden' : 'rotate-0 opacity-100'}`}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    </div>
  );
}
