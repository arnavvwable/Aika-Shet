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
