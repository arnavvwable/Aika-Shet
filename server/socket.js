const { joinRoom, leaveRoom, setUserStatus, getRoomUsers } = require('./rooms');

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    
    // 1. join-room
    socket.on('join-room', async ({ roomCode, userId, userName, callsign }) => {
      if (!roomCode || !userId) return;
      socket.join(roomCode);
      socket.currentRoom = roomCode;
      socket.userId = userId;
      socket.userName = userName;
      socket.callsign = callsign;
      
      await joinRoom(roomCode, { userId, userName, callsign });
      const users = getRoomUsers(roomCode);
      io.to(roomCode).emit('room-users', users);

      // Notify others to establish WebRTC Mesh
      socket.to(roomCode).emit('user-joined', { socketId: socket.id, userId, userName });
    });

    // 2. ptt-start
    socket.on('ptt-start', async ({ roomCode, userId, userName, callsign }) => {
      if (!roomCode || !userId) return;
      await setUserStatus(roomCode, userId, 'tx');
      const users = getRoomUsers(roomCode);
      io.to(roomCode).emit('room-users', users);
      socket.to(roomCode).emit('ptt-start', { id: socket.id, userId, userName, callsign });
    });

    // 3. ptt-stop
    socket.on('ptt-stop', async ({ roomCode, userId }) => {
      if (!roomCode || !userId) return;
      await setUserStatus(roomCode, userId, 'rx');
      const users = getRoomUsers(roomCode);
      io.to(roomCode).emit('room-users', users);
      socket.to(roomCode).emit('ptt-stop', { userName: socket.userName });
    });

    // --- WEBRTC SIGNALING RELAYS ---
    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer });
    });
    
    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer });
    });
    
    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate });
    });

    // 4. disconnect
    socket.on('disconnect', async () => {
      if (socket.currentRoom && socket.userId) {
        await leaveRoom(socket.currentRoom, socket.userId);
        const users = getRoomUsers(socket.currentRoom);
        io.to(socket.currentRoom).emit('room-users', users);
        // Let peers know to destroy the RTCPeerConnection
        socket.to(socket.currentRoom).emit('user-left', { socketId: socket.id });
      }
    });
  });
};
