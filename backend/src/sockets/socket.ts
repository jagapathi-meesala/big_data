import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { redisClient } from '../config/redis';

export const initSockets = async (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Duplicate Redis client specifically for subscription tasks
  const subClient = redisClient.duplicate();
  
  try {
    await subClient.connect();
    console.log('Redis subscriber client connected successfully.');
  } catch (error) {
    console.error('Failed to connect Redis subscriber client:', error);
  }

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_incident_room', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      console.log(`Socket ${socket.id} joined incident room: incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Subscribing to coordinate move alerts
  try {
    await subClient.subscribe('resource:moves', (message: string) => {
      try {
        const data = JSON.parse(message);
        // Emitting resource moves live to all map clients
        io.emit('resource_location_update', data);
      } catch (err) {
        console.error('Failed parsing subscription coordinate update:', err);
      }
    });

    await subClient.subscribe('incident:events', (message: string) => {
      try {
        const data = JSON.parse(message);
        io.emit(data.event, data.incident);
      } catch (err) {
        console.error('Failed parsing subscription incident event:', err);
      }
    });
  } catch (err) {
    console.error('Redis subscription setup failed:', err);
  }

  console.log('Real-time Socket.io and Redis Pub/Sub initialized.');
  return io;
};
export default initSockets;
