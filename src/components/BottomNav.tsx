import React from 'react';
import { Home, Calendar, Activity, Users, BarChart2, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'matches' | 'live' | 'players' | 'leaderboard' | 'admin' | 'profile';
  setCurrentTab: (tab: 'home' | 'matches' | 'live' | 'players' | 'leaderboard' | 'admin' | 'profile') => void;
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-lg border-t border-[#DFE7F2] pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-md">
      <div className="max-w-md mx-auto grid grid-cols-6 items-center px-1 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[46px] py-1 px-0.5 transition-colors relative cursor-pointer group ${
                isActive ? 'text-[#1554B8]' : 'text-[#718096] hover:text-[#172033]'
              }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-105 stroke-[2.4] text-[#1554B8]' : 'stroke-[1.8] text-[#718096]'
                  }`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 bg-[#D94343] text-white text-[9px] font-sans font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10.5px] mt-1 tracking-tight leading-none ${
                  isActive ? 'font-bold text-[#1554B8]' : 'font-medium text-[#718096]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active blue indicator bar */}
              {isActive && (
                <span className="w-5 h-0.5 bg-[#1554B8] rounded-full mt-1 animate-in fade-in duration-200" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
