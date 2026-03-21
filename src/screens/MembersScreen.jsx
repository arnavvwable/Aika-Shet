import React, { useState, useEffect } from 'react';
import { Screen, StatusBar, ScreenBody, PageTitle, SectionLabel, BtnOutline, TapeStrip, BottomNav } from '../components/UI';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { io } from 'socket.io-client';

export default function MembersScreen({ channel, user, onNavigate, activeNav }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('channel_id', channel?.id);
      setMembers(data || []);
    };
    fetchMembers();

    // Realtime subscription
    const sub = supabase
      .channel('members-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'members',
        filter: `channel_id=eq.${channel?.id}`
      }, fetchMembers)
      .subscribe();

    // Update live when Socket.io room-users event fires
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
    socket.emit('join-room', { roomCode: channel?.id, userId: user?.id, userName: user?.name, implicit: true });
    socket.on('room-users', (users) => {
      // Re-fetch to sync with Postgres changes initiated by backend
      fetchMembers();
    });

    return () => {
      supabase.removeChannel(sub);
      socket.disconnect();
    };
  }, [channel]);

  const handleInvite = () => {
    navigator.clipboard.writeText(channel?.code);
    showToast('CHANNEL CODE COPIED: ' + channel?.code);
  };

  const txMembers = members.filter(m => m.status === 'tx');
  const rxMembers = members.filter(m => m.status === 'rx' || m.status === 'online');
  const offMembers = members.filter(m => m.status === 'offline');

  return (
    <Screen>
      <StatusBar left={`USER:${user?.name?.toUpperCase() || 'UNKNOWN'}`} center={`CH:${channel?.name?.split(' ')[1] || channel?.name}`} right="SIG:●●●" />
      <ScreenBody>
        <PageTitle title="CREW" sub="CHANNEL MEMBERS" />
        
        <BtnOutline onClick={handleInvite} style={{ marginBottom: 14 }}>
          INVITE · CODE: {channel?.code}
        </BtnOutline>

        {txMembers.length > 0 && (
          <>
            <SectionLabel>TRANSMITTING</SectionLabel>
            {txMembers.map(m => (
              <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--amber)', color: 'var(--bg0)', borderRadius: 4, marginBottom: 6, fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <span>{m.user_name || m.user_id}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                   {[1,2,3].map(i => (
                     <div key={i} style={{ width: 3, height: 10, background: 'var(--bg0)', animation: `vu-pulse-${i} 0.3s ease-in-out infinite alternate` }} />
                   ))}
                </div>
              </div>
            ))}
          </>
        )}

        {rxMembers.length > 0 && (
          <>
            <SectionLabel>ONLINE</SectionLabel>
            {rxMembers.map(m => (
              <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg0)', border: '1px solid #3d2a0a', borderRadius: 4, marginBottom: 6, color: 'var(--amber2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                <span>{m.user_name || m.user_id}</span>
              </div>
            ))}
          </>
        )}

        {offMembers.length > 0 && (
          <>
            <SectionLabel>OFFLINE</SectionLabel>
            {offMembers.map(m => (
              <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg0)', border: '1px dashed #2a1d08', opacity: 0.6, borderRadius: 4, marginBottom: 6, color: 'var(--txt-mid)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2a1d08' }} />
                <span>{m.user_name || m.user_id}</span>
              </div>
            ))}
          </>
        )}

        <TapeStrip style={{ marginTop: 'auto', opacity: 0.2 }} />
      </ScreenBody>
      <BottomNav items={[
        { icon: '⌂', label: 'HOME',   active: activeNav === 'home',    onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK',   active: activeNav === 'talk',    onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW',   active: activeNav === 'crew',    onClick: () => onNavigate('crew') },
      ]} />
    </Screen>
  );
}
