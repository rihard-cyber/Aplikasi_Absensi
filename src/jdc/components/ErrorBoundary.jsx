import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100dvh', padding: '2rem', background: '#0f172a', color: '#e2e8f0',
          fontFamily: 'Arial, sans-serif', textAlign: 'center', gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Terjadi Kesalahan</h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', margin: 0 }}>
            Aplikasi mengalami error. Silakan refresh halaman atau hubungi administrator.
          </p>
          <button onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', marginTop: '0.5rem'
            }}>
            Refresh Halaman
          </button>
          {this.state.error && (
            <details style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: '500px', marginTop: '1rem' }}>
              <summary>Detail Error</summary>
              <pre style={{ textAlign: 'left', marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}{'\n'}{this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
