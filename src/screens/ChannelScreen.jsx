import React, { useState, useEffect, useRef } from 'react';
import { Screen, StatusBar, ScreenBody, TapeStrip, BottomNav } from '../components/UI';
import useSocket from '../hooks/useSocket';

const AudioStreamPlayer = ({ stream }) => {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

const VUMeter = ({ active }) => {
  const bars = [
    { h: 22, color: '#f59e0b' }, { h: 28, color: '#f59e0b' }, { h: 18, color: '#f59e0b' },
    { h: 30, color: '#fbbf24' }, { h: 24, color: '#fbbf24' }, { h: 16, color: '#fbbf24' },
    { h: 26, color: '#d97706' }, { h: 20, color: '#b45309' }, { h: 14, color: '#92400e' }
  ];
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 30, width: 150, margin: '0 auto 6px' }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '2px 2px 0 0', background: b.color,
          height: active ? b.h : 4, transition: `height ${0.1 + i * 0.03}s ease-in-out`,
          animation: active ? `vu-pulse-${i} ${0.4 + i * 0.05}s ease-in-out infinite alternate` : 'none',
        }} />
      ))}
      <style>{bars.map((b, i) => `@keyframes vu-pulse-${i} { from { height: 4px; } to { height: ${b.h}px; } }`).join('')}</style>
    </div>
  );
};

export default function ChannelScreen({ channel, user, onNavigate, activeNav }) {
  const [transmitting, setTransmitting] = useState(false);
  const [speaker, setSpeaker] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  
  const { startPTT, stopPTT, remoteStreams } = useSocket({
    roomCode: channel?.id,
    userId: user?.id,
    userName: user?.user_metadata?.username || user?.email || user?.name,
    onUsersUpdate: setRoomUsers,
    onPTTChange: (name, talking) => setSpeaker(talking ? name : null)
  });

  const handlePTTDown = async (e) => {
    if (e) e.preventDefault();
    setTransmitting(true);
    startPTT();
  };

  const handlePTTUp = () => {
    setTransmitting(false);
    stopPTT();
  };

  // Removed syncing logic for old pipeline

  const ch = channel || { name: 'UNKNOWN', code: '??' };
  const receiving = !!speaker;
  const onlineCount = roomUsers.length || 1;

  return (
    <Screen>
      <StatusBar
        left={transmitting ? 'TX:LIVE' : receiving ? 'RX:LIVE' : 'TX:READY'}
        center={`CH:${ch.name?.split(' ')[1] || ch.name}`}
        right="SIG:●●●"
      />
      <ScreenBody style={{ padding: 12 }}>
        {Object.entries(remoteStreams || {}).map(([socketId, stream]) => (
          <AudioStreamPlayer key={socketId} stream={stream} />
        ))}

        <button 
          onClick={() => onNavigate('home')}
          style={{
            background: 'transparent', border: '1px solid #3d2a0a', borderRadius: 'var(--radius)',
            color: 'var(--amber-dim)', padding: '6px 10px', fontSize: 9, fontFamily: 'var(--font-mono)',
            letterSpacing: '1px', cursor: 'pointer', marginBottom: 12, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 0 }}>‹</span> LEAVE CHANNEL
        </button>

        <div style={{
          background: 'var(--bg0)', border: '1px solid #2a1d08',
          borderRadius: 6, padding: '8px 12px', marginBottom: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--amber2)', letterSpacing: '1px' }}>
              {ch.name}
            </div>
            <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              CODE: {ch.code}
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--amber)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
            {onlineCount} LIVE
          </div>
        </div>

        <div style={{
          background: 'var(--bg0)', border: '1px solid #3d2a0a',
          borderRadius: 6, padding: '8px 12px', textAlign: 'center', marginBottom: 10,
        }}>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>TRANSMIT FREQ</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--amber2)', letterSpacing: '3px' }}>146.520</div>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>MHz</div>
        </div>

        <VUMeter active={transmitting || receiving} />

        <div style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', textAlign: 'center',
          marginBottom: 14, height: 14, letterSpacing: '1px',
          color: (transmitting || receiving) ? 'var(--amber2)' : 'var(--amber-dim)',
          transition: 'color .2s',
        }}>
          {transmitting ? '// TRANSMITTING //' : receiving ? `// RECEIVING: ${speaker} //` : '// CHANNEL CLEAR //'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <div style={{
            width: 124, height: 124, borderRadius: 62,
            border: `2px solid ${transmitting ? 'var(--amber)' : 'rgba(245,158,11,0.18)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 10, transition: 'border-color .2s',
          }}>
            <button
              onMouseDown={handlePTTDown}
              onMouseUp={handlePTTUp}
              onMouseLeave={handlePTTUp}
              onTouchStart={handlePTTDown}
              onTouchEnd={handlePTTUp}
              style={{
                width: 104, height: 104, borderRadius: 52,
                border: `2.5px solid ${transmitting ? 'var(--amber2)' : 'var(--amber)'}`,
                background: transmitting ? 'var(--amber)' : 'var(--bg0)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all .12s', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke={transmitting ? 'var(--bg0)' : 'var(--amber)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke .12s' }}>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-display)', color: transmitting ? 'var(--bg0)' : 'var(--amber)',
                letterSpacing: '2px', transition: 'color .12s',
              }}>{transmitting ? 'TX...' : 'PTT'}</span>
            </button>
          </div>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
            {transmitting ? 'RELEASE TO STOP' : 'HOLD TO TRANSMIT'}
          </div>
        </div>

        <TapeStrip style={{ marginTop: 'auto', opacity: 0.2 }} />
      </ScreenBody>
      <BottomNav items={[
        { icon: '⌂', label: 'HOME', active: activeNav === 'home', onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK', active: activeNav === 'talk', onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW', active: activeNav === 'crew', onClick: () => onNavigate('crew') },
      ]} />
    </Screen>
  );
}
