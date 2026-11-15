import React from 'react';
import { ArrowLeft, Calendar, Activity, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

interface MatchesMenuViewProps {
  onBack: () => void;
  onSelectFilter: (filter: 'all' | 'live' | 'scheduled' | 'completed') => void;
}

export const MatchesMenuView: React.FC<MatchesMenuViewProps> = ({
  onBack,
  onSelectFilter,
}) => {
  const menuRows = [
    {
      id: 'all' as const,
      label: 'All Matches',
      icon: Calendar,
      active: true,
    },
    {
      id: 'live' as const,
      label: 'Live Matches',
      icon: Activity,
      active: false,
      isLive: true,
    },
    {
      id: 'scheduled' as const,
      label: 'Upcoming Matches',
      icon: Clock,
      active: false,
    },
    {
      id: 'completed' as const,
      label: 'Completed Matches',
      icon: CheckCircle2,
      active: false,
    },
  ];

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-12 text-slate-100 animate-in fade-in duration-150 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-slate-300 hover:text-[#00F2FE] rounded-lg transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="font-sans font-bold text-base text-white text-center">
          Matches
        </h1>

        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Menu Rows */}
      <div className="space-y-2.5 pt-1">
        {menuRows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              onClick={() => onSelectFilter(row.id)}
              className="stadium-card border border-white/10 hover:border-[#00F2FE]/50 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-md group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  row.isLive 
                    ? 'bg-red-500/20 text-[#EF4444] border-red-500/30' 
                    : 'bg-[#00F2FE]/10 text-[#00F2FE] border-[#00F2FE]/25'
                }`}>
                  <Icon className={`w-5 h-5 ${row.isLive ? 'animate-pulse stroke-[2.2]' : 'stroke-[2]'}`} />
                </div>
                <span className="font-sans font-bold text-sm text-white group-hover:text-[#00F2FE] transition-colors">
                  {row.label}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#00F2FE] group-hover:translate-x-0.5 transition-all" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
