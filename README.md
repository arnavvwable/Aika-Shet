# WALKIE — Retro 80s Walkie Talkie App
**Theme: Amber + Black (Walkman-inspired)**

## Project Structure
```
walkie-talkie-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              # Entry point
    ├── App.jsx               # Root + navigation
    ├── theme.css             # Global CSS tokens & variables
    ├── components/
    │   └── UI.jsx            # Reusable UI components
    └── screens/
        ├── LoginScreen.jsx   # Auth screen
        ├── HomeScreen.jsx    # Channels list
        ├── ChannelScreen.jsx # PTT transmit screen
        └── MembersScreen.jsx # Crew / members list
```

## Setup & Run
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Tech Stack (all free)
- **React 18** — UI framework
- **Vite** — dev server & bundler
- **Socket.io-client** — real-time audio relay (connect to your Node.js server)
- **Firebase** — authentication

## Next Steps: Backend
```bash
mkdir server && cd server
npm init -y
npm install express socket.io cors firebase-admin
```

Create `server/index.js`:
```js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomCode) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = new Set();
    rooms[roomCode].add(socket.id);
    io.to(roomCode).emit('user-joined', { id: socket.id, count: rooms[roomCode].size });
  });

  socket.on('ptt-start', ({ roomCode }) => {
    socket.to(roomCode).emit('ptt-start', { id: socket.id });
  });

  socket.on('audio-chunk', ({ roomCode, chunk }) => {
    socket.to(roomCode).emit('audio-chunk', { id: socket.id, chunk });
  });

  socket.on('ptt-stop', ({ roomCode }) => {
    socket.to(roomCode).emit('ptt-stop', { id: socket.id });
  });

  socket.on('disconnect', () => {
    Object.values(rooms).forEach(r => r.delete(socket.id));
  });
});

server.listen(3001, () => console.log('Server on :3001'));
```

## Deploy (free)
- **Frontend** → Vercel: `vercel deploy`
- **Backend**  → Render.com: connect GitHub repo, set start command to `node server/index.js`

## Color Tokens
| Token          | Value     | Use                  |
|----------------|-----------|----------------------|
| `--amber`      | `#f59e0b` | Primary accent       |
| `--amber2`     | `#fbbf24` | Titles, highlights   |
| `--amber-dim`  | `#92400e` | Muted labels         |
| `--bg0`        | `#0e0b07` | Deepest background   |
| `--bg1`        | `#161009` | Screen background    |
| `--txt-mid`    | `#d97706` | Secondary text       |
