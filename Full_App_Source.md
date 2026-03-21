# Walkie-Talkie Application Source Code

This document contains the complete logic and structure for the Supabase-integrated Walkie-Talkie app.

## src/main.jsx
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

```

## src/App.jsx
```javascript
import React, { useState, useEffect } from 'react';
import './theme.css';
import LoginScreen   from './screens/LoginScreen';
import HomeScreen    from './screens/HomeScreen';
import ChannelScreen from './screens/ChannelScreen';
import MembersScreen from './screens/MembersScreen';

import { supabase } from './lib/supabase';
import { socket } from './lib/socket';

export default function App() {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [screen, setScreen]   = useState('login');
  const [channel, setChannel] = useState(null);
  const [nav, setNav]         = useState('home');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const u = session.user;
        setUser({ uid: u.id, name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'USER', email: u.email });
        socket.auth = { token: session.access_token };
        socket.connect();
        setScreen('home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const u = session.user;
        setUser({ uid: u.id, name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'USER', email: u.email });
        socket.auth = { token: session.access_token };
        socket.connect();
        setScreen('home');
      } else {
        setUser(null);
        socket.disconnect();
        setScreen('login');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleSelectChannel = (ch) => {
    setChannel(ch);
    setScreen('channel');
    setNav('talk');
    
    // Join Socket Room
    socket.emit('join-room', { channelCode: ch.code, user });
  };

  const handleNavigate = (dest) => {
    if (dest === 'talk') {
      if (!channel) return alert('SYS: PLEASE SELECT A CHANNEL FIRST');
      setNav(dest);
      setScreen('channel');
    } else if (dest === 'crew') {
      if (!channel) return alert('SYS: PLEASE SELECT A CHANNEL FIRST');
      setNav(dest);
      setScreen('crew');
    } else if (dest === 'home') {
      setNav('home');
      setScreen('home');
    }
  };

  return (
    <div style={{
      maxWidth: 390,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg0)',
    }}>
      {screen === 'login' && (
        <LoginScreen />
      )}
      {screen === 'home' && (
        <HomeScreen
          user={user}
          onSelectChannel={handleSelectChannel}
          onNavigate={handleNavigate}
          activeNav={nav}
        />
      )}
      {screen === 'channel' && channel && (
        <ChannelScreen
          channel={channel}
          onNavigate={handleNavigate}
          activeNav={nav}
        />
      )}
      {screen === 'crew' && channel && (
        <MembersScreen
          channel={channel}
          onNavigate={handleNavigate}
          activeNav={nav}
        />
      )}
    </div>
  );
}

```

## src/screens/LoginScreen.jsx
```javascript
import React, { useState, useEffect } from 'react';
import {
  Screen, StatusBar, ScreenBody,
  TapeStrip, SectionLabel, Input, BtnSolid, BtnOutline,
} from '../components/UI';
import { supabase } from '../lib/supabase';

const MicIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
  </svg>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !password) return setError('ENTER CREDENTIALS');
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEmailSignup = async () => {
    if (!email || !password) return setError('ENTER CREDENTIALS');
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setError('EMAIL ALREADY IN USE');
      } else if (data?.session === null) {
          setError('CHECK EMAIL FOR CONFIRMATION');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Screen>
      <StatusBar left="SYS:OK" center="146.52 MHz" right="PWR:100%" />
      <ScreenBody>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0 14px' }}>
          <div style={{
            width: 54, height: 54, borderRadius: 12,
            border: '2px solid var(--amber)', background: 'var(--bg0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MicIcon />
          </div>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--amber2)', letterSpacing: '4px' }}>
              WALKIE
            </div>
            <div style={{ fontSize: 9, color: 'var(--txt-mid)', fontFamily: 'var(--font-mono)', letterSpacing: '1.5px', marginTop: 2 }}>
              OPEN CHANNEL COMM SYSTEM
            </div>
          </div>
        </div>

        <TapeStrip />

        <SectionLabel>AUTHENTICATION</SectionLabel>

        {error && <div style={{ color: '#ef4444', fontSize: 10, marginBottom: 8, letterSpacing: '0.5px' }}>ERR: {error}</div>}

        <Input
          type="email"
          placeholder="USER_ID@domain.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="PASSWORD ••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: 4 }}
        />

        <BtnSolid onClick={handleEmailLogin} style={{ marginTop: 6 }} disabled={loading}>
          {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
        </BtnSolid>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: '#3d2a0a', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: 1, background: '#2a1d08' }} />
          OR
          <div style={{ flex: 1, height: 1, background: '#2a1d08' }} />
        </div>

        <BtnOutline onClick={handleGoogleLogin} disabled={loading}>SIGN IN WITH GOOGLE</BtnOutline>
        <BtnOutline onClick={handleEmailSignup} disabled={loading}>CREATE ACCOUNT</BtnOutline>

        <TapeStrip style={{ marginTop: 'auto' }} />
        <div style={{ textAlign: 'center', fontSize: 9, color: '#3d2a0a', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          SECURED · SUPABASE AUTH · v2.0
        </div>
      </ScreenBody>
    </Screen>
  );
}

