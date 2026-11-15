import React from 'react';
import { Logo } from './Logo';
import { Player, UserRole } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Home,
  Calendar,
  Activity,
  Users,
  BarChart2,
  User,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  LogIn,
  Shield,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { InstallPWA } from './InstallPWA';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigate: (tab: any) => void;
  onOpenMatchesMenu: () => void;
  onOpenProfileMenu: () => void;
  currentUserPlayer?: Player;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigate,
  onOpenMatchesMenu,
  onOpenProfileMenu,
  currentUserPlayer,
}) => {
  const { currentUser, isAdmin, signInWithGoogle, signOut, isSigningIn } = useAuth();

  if (!isOpen) return null;

  const playerName = currentUserPlayer?.fullName || currentUser?.displayName || 'Cricket Player';
  const playerRole = currentUserPlayer?.playingRole
    ? currentUserPlayer.playingRole.replace(/_/g, ' ')
    : 'Club Member';
  const avatarUrl =
    currentUserPlayer?.photoUrl ||
    currentUser?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80';

  const primaryNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'matches', label: 'Matches', icon: Calendar, action: onOpenMatchesMenu },
    { id: 'live', label: 'Live', icon: Activity },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'compare', label: 'Compare Players', icon: ArrowLeftRight },
    { id: 'leaderboard', label: 'Stats', icon: BarChart2 },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
    { id: 'profile', label: 'Profile', icon: User, action: onOpenProfileMenu },
  ];

  const secondaryNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
    { id: 'about', label: 'About LocalXI', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 left-0 w-[84%] max-w-[310px] bg-white border-r border-[#DFE7F2] shadow-2xl flex flex-col text-[#172033] animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#0B3F91] bg-[#1554B8] text-white">
          <div className="flex items-center gap-2.5">
            <Logo variant="full" className="h-8" />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* User Profile Card */}
        <div
          onClick={() => {
            onClose();
            onOpenProfileMenu();
          }}
          className="mx-3 mt-3.5 p-3 bg-[#EAF2FF] hover:bg-[#1554B8] border border-[#DFE7F2] rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={avatarUrl}
              alt={playerName}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#1554B8] shadow-xs bg-white"
            />
            <div className="min-w-0">
              <h3 className="font-sans font-bold text-sm text-[#172033] group-hover:text-white truncate leading-tight">
                {playerName}
              </h3>
              <p className="text-[11px] text-[#718096] group-hover:text-[#EAF2FF] font-medium truncate mt-0.5">
                {playerRole}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#1554B8] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 no-scrollbar">
          {/* Primary Navigation */}
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.action) {
                      item.action();
                    } else {
                      onNavigate(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1554B8] text-white shadow-xs'
                      : 'text-[#718096] hover:bg-[#EAF2FF] hover:text-[#172033]'
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? 'text-white stroke-[2.4]' : 'text-[#718096] stroke-[1.8]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Subtle horizontal divider */}
          <div className="border-t border-[#DFE7F2] my-3 mx-1" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    alert(`${item.label} section coming soon.`);
                  }}
                  className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:bg-[#EAF2FF] hover:text-[#172033] transition-all cursor-pointer"
                >
                  <Icon className="w-4.5 h-4.5 text-[#718096] shrink-0 stroke-[1.8]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#DFE7F2] bg-white space-y-2">
          <div className="px-1">
            <InstallPWA />
          </div>

          {currentUser ? (
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to log out?')) {
                  try {
                    onClose();
                    await signOut();
                  } catch (err) {
                    console.error('Logout error:', err);
                  }
                }
              }}
              className="w-full bg-[#EAF2FF] hover:bg-red-50 border border-[#DFE7F2] text-[#D94343] font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <LogOut className="w-4 h-4 stroke-[2.2]" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={async () => {
                if (!isSigningIn) {
                  onClose();
                  await signInWithGoogle();
                }
              }}
              disabled={isSigningIn}
              className="w-full bg-[#1554B8] hover:bg-[#0B3F91] disabled:bg-[#1554B8]/50 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 stroke-[2.2]" />
              )}
              <span>{isSigningIn ? 'Signing in...' : 'Sign In with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
