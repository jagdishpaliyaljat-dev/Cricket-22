import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Shield, Activity, HelpCircle, ExternalLink, ChevronDown, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onContinueAsGuest }) => {
  const { signInWithGoogle, signInWithDemoRole, isSigningIn, error, clearError } = useAuth();
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localxi-cricket.vercel.app';

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col items-center justify-center p-5 text-center relative overflow-hidden font-sans">
      {/* Stadium atmospheric background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,_rgba(0,242,254,0.15)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[radial-gradient(circle,_rgba(56,189,248,0.1)_0%,_transparent_70%)] pointer-events-none" />

      {/* Brand Logo */}
      <div className="w-20 h-20 mb-5 flex items-center justify-center relative z-10">
        <Logo variant="icon" className="w-20 h-20 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]" />
      </div>

      <div className="space-y-1.5 mb-6 relative z-10">
        <h1 className="text-white font-display font-black text-3xl tracking-tight">
          Local<span className="text-[#00F2FE]">XI</span> Cricket
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
          Every Local Match. Every Player. Every Record. Sign in to track stats, score fixtures, and manage teams.
        </p>
      </div>

      {/* Error notification banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex flex-col items-center gap-2.5 max-w-sm relative z-10 shadow-2xl animate-in fade-in text-left">
          <p className="leading-relaxed">{error}</p>
          <div className="flex items-center gap-3 w-full justify-between pt-1 border-t border-rose-500/20 text-[11px]">
            <button
              onClick={() => setShowDomainHelp(!showDomainHelp)}
              className="text-[#00F2FE] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Domain Setup Guide</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDomainHelp ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={clearError}
              className="font-bold text-rose-300 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Domain setup instructions toggle */}
      {showDomainHelp && (
        <div className="mb-6 p-4 bg-[#131D33] border border-cyan-500/30 rounded-2xl text-left max-w-sm text-xs space-y-2.5 relative z-10 shadow-xl">
          <div className="flex items-center gap-2 text-[#00F2FE] font-black uppercase text-[11px] tracking-wider">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Enable Google Sign-in on Vercel:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#00F2FE] underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
            <li>Select project: <strong>elliptical-superstate-6v4kj</strong></li>
            <li>Navigate to: <strong>Authentication → Settings → Authorized domains</strong></li>
            <li>Click <strong>Add domain</strong> and enter: <code className="bg-black/50 px-1.5 py-0.5 rounded text-cyan-300 font-mono">{currentHostname}</code></li>
          </ol>
          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/10">
            Or simply click <strong>"⚡ Quick Admin Access"</strong> below to use the entire application right now!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-3 relative z-10">
        {/* Google Sign-In */}
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="w-full bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] hover:from-[#00F2FE]/90 hover:to-[#38BDF8]/90 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
          )}
          <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        <div className="flex items-center gap-2 py-1">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">Or Instant Access</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Quick Admin Access */}
        <button
          onClick={() => signInWithDemoRole('admin')}
          className="w-full stadium-card-glow hover:border-cyan-500/60 text-white font-black py-3 px-4 rounded-2xl border border-cyan-500/40 transition-all cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(0,242,254,0.15)]"
        >
          <Shield className="w-4 h-4 text-[#00F2FE]" />
          <span>⚡ Quick Admin Access (एडमिन लॉगिन)</span>
        </button>

        {/* Quick Scorer Access */}
        <button
          onClick={() => signInWithDemoRole('scorer')}
          className="w-full stadium-card hover:bg-white/10 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-2xl border border-white/10 transition-colors cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>⚡ Scorer Access (स्कोरर मोड)</span>
        </button>

        {/* Guest Access */}
        {onContinueAsGuest && (
          <button
            onClick={onContinueAsGuest}
            className="w-full py-2.5 px-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
          >
            Explore as Guest (गेस्ट के रूप में देखें) →
          </button>
        )}
      </div>
    </div>
  );
};
