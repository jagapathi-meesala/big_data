import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (
  eventName: string,
  callback: (data: any) => void,
  room?: string
) => {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    try {
      const socket = io('/', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (room) {
          socket.emit('join_incident_room', room);
        }
      });

      socket.on(eventName, (data: any) => {
        if (callbackRef.current) {
          callbackRef.current(data);
        }
      });

      return () => {
        socket.off(eventName);
        socket.disconnect();
      };
    } catch (e) {
      console.warn('Socket connection warning:', e);
    }
  }, [eventName, room]);

  const emit = (name: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(name, data);
    }
  };

  return { emit };
};

export default useSocket;
