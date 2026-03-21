import React, { useState, useEffect } from 'react';

const toastListeners = new Set();
export const showToast = (message) => {
  toastListeners.forEach(fn => fn(message));
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (msg) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, msg }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    
    toastListeners.add(listener);
    return () => toastListeners.delete(listener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 6, zIndex: 9999, pointerEvents: 'none',
      width: '90%', maxWidth: 350
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--amber)', color: 'var(--bg0)', padding: '10px 14px',
          borderRadius: 4, fontFamily: 'var(--font-mono, monospace)', fontSize: 10,
          textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          animation: 'toast-in 0.2s ease-out', fontWeight: 700
        }}>
          {t.msg}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
