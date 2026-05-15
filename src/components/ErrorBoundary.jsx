import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("=== CRITICAL UI CRASH ===");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo?.componentStack);
  }

  handleReset = () => {
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  };

  handleSoftReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || 'Unknown error';
      const isAuthError = errorMsg.includes('null is not an object') || errorMsg.includes('Cannot read');
      const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch');

      return (
        <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm glass-panel p-8 border border-red-500/20 shadow-[0_0_50px_rgba(255,0,85,0.2)]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <span className="text-3xl animate-pulse">🛡️</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-white mb-3">Terjadi Kesalahan</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed mb-6">
              {isNetworkError 
                ? 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
                : 'Aplikasi mengalami gangguan teknis. Silakan muat ulang.'}
            </p>

            <p className="text-[9px] text-red-400/60 font-mono mb-6 bg-black/30 rounded-xl p-3 break-all leading-relaxed">
              {errorMsg.length > 120 ? errorMsg.slice(0, 120) + '...' : errorMsg}
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleSoftReload}
                className="w-full py-4 rounded-2xl bg-white/10 text-white font-bold uppercase tracking-[0.2em] text-[10px] border border-white/10 hover:bg-white/20 transition-all active:scale-95"
              >
                Coba Lagi
              </button>
              <button 
                onClick={this.handleReset}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
              >
                Muat Ulang Aplikasi
              </button>
            </div>
            
            <details className="mt-6 text-left cursor-pointer group">
              <summary className="text-[8px] text-gray-700 uppercase tracking-widest font-bold text-center group-open:mb-4">Detail Teknis</summary>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 overflow-x-auto max-h-[200px] overflow-y-auto">
                <code className="text-[8px] text-red-400 font-mono leading-relaxed break-all whitespace-pre-wrap">
                  {errorMsg}
                  {'\n\n'}
                  {this.state.error?.stack || ''}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack || ''}
                </code>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
