import React from 'react';
import { ArrowLeft, User, Edit3, CalendarCheck, BarChart2, Trophy, ChevronRight } from 'lucide-react';

interface ProfileMenuViewProps {
  onBack: () => void;
  onSelectOption: (option: 'my_profile' | 'edit_profile' | 'availability' | 'stats' | 'matches') => void;
}

export const ProfileMenuView: React.FC<ProfileMenuViewProps> = ({
  onBack,
  onSelectOption,
}) => {
  const profileRows = [
    {
      id: 'my_profile' as const,
      label: 'My Profile',
      icon: User,
    },
    {
      id: 'edit_profile' as const,
      label: 'Edit Profile',
      icon: Edit3,
    },
    {
      id: 'availability' as const,
      label: 'Availability',
      icon: CalendarCheck,
    },
    {
      id: 'stats' as const,
      label: 'My Stats',
      icon: BarChart2,
    },
    {
      id: 'matches' as const,
      label: 'My Matches',
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-12 text-[#172033] animate-in fade-in duration-150 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-[#DFE7F2]">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="font-sans font-bold text-base text-[#172033] text-center">
          Profile
        </h1>

        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Menu Rows */}
      <div className="space-y-2.5 pt-1">
        {profileRows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              onClick={() => onSelectOption(row.id)}
              className="bg-white hover:bg-[#F2F6FC] border border-[#DFE7F2] hover:border-[#1554B8] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center shrink-0 text-[#1554B8]">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="font-sans font-bold text-sm text-[#172033] group-hover:text-[#1554B8] transition-colors">
                  {row.label}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-[#718096] group-hover:text-[#1554B8] group-hover:translate-x-0.5 transition-all" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
