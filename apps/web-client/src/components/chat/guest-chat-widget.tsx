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
    const socketUrl = import.meta.env.VITE_API_URL || '';
    
    const newSocket = io(`${socketUrl}/chat`, {
      transports: ['websocket'],
      path: '/socket.io/',
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
    <div className="fixed bottom-6 left-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[480px] bg-white dark:bg-mango-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-mango-navy-900 dark:bg-mango-navy-950 p-4 text-white flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2.5 text-left">
              <div className="relative">
                <MessageCircle className="h-5 w-5 text-mango-accent" />
                <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'} border border-mango-navy-900`} />
              </div>
              <div>
                <div className="font-bold text-sm tracking-wide">Hỗ trợ trực tuyến</div>
                <div className="text-[10px] text-white/60">
                  {isConnected ? 'Lễ tân đang trực tuyến' : 'Đang kết nối...'}
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white rounded-full flex items-center justify-center transition-colors" 
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-mango-navy-950/40">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 dark:text-white/40 px-4">
                <MessageCircle className="h-8 w-8 text-slate-300 dark:text-white/20 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-white/70">Bắt đầu cuộc trò chuyện</p>
                <p className="mt-1">Xin chào! Lễ tân Mango Hotel luôn sẵn sàng hỗ trợ bạn. Vui lòng gửi tin nhắn để bắt đầu.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isGuest = msg.senderRole === 'GUEST';
                return (
                  <div key={idx} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                      isGuest 
                        ? 'bg-mango-accent text-mango-navy-950 font-semibold rounded-tr-sm' 
                        : 'bg-white dark:bg-mango-navy-800 text-slate-800 dark:text-white border border-slate-100 dark:border-white/5 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form */}
          <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 dark:border-white/10 flex gap-2 bg-white dark:bg-mango-navy-900">
            <input 
              placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."} 
              value={inputText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
              className="rounded-full flex-1 px-4 py-2 bg-slate-100 dark:bg-mango-navy-950 text-slate-850 dark:text-white border border-slate-200 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-mango-accent placeholder:text-slate-400 dark:placeholder:text-white/30"
              disabled={!isConnected}
            />
            <button 
              type="submit" 
              className="rounded-full shrink-0 h-9 w-9 bg-mango-accent text-mango-navy-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50" 
              disabled={!isConnected || !inputText.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 bg-mango-accent text-mango-navy-950 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 hidden' : 'scale-100 opacity-100'}`}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    </div>
  );
}
