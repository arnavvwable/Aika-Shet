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

const EyeIcon = ({ visible }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {visible ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    )}
  </svg>
);

const PasswordInput = ({ value, onChange, placeholder, style }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <Input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ marginBottom: 0, paddingRight: 40 }}
      />
      <div 
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: 12, top: 10, cursor: 'pointer',
          color: show ? 'var(--amber)' : 'var(--amber-dim)'
        }}
      >
        <EyeIcon visible={show} />
      </div>
    </div>
  );
};

export default function LoginScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [callsign, setCallsign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return setError('ENTER CREDENTIALS');
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) { setError('PASSWORDS DO NOT MATCH'); return; }
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username,
        callsign: callsign || username.toUpperCase() || email.split('@')[0].toUpperCase()
      });
      setError('CHECK YOUR EMAIL TO VERIFY ACCOUNT');
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
              ऐका-शेठ
            </div>
            <div style={{ fontSize: 9, color: 'var(--txt-mid)', fontFamily: 'var(--font-mono)', letterSpacing: '1.5px', marginTop: 2 }}>
              OPEN CHANNEL COMM SYSTEM
            </div>
          </div>
        </div>

        <TapeStrip />

        <SectionLabel>{isSignup ? 'CREATE ACCOUNT' : 'AUTHENTICATION'}</SectionLabel>

        {error && <div style={{ color: '#ef4444', fontSize: 10, marginBottom: 8, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>ERR: {error}</div>}

        {isSignup && (
          <>
            <Input
              type="text"
              placeholder="USERNAME (OPTIONAL)"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <Input
              type="text"
              placeholder="CALLSIGN e.g. UNIT-7 or ALPHA"
              value={callsign}
              onChange={e => setCallsign(e.target.value.toUpperCase())}
            />
          </>
        )}
        <Input
          type="email"
          placeholder="USER_ID@domain.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <PasswordInput
          placeholder="PASSWORD ••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={isSignup ? { marginBottom: 8 } : { marginBottom: 4 }}
        />
        {isSignup && (
          <PasswordInput
            placeholder="CONFIRM PASSWORD ••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ marginBottom: 4 }}
          />
        )}

        {isSignup ? (
          <BtnSolid onClick={handleSignUp} style={{ marginTop: 6 }} disabled={loading}>
            {loading ? 'PROCESSING...' : 'COMPLETE SIGNUP'}
          </BtnSolid>
        ) : (
          <BtnSolid onClick={handleLogin} style={{ marginTop: 6 }} disabled={loading}>
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </BtnSolid>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: '#3d2a0a', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: 1, background: '#2a1d08' }} />
          OR
          <div style={{ flex: 1, height: 1, background: '#2a1d08' }} />
        </div>

        <BtnOutline onClick={handleGoogle} disabled={loading}>SIGN IN WITH GOOGLE</BtnOutline>
        <BtnOutline onClick={() => { setIsSignup(!isSignup); setError(''); }} disabled={loading}>
          {isSignup ? 'BACK TO LOGIN' : 'CREATE ACCOUNT'}
        </BtnOutline>

        <TapeStrip style={{ marginTop: 'auto' }} />
        <div style={{ textAlign: 'center', fontSize: 9, color: '#3d2a0a', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          SECURED · SUPABASE AUTH · v2.0
        </div>
      </ScreenBody>
    </Screen>
  );
}