```

## src/screens/HomeScreen.jsx
```javascript
import React, { useState, useEffect } from 'react';
import {
  Screen, StatusBar, ScreenBody, FreqDisplay,
  SectionLabel, PageTitle, Input, BtnOutline, Badge, BottomNav,
} from '../components/UI';

import { supabase } from '../lib/supabase';

export default function HomeScreen({ user, onSelectChannel, onNavigate, activeNav }) {
  const [code, setCode] = useState('');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChannels() {
      const { data, error } = await supabase.from('channels').select('*');
      if (data) {
        setChannels(data.map(ch => ({
          ...ch,
          units: ch.max_members || 10,
          online: 0,
          status: 'idle',
          badge: '● STANDBY',
          badgeType: 'idle'
        })));
      }
      setLoading(false);
    }
    fetchChannels();
  }, []);

  const handleJoin = async () => {
    if (code.trim()) {
      const channelCode = code.toUpperCase();
      // Ensure the channel exists in DB
      const { data } = await supabase.from('channels').select('*').eq('code', channelCode).single();
      if (data) {
        onSelectChannel(data);
      } else {
        alert('Channel code not found in database.');
      }
    }
  };

  const handleNewChannel = async () => {
    const name = prompt('Enter Channel Name: (e.g. DELTA SQUAD)');
    const newCode = prompt('Enter Channel Code: (e.g. DELTA)');
    if (name && newCode) {
      const { data, error } = await supabase.from('channels').insert({
        name,
        code: newCode.toUpperCase(),
        max_members: 10,
        created_by: user.uid || user.id
      }).select();
      
      if (data && data[0]) {
        setChannels([...channels, {
          ...data[0],
          units: 10,
          online: 0,
          status: 'idle',
          badge: '● STANDBY',
          badgeType: 'idle'
        }]);
      } else if (error) {
        alert('Error creating channel: ' + error.message);
      }
    }
  };

  return (
    <Screen>
      <StatusBar left={`USER:${user?.name?.toUpperCase() || 'UNKNOWN'}`} center={`CH:${channels.length}`} right="SIG:●●●" />
      <ScreenBody>

        <PageTitle title="CHANNELS" sub="SELECT FREQUENCY" />

        <FreqDisplay freq="146.52" label="MHz · FM BAND" />

        <SectionLabel>JOIN BY CODE</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <Input
            placeholder="ENTER CODE..."
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button onClick={handleJoin} style={{
            padding: '9px 14px', borderRadius: 'var(--radius)',
            border: 'none', background: 'var(--amber)', color: 'var(--bg0)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
          }}>JOIN</button>
        </div>

        <SectionLabel>SAVED CHANNELS</SectionLabel>

        {loading ? (
          <div style={{ fontSize: 10, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)' }}>LOADING CHANNELS...</div>
        ) : channels.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--txt-mid)', fontFamily: 'var(--font-mono)' }}>NO CHANNELS SAVED</div>
        ) : channels.map(ch => (
          <div
            key={ch.id}
            onClick={() => onSelectChannel(ch)}
            style={{
              background: 'var(--bg0)', border: '1px solid #2a1d08',
              borderRadius: 6, padding: '10px 12px', marginBottom: 7,
              cursor: 'pointer', transition: 'border-color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a1d08'}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--amber2)', letterSpacing: '1px' }}>
              {ch.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              CODE: {ch.code} · {ch.units} MAX UNITS
            </div>
            <Badge text={ch.badge} type={ch.badgeType} />
          </div>
        ))}

        <BtnOutline style={{ marginTop: 6, fontSize: 10 }} onClick={handleNewChannel}>+ NEW CHANNEL</BtnOutline>

      </ScreenBody>

      <BottomNav items={[
        { icon: '⌂', label: 'HOME',   active: activeNav === 'home',    onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK',   active: activeNav === 'talk',    onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW',   active: activeNav === 'crew',    onClick: () => onNavigate('crew') },
      ]} />
    </Screen>
  );
}

