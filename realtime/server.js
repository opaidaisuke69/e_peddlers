const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Client subscribes to role and user channels
  socket.on('subscribe', (data) => {
    if (data.role) {
      const roleRoom = `role:${data.role.toLowerCase()}`;
      socket.join(roleRoom);
      console.log(`[Socket.IO] Socket ${socket.id} joined ${roleRoom}`);
    }
    if (data.user_id) {
      const userRoom = `user:${data.user_id}`;
      socket.join(userRoom);
      console.log(`[Socket.IO] Socket ${socket.id} joined ${userRoom}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// HTTP endpoint for PHP Backend to trigger real-time broadcasts
app.post('/api/broadcast', (req, res) => {
  const { event, target_role, target_user_id, payload, timestamp } = req.body;

  if (!event || !payload) {
    return res.status(400).json({ error: 'event and payload are required' });
  }

  const broadcastData = {
    ...payload,
    timestamp: timestamp || new Date().toISOString()
  };

  if (target_user_id) {
    io.to(`user:${target_user_id}`).emit(event, broadcastData);
    console.log(`[Broadcast] Event '${event}' sent to user:${target_user_id}`);
  } else if (target_role) {
    io.to(`role:${target_role.toLowerCase()}`).emit(event, broadcastData);
    console.log(`[Broadcast] Event '${event}' sent to role:${target_role.toLowerCase()}`);
  } else {
    io.emit(event, broadcastData);
    console.log(`[Broadcast] Event '${event}' broadcasted to ALL clients`);
  }

  res.json({ success: true, delivered: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'e-Peddlers Realtime Socket.IO', connections: io.engine.clientsCount });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[e-Peddlers Realtime] Socket.IO server running on port ${PORT}`);
});
