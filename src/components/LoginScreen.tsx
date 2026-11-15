import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { ExternalLink, ChevronDown, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { signInWithGoogle, isSigningIn, error, clearError } = useAuth();
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : 'localxi-cricket.vercel.app';

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col items-center justify-center p-5 text-center relative overflow-hidden font-sans">
      {/* Stadium atmospheric background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,_rgba(0,242,254,0.15)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[radial-gradient(circle,_rgba(56,189,248,0.1)_0%,_transparent_70%)] pointer-events-none" />

      {/* Brand Logo */}
      <div className="w-20 h-20 mb-5 flex items-center justify-center relative z-10">
        <Logo variant="icon" className="w-20 h-20 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]" />
      </div>

      <div className="space-y-1.5 mb-8 relative z-10">
        <h1 className="text-white font-display font-black text-3xl sm:text-4xl tracking-tight">
          Local<span className="text-[#00F2FE]">XI</span> Cricket
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
          Every Local Match. Every Player. Every Record. Sign in with your Google account to continue.
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
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showDomainHelp ? 'rotate-180' : ''
                }`}
              />
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
            <li>
              Go to{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00F2FE] underline inline-flex items-center gap-0.5"
              >
                Firebase Console <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Select project: <strong>elliptical-superstate-6v4kj</strong>
            </li>
            <li>
              Navigate to: <strong>Authentication → Settings → Authorized domains</strong>
            </li>
            <li>
              Click <strong>Add domain</strong> and enter:{' '}
              <code className="bg-black/50 px-1.5 py-0.5 rounded text-cyan-300 font-mono">
                {currentHostname}
              </code>
            </li>
          </ol>
        </div>
      )}

      {/* ONLY Google Sign-In Action */}
      <div className="w-full max-w-xs relative z-10 space-y-4">
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black py-4 px-6 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(0,242,254,0.35)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3.5 cursor-pointer border border-white/20"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="text-sm tracking-tight font-extrabold">
            {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
          </span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00F2FE]" />
          <span>Secure authentication via Google</span>
        </div>
      </div>
    </div>
  );
};