```

## src/screens/ChannelScreen.jsx
```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, StatusBar, ScreenBody, TapeStrip, BottomNav } from '../components/UI';
import { socket } from '../lib/socket';
import { initAudioContext, startRecording, stopRecording, playChunk } from '../lib/audio';

// (VUMeter component remains the same, included directly here for simplicity)
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

export default function ChannelScreen({ channel, onNavigate, activeNav }) {
  const [transmitting, setTransmitting] = useState(false);
  const [receiving, setReceiving] = useState(false); // true when someone else is talking
  const [onlineCount, setOnlineCount] = useState(1);
  const pressRef = useRef(false);

  useEffect(() => {
    // Initial audio context setup (needs to happen after user gesture, but here is okay for now)
    initAudioContext();

    const handleRoomState = (state) => {
      if (state && state.users) setOnlineCount(Object.keys(state.users).length);
    };

    const handleUserJoined = () => setOnlineCount(c => c + 1);
    const handleUserLeft = () => setOnlineCount(c => Math.max(1, c - 1));

    const handlePTTStart = ({ socketId }) => setReceiving(true);
    const handlePTTStop = ({ socketId }) => setReceiving(false);
    
    const handleAudioChunk = async ({ chunk }) => {
      // Decode and play incoming buffer
      if (chunk) {
        setReceiving(true);
        const blob = new Blob([chunk], { type: 'audio/webm;codecs=opus' });
        await playChunk(blob);
      }
    };

    socket.on('room-state', handleRoomState);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('ptt-start', handlePTTStart);
    socket.on('ptt-stop', handlePTTStop);
    socket.on('audio-chunk', handleAudioChunk);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('ptt-start', handlePTTStart);
      socket.off('ptt-stop', handlePTTStop);
      socket.off('audio-chunk', handleAudioChunk);
    };
  }, []);

  const startTX = useCallback(async () => {
    pressRef.current = true;
    initAudioContext(); // Make sure it's resumed on first click
    const hasMic = await startRecording(socket);
    if (hasMic) {
      setTransmitting(true);
      socket.emit('ptt-start');
    }
  }, []);

  const stopTX = useCallback(() => {
    if (pressRef.current) {
      pressRef.current = false;
      setTransmitting(false);
      stopRecording();
      socket.emit('ptt-stop');
    }
  }, []);

  const ch = channel || { name: 'SQUAD ALPHA', code: 'ALPHA7' };

  return (
    <Screen>
      <StatusBar
        left={transmitting ? 'TX:LIVE' : receiving ? 'RX:LIVE' : 'TX:READY'}
        center={`CH:${ch.name?.split(' ')[1] || 'ALPHA'}`}
        right="SIG:●●●"
      />
      <ScreenBody style={{ padding: 12 }}>
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
          {transmitting ? '// TRANSMITTING //' : receiving ? '// RECEIVING //' : '// CHANNEL CLEAR //'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <div style={{
            width: 124, height: 124, borderRadius: 62,
            border: `2px solid ${transmitting ? 'var(--amber)' : 'rgba(245,158,11,0.18)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 10, transition: 'border-color .2s',
          }}>
            <button
              onMouseDown={startTX} onMouseUp={stopTX} onMouseLeave={stopTX}
              onTouchStart={e => { e.preventDefault(); startTX(); }} onTouchEnd={stopTX}
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

```

## src/screens/MembersScreen.jsx
```javascript
import React, { useState, useEffect } from 'react';
import {
  Screen, StatusBar, ScreenBody, PageTitle,
  SectionLabel, BtnOutline, TapeStrip, BottomNav,
} from '../components/UI';

import { socket } from '../lib/socket';

const statusConfig = {
  tx:  { dot: 'var(--amber)', label: 'TX', color: 'var(--amber2)' },
  rx:  { dot: '#4ade80',       label: 'RX', color: '#4ade80' },
  off: { dot: '#44403c',       label: 'OFF', color: '#44403c' },
};

const WaveAnim = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 14 }}>
    {[22, 14, 20, 16, 18].map((h, i) => (
      <div key={i} style={{
        width: 3, borderRadius: '2px 2px 0 0',
        background: 'var(--amber)', height: h,
        animation: `wave-m ${0.4 + i * 0.08}s ease-in-out infinite alternate`,
      }} />
    ))}
    <style>{`
      @keyframes wave-m {
        from { transform: scaleY(0.3); }
        to   { transform: scaleY(1); }
      }
    `}</style>
  </div>
);

export default function MembersScreen({ channel, onNavigate, activeNav }) {
  const ch = channel || { name: 'SQUAD ALPHA', code: 'ALPHA7' };
  
  const [members, setMembers] = React.useState([]);

  React.useEffect(() => {
    const handleRoomState = (state) => {
      if (state && state.users) {
        const usersList = Object.values(state.users).map(u => ({
          id: u.uid || u.socketId,
          socketId: u.socketId,
          initials: u.name ? u.name.substring(0, 2).toUpperCase() : '??',
          name: u.name ? u.name.toUpperCase() : 'UNKNOWN',
          status: u.transmitting ? 'tx' : 'rx',
          avStyle: { background: '#1a0f00', color: 'var(--amber)',  border: '1px solid var(--amber4)' }
        }));
        setMembers(usersList);
      }
    };

    const handleUserJoined = ({ user, socketId }) => {
      setMembers(prev => {
        const filtered = prev.filter(m => m.socketId !== socketId);
        return [...filtered, {
          id: user.uid || socketId,
          socketId,
          initials: user.name ? user.name.substring(0, 2).toUpperCase() : '??',
          name: user.name ? user.name.toUpperCase() : 'UNKNOWN',
          status: 'rx',
          avStyle: { background: '#0d1a1a', color: '#2dd4bf', border: '1px solid #0f766e' } // Alternate style for others
        }];
      });
    };

    const handleUserLeft = ({ socketId }) => {
      setMembers(prev => prev.filter(m => m.socketId !== socketId));
    };

    const handlePTTStart = ({ socketId }) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, status: 'tx' } : m));
    };

    const handlePTTStop = ({ socketId }) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, status: 'rx' } : m));
    };

    socket.on('room-state', handleRoomState);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('ptt-start', handlePTTStart);
    socket.on('ptt-stop', handlePTTStop);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('ptt-start', handlePTTStart);
      socket.off('ptt-stop', handlePTTStop);
    };
  }, []);

  const transmitting = members.filter(m => m.status === 'tx');
  const online       = members.filter(m => m.status === 'rx');
  const offline      = []; // No offline tracking in live socket mode without Supabase query

  const MemberRow = ({ member, dimmed }) => {
    const cfg = statusConfig[member.status];
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 5,
        border: `1px solid ${member.status === 'tx' ? 'var(--amber4)' : '#2a1d08'}`,
        background: 'var(--bg0)', marginBottom: 6,
        opacity: dimmed ? 0.4 : 1,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
          flexShrink: 0, ...member.avStyle,
        }}>{member.initials}</div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: cfg.color, flex: 1 }}>
          {member.name}
        </div>

        {member.status === 'tx' ? (
          <WaveAnim />
        ) : (
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: cfg.color, display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            {cfg.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <Screen>
      <StatusBar
        left={`UNITS:${members.length}`}
        center={`LIVE:${transmitting.length + online.length}`}
        right={`TX:${transmitting.length}`}
      />
      <ScreenBody>

        <PageTitle title="CREW" sub={`${ch.name} · ${ch.code}`} />
        <TapeStrip />

        {transmitting.length > 0 && (
          <>
            <SectionLabel style={{ marginTop: 4 }}>TRANSMITTING</SectionLabel>
            {transmitting.map(m => <MemberRow key={m.id} member={m} />)}
          </>
        )}

        {online.length > 0 && (
          <>
            <SectionLabel style={{ marginTop: 6 }}>ONLINE</SectionLabel>
            {online.map(m => <MemberRow key={m.id} member={m} />)}
          </>
        )}

        {offline.length > 0 && (
          <>
            <SectionLabel style={{ marginTop: 10 }}>OFFLINE</SectionLabel>
            {offline.map(m => <MemberRow key={m.id} member={m} dimmed />)}
          </>
        )}

        <BtnOutline style={{ marginTop: 12, fontSize: 10 }}>+ INVITE UNIT</BtnOutline>

      </ScreenBody>

      <BottomNav items={[
        { icon: '⌂', label: 'HOME', active: activeNav === 'home', onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK', active: activeNav === 'talk', onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW', active: activeNav === 'crew', onClick: () => onNavigate('crew') },
      ]} />
    </Screen>
  );
}

```

## src/lib/supabase.js
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

```

## src/lib/socket.js
```javascript
import { io } from 'socket.io-client';

// In production, this should point to your backend deployed URL (e.g. Render.com)
// In development, it points to the local node server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false // We will connect manually once authenticated/ready
});

```

## src/lib/audio.js
```javascript
let audioCtx = null;
let mediaRecorder = null;
let stream = null;

// Initialize Audio Context on user interaction (required by browsers)
export function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Start capturing mic and emitting chunks to socket
export async function startRecording(socket) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // We use a small timeslice (e.g. 100ms) for low latency Walkie Talkie feel
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && socket) {
        // Emit raw Blob data
        socket.emit('audio-chunk', e.data);
      }
    };
    mediaRecorder.start(100);
    return true;
  } catch (err) {
    console.error('Mic access denied or error:', err);
    return false;
  }
}

