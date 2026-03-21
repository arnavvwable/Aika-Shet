import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ef4444', padding: '20px', fontFamily: 'var(--font-mono, monospace)', background: '#111', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h3>CRITICAL SYSTEM ERROR</h3>
          <div style={{ padding: '10px', background: '#222', border: '1px solid #444', marginBottom: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          {this.state.error?.message?.includes('supabaseUrl is required') && (
            <div style={{ color: '#4ade80' }}>
              <strong>FIX:</strong> You need to restart your Vite terminal! <br/><br/>
              The `.env` file was added *after* the `npm run dev` server was started, so Vite hasn't loaded the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables yet. Close the terminal running Vite and run `npm run dev` again!
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
