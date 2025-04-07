import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextRequest } from 'next/server';

// Socket.io server instance (to be initialized once)
let io: ServerIO | null = null;

// Get or initialize socket.io server
export function getSocketIO(req: NextRequest) {
  if (io) {
    return io;
  }
  
  // Create a new Socket.io server if one doesn't exist
  const server = new NetServer();
  io = new ServerIO(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  
  // Set up event handlers
  setupSocketHandlers(io);
  
  return io;
}

// Set up socket event handlers
function setupSocketHandlers(io: ServerIO) {
  // Team chat rooms
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-team', (teamId: string) => {
      socket.join(`team-${teamId}`);
      console.log(`Client ${socket.id} joined team ${teamId}`);
    });

    socket.on('leave-team', (teamId: string) => {
      socket.leave(`team-${teamId}`);
      console.log(`Client ${socket.id} left team ${teamId}`);
    });

    socket.on('team-message', (data: { teamId: string; message: any }) => {
      io.to(`team-${data.teamId}`).emit('new-message', data.message);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
} 