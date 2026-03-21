import { io } from 'socket.io-client';

// In production, this should point to your backend deployed URL (e.g. Render.com)
// In development, it points to the local node server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false // We will connect manually once authenticated/ready
});