// Stop capturing
export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Play received audio chunks
export async function playChunk(chunkBlob) {
  if (!audioCtx) return;
  
  try {
    const arrayBuffer = await chunkBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (err) {
    console.error('Error decoding/playing audio chunk:', err);
  }
}

```

## src/components/UI.jsx
```javascript
import React from 'react';

const s = {
  sbar: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 14px 5px', fontSize: 10,
    color: 'var(--amber2)', fontFamily: 'var(--font-mono)',
    background: 'var(--bg0)', borderBottom: '1px solid #2a1d08',
    letterSpacing: '0.5px',
  },
  screen: {
    borderRadius: 18, overflow: 'hidden',
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'var(--bg1)', border: '1.5px solid #2a1d08',
    position: 'relative',
  },
  body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16 },
  tape: {
    width: '100%', height: 5,
    background: 'repeating-linear-gradient(90deg, var(--amber) 0, var(--amber) 7px, var(--bg0) 7px, var(--bg0) 11px)',
    borderRadius: 3, opacity: 0.35, margin: '10px 0',
  },
  scanline: {
    position: 'absolute', inset: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,158,11,0.03) 3px, rgba(245,158,11,0.03) 4px)',
    pointerEvents: 'none', zIndex: 5,
  },
  sectionLabel: {
    fontSize: 9, color: 'var(--amber-dim)',
    fontFamily: 'var(--font-mono)', letterSpacing: '2px',
    textTransform: 'uppercase', marginBottom: 6,
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 14,
    fontWeight: 700, color: 'var(--amber2)', letterSpacing: '3px',
  },
  sub: {
    fontSize: 9, color: 'var(--txt-mid)',
    fontFamily: 'var(--font-mono)', letterSpacing: '1.5px', marginTop: 2,
  },
  freqBox: {
    background: 'var(--bg0)', border: '1px solid #3d2a0a',
    borderRadius: 6, padding: '8px 12px', textAlign: 'center', marginBottom: 12,
  },
  freqNum: {
    fontFamily: 'var(--font-display)', fontSize: 20,
    color: 'var(--amber2)', letterSpacing: '4px',
  },
  freqLbl: {
    fontSize: 9, color: 'var(--amber-dim)',
    fontFamily: 'var(--font-mono)', letterSpacing: '2px', marginTop: 1,
  },
};

