import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Fetch TURN credentials from Metered.ca API at runtime
async function fetchTurnCredentials() {
  const apiKey = import.meta.env.VITE_METERED_API_KEY;
  if (!apiKey) {
    console.warn('[WebRTC] No TURN API key — falling back to STUN only');
    return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  }

  try {
    const resp = await fetch(
      `https://aika-shet.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    const iceServers = await resp.json();
    console.log('[WebRTC] Fetched TURN credentials:', iceServers.length, 'servers');
    return { iceServers, iceCandidatePoolSize: 10 };
  } catch (err) {
    console.error('[WebRTC] Failed to fetch TURN credentials, falling back to STUN:', err);
    return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  }
}

export default function useSocket({
  roomCode, userId, userName, callsign,
  onUsersUpdate, onPTTChange
}) {
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const iceConfigRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function init() {
      // 1. Fetch TURN credentials BEFORE creating any peer connections
      const iceConfig = await fetchTurnCredentials();
      if (cancelled) return;
      iceConfigRef.current = iceConfig;

      // 2. Connect socket
      const socket = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      // 3. Get Local Media (mic)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        // Start muted for PTT
        stream.getAudioTracks().forEach(t => t.enabled = false);
        localStreamRef.current = stream;
      } catch (err) {
        console.error('[WebRTC] Mic access error:', err);
      }

      // 4. Join Room after mic + TURN are ready
      socket.emit('join-room', { roomCode, userId, userName, callsign });

      // --- Peer connection factory ---
      const createPeerConnection = (targetSocketId) => {
        const pc = new RTCPeerConnection(iceConfigRef.current);

        // ICE candidate relay
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('webrtc-ice-candidate', { targetSocketId, candidate: e.candidate, roomCode });
          }
        };

        // Receive remote audio
        pc.ontrack = (event) => {
          console.log('[WebRTC] Got remote track from', targetSocketId);
          setRemoteStreams(prev => ({ ...prev, [targetSocketId]: event.streams[0] }));
        };

        // Connection state monitoring for debugging
        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          console.log(`[WebRTC] ICE state for ${targetSocketId}: ${state}`);
          if (state === 'failed') {
            console.warn('[WebRTC] ICE failed — attempting restart');
            pc.restartIce();
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Connection state for ${targetSocketId}: ${pc.connectionState}`);
        };

        // Add local tracks
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
        console.log('[WebRTC] New peer joined:', socketId);
        const pc = createPeerConnection(socketId);
        peersRef.current[socketId] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetSocketId: socketId, offer, roomCode });
      });

      socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
        console.log('[WebRTC] Received offer from:', senderSocketId);
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
        if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[WebRTC] ICE add error:', e));
      });

      socket.on('user-left', ({ socketId }) => {
        console.log('[WebRTC] Peer left:', socketId);
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

      // --- Room & PTT events ---
      socket.on('room-users', (users) => {
        if (onUsersUpdate) onUsersUpdate(users);
      });
      socket.on('ptt-start', ({ userName: uName }) => {
        if (onPTTChange) onPTTChange(uName, true);
      });
      socket.on('ptt-stop', () => {
        if (onPTTChange) onPTTChange(null, false);
      });
    }

    init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
    };
  }, [roomCode, userId, userName]);

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
