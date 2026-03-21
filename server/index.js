if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSockets = require('./socket');
const { rooms } = require('./rooms');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://walkie-app.vercel.app'
  ]
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ONLINE' }));

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(RENDER_URL + '/health').catch(() => {});
  }, 14 * 60 * 1000);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://walkie-app.vercel.app'
    ],
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7
});

setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  if (process.env.SUPABASE_URL) console.log('SUPABASE_URL: LOADED');
  if (process.env.SUPABASE_SERVICE_KEY) console.log('SUPABASE_SERVICE_KEY: LOADED');
  console.log('WALKIE SERVER ONLINE');
  console.log(`Backend server running on port ${PORT}`);
});
