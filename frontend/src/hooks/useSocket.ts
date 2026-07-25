import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (
  eventName: string,
  callback: (data: any) => void,
  room?: string
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
      if (room) {
        socket.emit('join_incident_room', room);
      }
    });

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
      socket.disconnect();
    };
  }, [eventName, callback, room]);

  const emit = (name: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(name, data);
    }
  };

  return { emit };
};
export default useSocket;
