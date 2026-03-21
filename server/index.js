require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSockets = require('./socket');
const { rooms } = require('./rooms');

const app = express();
app.use(cors({ origin: '*' }));
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
  cors: { origin: '*' },
  maxHttpBufferSize: 1e7
});

setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
