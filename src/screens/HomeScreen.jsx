import React, { useState, useEffect } from 'react';
import {
  Screen, StatusBar, ScreenBody, FreqDisplay,
  SectionLabel, PageTitle, Input, BtnOutline, BtnSolid, Badge, BottomNav,
} from '../components/UI';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

export default function HomeScreen({ user, onSelectChannel, onNavigate, activeNav }) {
  const [joinCode, setJoinCode] = useState('');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);

  useEffect(() => {
    // Eagerly ask for mic/speaker permission before entering a channel
    const requestPermissions = async () => {
      try {
        // Speaker
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) new AudioCtx(); // Just creating it triggers some browsers, resumed on PTT
        
        // Mic
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // Clean up immediately, permission saved
      } catch (err) {
        console.warn('HW PERMISSION DENIED ON STARTUP', err);
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('members')
        .select(`
          channel_id,
          channels (
            id, name, code, max_members, created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) { showToast('ERR: FAILED TO LOAD CHANNELS'); return; }

      // Get online count for each channel
      const channelsWithCount = await Promise.all(
        (data || []).map(async (row) => {
          if (!row.channels) return null;
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', row.channel_id)
            .neq('status', 'offline');
          return { ...row.channels, onlineCount: count || 0 };
        })
      );

      setChannels(channelsWithCount.filter(Boolean));
      setLoading(false);
    };
    fetchChannels();
  }, [user]);

  const generateUniqueCode = async () => {
    let code, exists;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data } = await supabase
        .from('channels')
        .select('id')
        .eq('code', code)
        .single();
      exists = !!data;
    } while (exists);
    return code;
  };

  const handleCreate = async () => {
    if (!channelName.trim()) { showToast('ENTER A CHANNEL NAME'); return; }
    setLoading(true);
    const code = await generateUniqueCode();
    const { data, error } = await supabase
      .from('channels')
      .insert({
        name: channelName.trim().toUpperCase(),
        code,
        created_by: user.id,
        max_members: maxMembers
      })
      .select()
      .single();
      
    if (error) {
      showToast('ERR: FAILED TO CREATE CHANNEL');
      setLoading(false);
      return;
    }
    
    await supabase.from('members').upsert({
      channel_id: data.id,
      user_id: user.id,
      user_name: user.user_metadata?.username || user.email,
      status: 'rx'
    });
    
    showToast('CHANNEL CREATED · CODE: ' + code);
    setLoading(false);
    setShowModal(false);
    onSelectChannel(data);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { showToast('ENTER A CHANNEL CODE'); return; }
    setLoading(true);
  
    // Find channel by code
    const { data: channel, error } = await supabase
      .from('channels')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .single();
  
    if (error || !channel) {
      showToast('ERR: CHANNEL NOT FOUND · CHECK CODE');
      setLoading(false);
      return;
    }
  
    // Check if already a member
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('channel_id', channel.id)
      .eq('user_id', user.id)
      .single();
  
    if (!existing) {
      // New member — insert
      await supabase.from('members').insert({
        channel_id: channel.id,
        user_id: user.id,
        user_name: user.user_metadata?.username || user.email,
        status: 'rx'
      });
    }
  
    setLoading(false);
    // Navigate to channel
    onSelectChannel(channel);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Screen>
      <StatusBar left="SYS:ACTIVE" center={`CH:${channels.length}`} right="SIG:●●●" />
      <ScreenBody>

        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--amber2)', letterSpacing: '4px' }}>
            {user?.name?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px', marginTop: 2 }}>
            ACTIVE CALLSIGN
          </div>
        </div>

        <FreqDisplay freq="146.52" label="MHz · FM BAND" />

        <SectionLabel>JOIN BY CODE</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <Input
            placeholder="ENTER CODE..."
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button onClick={handleJoin} disabled={loading} style={{
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
            key={ch?.id}
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
              {ch?.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 2, marginBottom: 6 }}>
              CODE: {ch?.code} · {ch?.onlineCount} ONLINE
            </div>
            <Badge
              text={ch?.onlineCount > 0 ? '● LIVE' : '○ SILENT'}
              type={ch?.onlineCount > 0 ? 'live' : 'idle'} 
            />
          </div>
        ))}

        <BtnOutline style={{ marginTop: 6, fontSize: 10 }} onClick={() => setShowModal(true)}>+ NEW CHANNEL</BtnOutline>
        
        <BtnOutline style={{ marginTop: 24, fontSize: 10, opacity: 0.8 }} onClick={handleLogout}>
          LOG OUT
        </BtnOutline>

      </ScreenBody>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg0)', border: '2px solid var(--amber)',
            padding: 20, borderRadius: 8, width: 300,
            display: 'flex', flexDirection: 'column'
          }}>
             <SectionLabel style={{ marginTop: 0 }}>NEW CHANNEL</SectionLabel>
             <Input 
                placeholder="CHANNEL NAME"
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
             />
             <Input
                type="number"
                placeholder="MAX MEMBERS"
                value={maxMembers}
                onChange={e => setMaxMembers(Number(e.target.value))}
             />
             <BtnSolid disabled={loading} onClick={handleCreate} style={{ marginTop: 10 }}>{loading ? 'CREATING...' : 'CREATE'}</BtnSolid>
             <BtnOutline disabled={loading} onClick={() => setShowModal(false)} style={{ marginTop: 6 }}>CANCEL</BtnOutline>
          </div>
        </div>
      )}

      <BottomNav items={[
        { icon: '⌂', label: 'HOME',   active: activeNav === 'home',    onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK',   active: activeNav === 'talk',    onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW',   active: activeNav === 'crew',    onClick: () => onNavigate('crew') },
        { icon: '◎', label: 'PROFILE', active: activeNav === 'profile', onClick: () => onNavigate('profile') },
      ]} />
    </Screen>
  );
}
