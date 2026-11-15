import React from 'react';
import { Home, Calendar, Activity, Users, BarChart2, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'matches' | 'live' | 'players' | 'compare' | 'leaderboard' | 'admin' | 'profile';
  setCurrentTab: (tab: 'home' | 'matches' | 'live' | 'players' | 'compare' | 'leaderboard' | 'admin' | 'profile') => void;
  liveMatchCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  liveMatchCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      badge: null,
    },
    {
      id: 'matches' as const,
      label: 'Matches',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'live' as const,
      label: 'Live',
      icon: Activity,
      badge: liveMatchCount > 0 ? liveMatchCount : null,
    },
    {
      id: 'players' as const,
      label: 'Players',
      icon: Users,
      badge: null,
    },
    {
      id: 'leaderboard' as const,
      label: 'Stats',
      icon: BarChart2,
      badge: null,
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1120]/95 backdrop-blur-2xl border-t border-white/10 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      <div className="max-w-md mx-auto grid grid-cols-6 items-center px-1.5 pt-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id || (tab.id === 'players' && currentTab === 'compare');

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-0.5 transition-all relative cursor-pointer group touch-press rounded-xl ${
                isActive ? 'text-[#00F2FE]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? 'scale-110 stroke-[2.4] text-[#00F2FE] drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]'
                      : 'stroke-[1.8] text-slate-400 group-hover:scale-105'
                  }`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#EF4444] text-white text-[9px] font-sans font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight leading-none transition-colors ${
                  isActive ? 'font-bold text-[#00F2FE]' : 'font-medium text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>

              {/* Glowing active pill indicator */}
              {isActive && (
                <span className="w-4 h-1 bg-[#00F2FE] rounded-full mt-1.5 shadow-[0_0_8px_#00F2FE] animate-in fade-in zoom-in-75 duration-200" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
