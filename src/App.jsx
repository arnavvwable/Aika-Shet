import React, { useState, useEffect } from 'react';
import './theme.css';
import LoginScreen   from './screens/LoginScreen';
import HomeScreen    from './screens/HomeScreen';
import ChannelScreen from './screens/ChannelScreen';
import MembersScreen from './screens/MembersScreen';
import ProfileScreen from './screens/ProfileScreen';

import Toast from './components/Toast';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [screen, setScreen]   = useState('login');
  const [channel, setChannel] = useState(null);
  const [nav, setNav]         = useState('home');

  useEffect(() => {
    const loadProfile = async (u) => {
      const { data } = await supabase.from('profiles').select('username, callsign').eq('id', u.id).single();
      const callsign = data?.callsign || data?.username?.toUpperCase() || u.email?.split('@')[0].toUpperCase();
      setUser({ uid: u.id, name: callsign, email: u.email, id: u.id, callsign });
      setScreen('home');
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setScreen('login');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleSelectChannel = (ch) => {
    setChannel(ch);
    setScreen('channel');
    setNav('talk');
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
    } else if (dest === 'profile') {
      setNav('profile');
      setScreen('profile');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setSession(null);
    setChannel(null);
    setNav('home');
    setScreen('login');
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
          user={user}
          onNavigate={handleNavigate}
          activeNav={nav}
        />
      )}
      {screen === 'crew' && channel && (
        <MembersScreen
          channel={channel}
          user={user}
          onNavigate={handleNavigate}
          activeNav={nav}
        />
      )}
      {screen === 'profile' && user && (
        <ProfileScreen
          user={user}
          onNavigate={handleNavigate}
          activeNav={nav}
          onSignOut={handleSignOut}
        />
      )}
      <Toast />
    </div>
  );
}
