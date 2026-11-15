import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Menu } from 'lucide-react';
import { NotificationsModal } from './NotificationsModal';
import { InstallPWA } from './InstallPWA';

import { Logo } from './Logo';
import { CricketMatch } from '../types/cricket';

interface HeaderProps {
  currentTab: 'home' | 'matches' | 'live' | 'players' | 'compare' | 'leaderboard' | 'admin' | 'profile';
  setCurrentTab: (tab: 'home' | 'matches' | 'live' | 'players' | 'compare' | 'leaderboard' | 'admin' | 'profile') => void;
  liveMatchCount?: number;
  matches?: CricketMatch[];
  onOpenProfile?: () => void;
  onOpenDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  liveMatchCount = 0,
  matches = [],
  onOpenProfile,
  onOpenDrawer,
}) => {
    const { currentUser, signInWithGoogle, isSigningIn } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const avatarUrl =
    currentUser?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B1120]/90 text-white backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30">
        {/* Main Header Bar */}
        <div className="max-w-md mx-auto px-4 h-15 flex items-center justify-between gap-3">
          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenDrawer && (
              <button
                onClick={onOpenDrawer}
                className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer touch-press"
                title="Open Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}

            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center text-left shrink-0 cursor-pointer focus:outline-none group ml-0.5 touch-press"
              title="LocalXI Home"
            >
              <Logo variant="full" className="h-8.5" />
            </button>
          </div>

          {/* Right: Install PWA + Notification Bell + User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <InstallPWA />
            {/* Bell Icon with Red Dot */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer touch-press"
              title="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {/* Glowing notification dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full shadow-[0_0_8px_#EF4444]" />
            </button>

            {/* Profile Avatar or Login Button */}
            {currentUser ? (
              <button
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else setCurrentTab('profile');
                }}
                className="relative rounded-full focus:outline-none transition-transform active:scale-95 cursor-pointer touch-press p-0.5 border border-[#00F2FE]/40 shadow-[0_0_10px_rgba(0,242,254,0.25)]"
                title="View Profile"
              >
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-8.5 h-8.5 rounded-full object-cover bg-slate-800"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 backdrop-blur-md"
              >
                {isSigningIn ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3.5 h-3.5 bg-white rounded-full" />
                )}
                <span>{isSigningIn ? '...' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Dialog */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        matches={matches}
      />
    </>
  );
};
