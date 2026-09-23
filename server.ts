import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';

interface RoomData {
  code: string;
  senderSocketId: string;
  receiverSocketId?: string;
  fileMeta?: {
    name: string;
    size: number;
    type: string;
    fileCount?: number;
    files?: { name: string; size: number; type: string }[];
  };
  createdAt: number;
  expiresAt: number;
}

const PORT = Number(process.env.PORT) || 3000;
const ROOM_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes validity

const rooms = new Map<string, RoomData>();
const socketToRoomMap = new Map<string, { code: string; role: 'sender' | 'receiver' }>();

// Generate unique 6-digit code (e.g. 100000 - 999999)
function generateUniqueCode(): string {
  let attempts = 0;
  while (attempts < 100) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = rooms.get(code);
    if (!existing || Date.now() > existing.expiresAt) {
      return code;
    }
    attempts++;
  }
  // Fallback if full
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Cleanup expired rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now > room.expiresAt) {
      rooms.delete(code);
      socketToRoomMap.delete(room.senderSocketId);
      if (room.receiverSocketId) {
        socketToRoomMap.delete(room.receiverSocketId);
      }
    }
  }
}, 60 * 1000);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Socket.IO Setup
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e6, // Signaling messages are tiny
  });

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.trim();
    const room = rooms.get(code);
    if (!room || Date.now() > room.expiresAt) {
      return res.status(404).json({ exists: false, message: 'Transfer code not found or expired' });
    }
    res.json({
      exists: true,
      code: room.code,
      hasReceiver: !!room.receiverSocketId,
      fileMeta: room.fileMeta,
      expiresIn: Math.max(0, Math.floor((room.expiresAt - Date.now()) / 1000)),
    });
  });

  // Socket.IO Signaling Logic
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Sender: Create Room
    socket.on('create-room', (data: { fileMeta?: RoomData['fileMeta'] }, callback) => {
      try {
        const code = generateUniqueCode();
        const now = Date.now();
        const room: RoomData = {
          code,
          senderSocketId: socket.id,
          fileMeta: data?.fileMeta,
          createdAt: now,
          expiresAt: now + ROOM_EXPIRY_MS,
        };

        rooms.set(code, room);
        socketToRoomMap.set(socket.id, { code, role: 'sender' });
        socket.join(`room-${code}`);

        console.log(`[Room Created] Code: ${code}, Sender: ${socket.id}`);

        if (typeof callback === 'function') {
          callback({
            success: true,
            code,
            expiresAt: room.expiresAt,
          });
        }
      } catch (err: unknown) {
        console.error('[Create Room Error]', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to create room' });
        }
      }
    });

    // Receiver: Validate Code
    socket.on('validate-code', (data: { code: string }, callback) => {
      const code = data?.code?.trim();
      if (!/^\d{6}$/.test(code || '')) {
        return callback?.({ valid: false, error: 'Please enter a valid 6-digit transfer code.' });
      }
      const room = rooms.get(code);
      if (!room || Date.now() > room.expiresAt) {
        return callback?.({
          valid: false,
          error: 'Transfer code does not exist or has expired.',
        });
      }
      if (room.receiverSocketId && room.receiverSocketId !== socket.id) {
        return callback?.({
          valid: false,
          error: 'This transfer session is already in progress with another receiver.',
        });
      }
      callback?.({
        valid: true,
        fileMeta: room.fileMeta,
        expiresIn: Math.max(0, Math.floor((room.expiresAt - Date.now()) / 1000)),
      });
    });

    // Receiver: Join Room
    socket.on('join-room', (data: { code: string }, callback) => {
      try {
        const code = data?.code?.trim();
        if (!/^\d{6}$/.test(code || '')) {
          return callback?.({ success: false, error: 'Invalid 6-digit transfer code.' });
        }
        const room = rooms.get(code);

        if (!room || Date.now() > room.expiresAt) {
          return callback?.({
            success: false,
            error: 'Invalid or expired 6-digit transfer code.',
          });
        }

        if (room.receiverSocketId && room.receiverSocketId !== socket.id) {
          return callback?.({
            success: false,
            error: 'Another receiver is already connected to this transfer.',
          });
        }

        room.receiverSocketId = socket.id;
        socketToRoomMap.set(socket.id, { code, role: 'receiver' });
        socket.join(`room-${code}`);

        console.log(`[Receiver Joined] Code: ${code}, Receiver: ${socket.id}`);

        // Notify sender that receiver has arrived
        socket.to(`room-${code}`).emit('receiver-joined', {
          receiverId: socket.id,
        });

        callback?.({
          success: true,
          code,
          fileMeta: room.fileMeta,
        });
      } catch (err: unknown) {
        console.error('[Join Room Error]', err);
        callback?.({ success: false, error: err instanceof Error ? err.message : 'Failed to join room' });
      }
    });

    // WebRTC Signaling: Offer (Sender -> Receiver)
    socket.on('offer', (data: { code: string; offer: RTCSessionDescriptionInit }) => {
      const code = data?.code;
      const room = rooms.get(code);
      if (!/^\d{6}$/.test(code || '') || !room || room.expiresAt <= Date.now() || room.senderSocketId !== socket.id || !data?.offer?.type || !data.offer.sdp || !room.receiverSocketId) return;
      const { offer } = data;
      socket.to(`room-${code}`).emit('offer', { offer, senderId: socket.id });
    });

    // WebRTC Signaling: Answer (Receiver -> Sender)
    socket.on('answer', (data: { code: string; answer: RTCSessionDescriptionInit }) => {
      const code = data?.code;
      const room = rooms.get(code);
      if (!/^\d{6}$/.test(code || '') || !room || room.expiresAt <= Date.now() || room.receiverSocketId !== socket.id || !data?.answer?.type || !data.answer.sdp) return;
      const { answer } = data;
      socket.to(`room-${code}`).emit('answer', { answer, receiverId: socket.id });
    });

    // WebRTC Signaling: ICE Candidate (Bidirectional)
    socket.on('ice-candidate', (data: { code: string; candidate: RTCIceCandidateInit }) => {
      const code = data?.code;
      const room = rooms.get(code);
      if (!/^\d{6}$/.test(code || '') || !room || room.expiresAt <= Date.now() || (room.senderSocketId !== socket.id && room.receiverSocketId !== socket.id) || !data?.candidate) return;
      const { candidate } = data;
      socket.to(`room-${code}`).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Cancel / Abort Transfer
    socket.on('cancel-transfer', (data: { code: string; reason?: string }) => {
      const code = data?.code;
      const room = rooms.get(code);
      if (!/^\d{6}$/.test(code || '') || !room || (room.senderSocketId !== socket.id && room.receiverSocketId !== socket.id)) return;
      const { reason } = data;
      socket.to(`room-${code}`).emit('peer-cancelled', {
        reason: reason || 'Transfer cancelled by peer',
      });
      // Cleanup room
      if (rooms.has(code)) {
        const room = rooms.get(code)!;
        socketToRoomMap.delete(room.senderSocketId);
        if (room.receiverSocketId) socketToRoomMap.delete(room.receiverSocketId);
        rooms.delete(code);
      }
    });

    // Transfer completed notification (for cleanup)
    socket.on('transfer-done', (data: { code: string }) => {
      const code = data?.code;
      const room = rooms.get(code);
      if (!/^\d{6}$/.test(code || '') || !room || room.senderSocketId !== socket.id) return;
      if (rooms.has(code)) {
        const room = rooms.get(code)!;
        socketToRoomMap.delete(room.senderSocketId);
        if (room.receiverSocketId) socketToRoomMap.delete(room.receiverSocketId);
        rooms.delete(code);
      }
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] ID: ${socket.id}, Reason: ${reason}`);
      const mapping = socketToRoomMap.get(socket.id);
      if (mapping) {
        const { code, role } = mapping;
        const room = rooms.get(code);
        if (room) {
          socket.to(`room-${code}`).emit('peer-disconnected', {
            role,
            message: `${role === 'sender' ? 'Sender' : 'Receiver'} disconnected.`,
          });
          if (role === 'sender') {
            // If sender leaves, close room
            rooms.delete(code);
            if (room.receiverSocketId) socketToRoomMap.delete(room.receiverSocketId);
          } else if (role === 'receiver') {
            // Receiver left, sender can await another or close
            room.receiverSocketId = undefined;
          }
        }
        socketToRoomMap.delete(socket.id);
      }
    });
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] TransferX server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