export const StatusBar = ({ left, center, right }) => (
  <div style={s.sbar}>
    <span>{left}</span><span>{center}</span><span>{right}</span>
  </div>
);

export const Screen = ({ children, style }) => (
  <div style={{ ...s.screen, ...style }}>
    <div style={s.scanline} />
    {children}
  </div>
);

export const ScreenBody = ({ children, style }) => (
  <div style={{ ...s.body, ...style }}>{children}</div>
);

export const TapeStrip = ({ style }) => <div style={{ ...s.tape, ...style }} />;

export const SectionLabel = ({ children, style }) => (
  <div style={{ ...s.sectionLabel, ...style }}>{children}</div>
);

export const PageTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={s.title}>{title}</div>
    {sub && <div style={s.sub}>{sub}</div>}
  </div>
);

export const FreqDisplay = ({ freq, label, style }) => (
  <div style={{ ...s.freqBox, ...style }}>
    <div style={s.freqLbl}>ACTIVE FREQUENCY</div>
    <div style={s.freqNum}>{freq}</div>
    <div style={s.freqLbl}>{label}</div>
  </div>
);

export const Input = ({ style, ...props }) => (
  <input
    style={{
      width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)',
      border: '1px solid #3d2a0a', background: 'var(--bg0)',
      color: 'var(--amber2)', fontSize: 12, fontFamily: 'var(--font-mono)',
      outline: 'none', marginBottom: 8, ...style,
    }}
    {...props}
  />
);

