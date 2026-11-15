import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

interface LoginScreenProps {
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onContinueAsGuest }) => {
  const { signInWithGoogle, isSigningIn, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Stadium atmospheric background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,_rgba(0,242,254,0.15)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[radial-gradient(circle,_rgba(56,189,248,0.1)_0%,_transparent_70%)] pointer-events-none" />

      <div className="w-24 h-24 mb-6 flex items-center justify-center relative z-10">
        <Logo variant="icon" className="w-24 h-24 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]" />
      </div>

      <div className="space-y-2 mb-8 relative z-10">
        <h1 className="text-white font-display font-black text-3xl tracking-tight">
          Local<span className="text-[#00F2FE]">XI</span> Cricket
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
          Every Local Match. Every Player. Every Record. Sign in to track stats, manage matches, and play.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex flex-col items-center gap-2 max-w-xs relative z-10 shadow-lg">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="text-xs font-bold underline cursor-pointer text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="w-full max-w-xs space-y-3 relative z-10">
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="w-full bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(0,242,254,0.35)] hover:opacity-95 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-[#0B1120]/30 border-t-[#0B1120] rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
          )}
          <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        {onContinueAsGuest && (
          <button
            onClick={onContinueAsGuest}
            className="w-full stadium-card hover:bg-white/10 text-white font-bold py-3 px-6 rounded-2xl border border-white/10 transition-colors cursor-pointer text-xs"
          >
            Explore as Guest
          </button>
        )}
      </div>
    </div>
  );
};
