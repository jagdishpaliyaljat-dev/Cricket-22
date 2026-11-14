import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

interface LoginScreenProps {
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onContinueAsGuest }) => {
  const { signInWithGoogle, isSigningIn, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-[#F2F6FC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 mb-6 flex items-center justify-center">
        <Logo variant="icon" className="w-24 h-24" />
      </div>
      <div className="space-y-2 mb-8">
        <h1 className="text-[#172033] font-black text-3xl tracking-tight">LocalXI Cricket</h1>
        <p className="text-[#718096] text-sm max-w-xs mx-auto">
          Every Local Match. Every Player. Every Record. Sign in to track stats, manage matches, and play.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex flex-col items-center gap-2 max-w-xs">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="w-full bg-[#1554B8] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:bg-[#0B3F91] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
          )}
          <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        {onContinueAsGuest && (
          <button
            onClick={onContinueAsGuest}
            className="w-full bg-white hover:bg-slate-100 text-[#172033] font-bold py-3 px-6 rounded-2xl border border-[#DFE7F2] transition-colors cursor-pointer text-xs"
          >
            Explore as Guest
          </button>
        )}
      </div>
    </div>
  );
};