export const BtnSolid = ({ children, onClick, style }) => (
  <button onClick={onClick} style={{
    width: '100%', padding: 10, borderRadius: 'var(--radius)',
    border: 'none', background: 'var(--amber)', color: 'var(--bg0)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-display)', letterSpacing: '1px',
    marginBottom: 8, ...style,
  }}>{children}</button>
);

export const BtnOutline = ({ children, onClick, style }) => (
  <button onClick={onClick} style={{
    width: '100%', padding: 10, borderRadius: 'var(--radius)',
    border: '1px solid #3d2a0a', background: 'transparent',
    color: 'var(--txt-mid)', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginBottom: 8, ...style,
  }}>{children}</button>
);

export const BottomNav = ({ items }) => (
  <div style={{
    display: 'flex', borderTop: '1px solid #2a1d08',
    padding: '7px 0 4px', background: 'var(--bg0)',
  }}>
    {items.map((item, i) => (
      <div key={i} onClick={item.onClick} style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 2, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 16 }}>{item.icon}</span>
        <span style={{
          fontSize: 8, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
          color: item.active ? 'var(--amber)' : '#44403c',
        }}>{item.label}</span>
      </div>
    ))}
  </div>
);

export const Badge = ({ text, type }) => {
  const styles = {
    live: { background: '#1a0f00', color: 'var(--amber)', border: '1px solid var(--amber4)' },
    idle: { background: '#160e00', color: '#b45309', border: '1px solid #78350f' },
    off:  { background: '#111', color: '#44403c', border: '1px solid #292524' },
  };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 3,
      fontSize: 9, fontFamily: 'var(--font-mono)', marginTop: 4,
      ...styles[type],
    }}>{text}</span>
  );
};

```

## server/index.js
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const setupSockets = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // For dev, allow all. Restrict to Vercel URL in prod.
    methods: ['GET', 'POST']
  }
});

// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('WALKIE Backend is running.');
});

// Setup socket event handlers
setupSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

```

## server/socket.js
```javascript
const rooms = require('./rooms');
const { verifyToken } = require('./middleware/auth');

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join room / channel
    socket.on('join-room', async (data) => {
      const token = socket.handshake.auth?.token;
      const user = await verifyToken(token);
      if (!user) return socket.emit('error', 'Unauthorized');
      
      const { channelCode } = data;
      
      // Leave previous rooms
      Array.from(socket.rooms).forEach(r => {
        if (r !== socket.id) socket.leave(r);
      });

      socket.join(channelCode);
      await rooms.addUserToRoom(channelCode, { ...user, socketId: socket.id });

      // Notify others in room
      socket.to(channelCode).emit('user-joined', { user, socketId: socket.id });
      
      // Send current room state to the user
      socket.emit('room-state', rooms.getRoomState(channelCode));
      
      // Store current room on socket for disconnect handling
      socket.currentRoom = channelCode;
      socket.user = user;
      
      console.log(`User joined ${channelCode}:`, user.name);
    });

    // PTT Start
    socket.on('ptt-start', () => {
      if (socket.currentRoom) {
        rooms.setUserTransmitting(socket.currentRoom, socket.id, true);
        socket.to(socket.currentRoom).emit('ptt-start', { socketId: socket.id });
        console.log(`[${socket.currentRoom}] PTT Start: ${socket.id}`);
      }
    });

    // Audio Chunk Relaying
    socket.on('audio-chunk', (chunk) => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('audio-chunk', {
          socketId: socket.id,
          chunk
        });
      }
    });

    // PTT Stop
    socket.on('ptt-stop', () => {
      if (socket.currentRoom) {
        rooms.setUserTransmitting(socket.currentRoom, socket.id, false);
        socket.to(socket.currentRoom).emit('ptt-stop', { socketId: socket.id });
        console.log(`[${socket.currentRoom}] PTT Stop: ${socket.id}`);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (socket.currentRoom) {
        await rooms.removeUserFromRoom(socket.currentRoom, socket.id);
        socket.to(socket.currentRoom).emit('user-left', { socketId: socket.id });
      }
    });
  });
};

```

