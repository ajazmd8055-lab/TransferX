import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    socketId,
  };
}
