import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Screen, StatusBar, ScreenBody,
  TapeStrip, SectionLabel, Input,
  BtnSolid, BtnOutline, BottomNav
} from '../components/UI';

export default function ProfileScreen({ user, onNavigate, activeNav, onSignOut }) {
  const [profile, setProfile] = useState({
    username: '',
    callsign: '',
    email: user?.email || '',
  });
  const [stats, setStats] = useState({
    channels: 0,
    crew: 0,
  });
  const [prefs, setPrefs] = useState({
    notifications: true,
    soundOnReceive: true,
    showOnline: true,
    echoCancellation: true,
  });
  const [passwords, setPasswords] = useState({
    current: '', newPass: '', confirm: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [editMode, setEditMode] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Fetch profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };

    const fetchStats = async () => {
      const { count: channelCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setStats({ channels: channelCount || 0, crew: 0 });
    };

    fetchProfile();
    fetchStats();
  }, [user]);

  // Save profile changes
  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        callsign: profile.callsign?.toUpperCase(),
      })
      .eq('id', user.id);
    setLoading(false);
    if (error) showToast('ERR: FAILED TO SAVE PROFILE');
    else { showToast('PROFILE UPDATED'); setEditMode(false); }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      showToast('ERR: PASSWORDS DO NOT MATCH');
      return;
    }
    if (passwords.newPass.length < 8) {
      showToast('ERR: PASSWORD MIN 8 CHARACTERS');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.newPass
    });
    setLoading(false);
    if (error) showToast('ERR: ' + error.message.toUpperCase());
    else {
      showToast('PASSWORD UPDATED');
      setShowPasswordForm(false);
      setPasswords({ current: '', newPass: '', confirm: '' });
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  // Delete account
  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      'DELETE ACCOUNT? This cannot be undone. All your channels and data will be lost.'
    );
    if (!confirm) return;
    setLoading(true);
    await supabase.from('members').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    onSignOut();
  };

  const initials = (profile.username || profile.email || 'U')
    .substring(0, 2).toUpperCase();

  const memberSince = new Date(user?.created_at)
    .toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <Screen>
      <StatusBar
        left={`USER:${profile.callsign || profile.username || 'UNKNOWN'}`}
        center="PROFILE"
        right="SYS:OK"
      />
      <ScreenBody>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36,
            border: '2px solid var(--amber)',
            background: 'var(--bg0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 24,
            color: 'var(--amber2)', position: 'relative',
          }}>
            {initials}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--amber2)', marginTop: 10, letterSpacing: 2 }}>
            {profile.username || 'UNKNOWN'}
          </div>
          <div style={{
            marginTop: 4, padding: '2px 10px', borderRadius: 3,
            border: '1px solid var(--amber4)',
            background: 'var(--bg0)',
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)',
            letterSpacing: 2,
          }}>
            [ {profile.callsign || 'NO CALLSIGN'} ]
          </div>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {profile.email}
          </div>
          <div style={{ fontSize: 9, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            MEMBER SINCE {memberSince}
          </div>
        </div>

        <TapeStrip />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'CHANNELS', value: stats.channels },
            { label: 'TX TIME', value: '0 MIN' },
            { label: 'CREW', value: stats.crew },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, background: 'var(--bg0)',
              border: '1px solid #2a1d08', borderRadius: 6,
              padding: '8px 4px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--amber2)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 8, color: 'var(--amber-dim)', fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: 1 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Profile */}
        <SectionLabel>EDIT PROFILE</SectionLabel>
        <Input
          placeholder="DISPLAY NAME"
          value={profile.username || ''}
          onChange={e => { setEditMode(true); setProfile(p => ({ ...p, username: e.target.value })); }}
        />
        <Input
          placeholder="CALLSIGN e.g. UNIT-7"
          value={profile.callsign || ''}
          onChange={e => { setEditMode(true); setProfile(p => ({ ...p, callsign: e.target.value.toUpperCase() })); }}
        />
        <Input
          placeholder="EMAIL"
          value={profile.email || ''}
          disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        />
        {editMode && (
          <BtnSolid onClick={handleSave} style={{ marginBottom: 12 }}>
            {loading ? 'SAVING...' : 'SAVE CHANGES'}
          </BtnSolid>
        )}

        <TapeStrip />

        {/* Preferences */}
        <SectionLabel>PREFERENCES</SectionLabel>
        {[
          { key: 'notifications',     label: 'PUSH NOTIFICATIONS' },
          { key: 'soundOnReceive',    label: 'SOUND ON RECEIVE' },
          { key: 'showOnline',        label: 'SHOW ONLINE STATUS' },
          { key: 'echoCancellation',  label: 'ECHO CANCELLATION' },
        ].map(pref => (
          <div key={pref.key} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '8px 0',
            borderBottom: '1px solid #2a1d08',
          }}>
            <span style={{ fontSize: 11, color: 'var(--txt-mid)', fontFamily: 'var(--font-mono)' }}>
              {pref.label}
            </span>
            <div
              onClick={() => setPrefs(p => ({ ...p, [pref.key]: !p[pref.key] }))}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: prefs[pref.key] ? 'var(--amber)' : '#2a1d08',
                position: 'relative', cursor: 'pointer', transition: 'background .2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: prefs[pref.key] ? 18 : 3,
                width: 14, height: 14, borderRadius: 7,
                background: '#fff', transition: 'left .2s',
              }} />
            </div>
          </div>
        ))}

        <TapeStrip />

        {/* Change Password */}
        <SectionLabel>SECURITY</SectionLabel>
        <BtnOutline onClick={() => setShowPasswordForm(!showPasswordForm)} style={{ marginBottom: 8 }}>
          {showPasswordForm ? 'CANCEL' : 'CHANGE PASSWORD'}
        </BtnOutline>
        {showPasswordForm && (
          <>
            <Input
              type="password"
              placeholder="NEW PASSWORD"
              value={passwords.newPass}
              onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="CONFIRM NEW PASSWORD"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
            />
            <BtnSolid onClick={handleChangePassword}>
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </BtnSolid>
          </>
        )}

        <TapeStrip />

        {/* Sign Out + Delete */}
        <SectionLabel>ACCOUNT</SectionLabel>
        <BtnSolid onClick={handleSignOut} style={{ marginBottom: 8 }}>
          SIGN OUT
        </BtnSolid>
        <BtnOutline
          onClick={handleDeleteAccount}
          style={{ color: '#ef4444', borderColor: '#7f1d1d', marginBottom: 24 }}
        >
          DELETE ACCOUNT
        </BtnOutline>

      </ScreenBody>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: 16, right: 16,
          background: 'var(--amber)', color: 'var(--bg0)',
          padding: '10px 14px', borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          textAlign: 'center', letterSpacing: 1, zIndex: 100,
        }}>
          {toast}
        </div>
      )}

      <BottomNav items={[
        { icon: '⌂', label: 'HOME',    active: activeNav === 'home',    onClick: () => onNavigate('home') },
        { icon: '◉', label: 'TALK',    active: activeNav === 'talk',    onClick: () => onNavigate('talk') },
        { icon: '◈', label: 'CREW',    active: activeNav === 'crew',    onClick: () => onNavigate('crew') },
        { icon: '◎', label: 'PROFILE', active: activeNav === 'profile', onClick: () => onNavigate('profile') },
      ]} />
    </Screen>
  );
}
