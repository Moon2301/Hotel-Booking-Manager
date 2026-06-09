'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    let active = true;
    let socketInstance: Socket | null = null;

    async function initSocket() {
      try {
        const res = await fetch('/api/auth/token');
        if (!res.ok) return;
        const data = await res.json();
        const token = data.token;
        if (!token || !active) return;

        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        
        socketInstance = io(`${socketUrl}/chat`, {
          auth: { token },
          transports: ['websocket'],
          path: '/socket.io/',
        });

        socketInstance.on('connect', () => {
          if (active) setIsConnected(true);
        });
        socketInstance.on('disconnect', () => {
          if (active) setIsConnected(false);
        });

        if (active) setSocket(socketInstance);
      } catch (err) {
        console.error('Failed to connect socket:', err);
      }
    }

    initSocket();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

