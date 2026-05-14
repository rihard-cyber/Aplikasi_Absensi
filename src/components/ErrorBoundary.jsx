import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-8 text-center border border-[var(--danger)]/30 shadow-[0_0_40px_rgba(255,0,85,0.1)]">
        <div className="w-20 h-20 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mx-auto mb-6 border border-[var(--danger)]/20">
          <ShieldAlert size={40} className="text-[var(--danger)]" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-white mb-3">
          Terjadi Kesalahan
        </h2>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Aplikasi mengalami gangguan. Jangan khawatir, tim kami sudah menerima laporan ini.
        </p>

        <button
          onClick={onReset}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(142,45,226,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mb-4"
        >
          <RefreshCw size={18} /> Muat Ulang Aplikasi
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-center gap-2 mx-auto text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-bold uppercase tracking-widest"
        >
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Detail Teknis
        </button>

        {showDetails && (
          <div className="mt-4 p-4 bg-[#0B0C10]/80 rounded-2xl border border-white/5 text-left max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-[11px] text-[var(--danger)] font-mono leading-relaxed whitespace-pre-wrap break-all">
              {error && error.toString()}
            </p>
            {errorInfo && (
              <p className="text-[10px] text-gray-600 font-mono mt-3 leading-relaxed whitespace-pre-wrap break-all">
                {errorInfo.componentStack}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
