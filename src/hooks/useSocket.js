import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function useSocket({
  roomCode, userId, userName, callsign,
  onUsersUpdate, onPTTChange
}) {
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  
  const [remoteStreams, setRemoteStreams] = useState({});

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // 1. Get Local Media (mic)
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        // Start muted for PTT
        stream.getAudioTracks().forEach(t => t.enabled = false);
        localStreamRef.current = stream;
        // 2. Join Room ONLY after mic is ready
        socket.emit('join-room', { roomCode, userId, userName, callsign });
      })
      .catch(err => {
        console.error("WebRTC Mic access error:", err);
        socket.emit('join-room', { roomCode, userId, userName, callsign });
      });

    const createPeerConnection = (targetSocketId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc-ice-candidate', { targetSocketId, candidate: e.candidate, roomCode });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: event.streams[0] }));
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      return pc;
    };

    // --- Signaling Events ---
    socket.on('user-joined', async ({ socketId }) => {
      if (socketId === socket.id) return;
      const pc = createPeerConnection(socketId);
      peersRef.current[socketId] = pc;
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { targetSocketId: socketId, offer, roomCode });
    });

    socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      const pc = createPeerConnection(senderSocketId);
      peersRef.current[senderSocketId] = pc;
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer, roomCode });
    });

    socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      const pc = peersRef.current[senderSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice-candidate', ({ senderSocketId, candidate }) => {
      const pc = peersRef.current[senderSocketId];
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
    });

    socket.on('user-left', ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    socket.on('room-users', (users) => {
      if (onUsersUpdate) onUsersUpdate(users);
    });
    socket.on('ptt-start', ({ userName: uName }) => {
      if (onPTTChange) onPTTChange(uName, true);
    });
    socket.on('ptt-stop', () => {
      if (onPTTChange) onPTTChange(null, false);
    });

    return () => {
      socket.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, [roomCode, userId, userName]); // Exclude function refs to prevent re-renders

  return {
    remoteStreams,
    startPTT: () => {
      socketRef.current?.emit('ptt-start', { roomCode, userId, userName, callsign });
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
      }
    },
    stopPTT: () => {
      socketRef.current?.emit('ptt-stop', { roomCode, userId });
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
      }
    }
  };
}
