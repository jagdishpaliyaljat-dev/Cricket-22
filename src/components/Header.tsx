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
      <header className="sticky top-0 z-40 bg-[#1554B8] text-white backdrop-blur-md border-b border-[#0B3F91] shadow-sm">
        {/* Main Header Bar */}
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Left: Hamburger + Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenDrawer && (
              <button
                onClick={onOpenDrawer}
                className="p-1 -ml-1 text-white hover:text-white/80 rounded-lg transition-colors cursor-pointer"
                title="Open Menu"
              >
                <Menu className="w-5.5 h-5.5 stroke-[2.2]" />
              </button>
            )}

            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center text-left shrink-0 cursor-pointer focus:outline-none group ml-1"
              title="LocalXI Home"
            >
              <Logo variant="full" className="h-8" />
            </button>
          </div>

          {/* Right: Install PWA + Notification Bell + User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <InstallPWA />
            {/* Bell Icon with Red Dot */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-1.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {/* Red notification dot */}
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D94343] rounded-full border-2 border-[#1554B8]" />
            </button>

            {/* Profile Avatar or Login Button */}
            {currentUser ? (
              <button
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else setCurrentTab('profile');
                }}
                className="relative rounded-full focus:outline-none transition-transform active:scale-95 cursor-pointer"
                title="View Profile"
              >
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm bg-[#EAF2FF]"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                className="bg-white text-[#1554B8] hover:bg-[#EAF2FF] font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {isSigningIn ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#1554B8]/30 border-t-[#1554B8] rounded-full animate-spin" />
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