## server/rooms.js
```javascript
const { supabaseAdmin } = require('./supabase');

const activeRooms = {};

async function getChannelIdFromCode(channelCode) {
  const { data, error } = await supabaseAdmin
    .from('channels')
    .select('id')
    .eq('code', channelCode)
    .single();
  
  if (error || !data) {
    console.error('Channel error finding code:', channelCode, error?.message);
    return null;
  }
  return data.id;
}

function getRoomState(channelCode) {
  if (!activeRooms[channelCode]) {
    activeRooms[channelCode] = { users: {} };
  }
  return activeRooms[channelCode];
}

async function addUserToRoom(channelCode, user) {
  const room = getRoomState(channelCode);
  room.users[user.socketId] = {
    ...user,
    transmitting: false
  };

  // Sync to Supabase
  const channelId = await getChannelIdFromCode(channelCode);
  if (channelId) {
    try {
      // Remove any existing sessions for this user in this channel
      await supabaseAdmin.from('members').delete().match({ user_id: user.uid, channel_id: channelId });
      
      // Insert new online status
      await supabaseAdmin.from('members').insert({
        channel_id: channelId,
        user_id: user.uid,
        user_name: user.name,
        status: 'online',
        joined_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error syncing member join:', e);
    }
  }
}

async function removeUserFromRoom(channelCode, socketId) {
  let userToRemove = null;
  if (activeRooms[channelCode]) {
    userToRemove = activeRooms[channelCode].users[socketId];
    delete activeRooms[channelCode].users[socketId];
    if (Object.keys(activeRooms[channelCode].users).length === 0) {
      delete activeRooms[channelCode];
    }
  }

  // Sync to Supabase
  if (userToRemove) {
    const channelId = await getChannelIdFromCode(channelCode);
    if (channelId) {
      try {
         await supabaseAdmin.from('members').delete().match({ user_id: userToRemove.uid, channel_id: channelId });
      } catch (e) {
         console.error('Error syncing member leave:', e);
      }
    }
  }
}

function setUserTransmitting(channelCode, socketId, isTransmitting) {
  if (activeRooms[channelCode] && activeRooms[channelCode].users[socketId]) {
    activeRooms[channelCode].users[socketId].transmitting = isTransmitting;
  }
}

module.exports = {
  getRoomState,
  addUserToRoom,
  removeUserFromRoom,
  setUserTransmitting,
  getChannelIdFromCode
};

```

## server/supabase.js
```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabaseAdmin };

```

## server/middleware/auth.js
```javascript
const { supabaseAdmin } = require('../supabase');

async function verifyToken(token) {
  if (!token) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return {
      uid: user.id,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      email: user.email
    };
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

module.exports = {
  verifyToken
};

```

## .env
```
VITE_SUPABASE_URL="https://zvbfdfcheyqsqglpvbax.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2YmZkZmNoZXlxc3FnbHB2YmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTExOTgsImV4cCI6MjA4OTUyNzE5OH0.mfSMYWkVWNoUqVtD6wlbKPVIPE-Ug7klIG1oNG3NaN4"

```

## server/.env
```
SUPABASE_URL="https://zvbfdfcheyqsqglpvbax.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2YmZkZmNoZXlxc3FnbHB2YmF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MTE5OCwiZXhwIjoyMDg5NTI3MTk4fQ.BvWjHO9tTu9WLbiLL7O3J-lvl2l55KD_CAJNckC2uqo"

```

