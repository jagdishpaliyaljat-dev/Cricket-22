import React, { useState } from 'react';
import { Player } from '../types/cricket';
import { Search, ChevronRight } from 'lucide-react';

interface PlayerDirectoryProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onRefresh?: () => void;
}

export const PlayerDirectory: React.FC<PlayerDirectoryProps> = ({
  players,
  onSelectPlayer,
}) => {
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Calculate dynamic counts
  const availableCount = players.filter((p) => p.status === 'active').length;
  const unavailableCount = players.filter((p) => p.status !== 'active').length;

  const filteredPlayers = players.filter((p) => {
    const isAvail = p.status === 'active';
    if (availabilityFilter === 'available' && !isAvail) return false;
    if (availabilityFilter === 'unavailable' && isAvail) return false;
    if (search.trim() && !p.fullName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatStyle = (p: Player) => {
    const bat = p.battingStyle?.includes('left') ? 'Left Hand Bat' : 'Right Hand Bat';
    let bowl = 'Right Arm Medium';
    if (p.bowlingStyle?.includes('left_arm_spin')) bowl = 'Left Arm Spin';
    else if (p.bowlingStyle?.includes('right_arm_spin') || p.bowlingStyle?.includes('spin') || p.bowlingStyle?.includes('off')) {
      bowl = p.fullName.includes('Mohit') ? 'Leg Spin' : 'Right Arm Off';
    } else if (p.bowlingStyle?.includes('fast')) {
      bowl = 'Right Arm Fast';
    } else if (p.bowlingStyle?.includes('medium')) {
      bowl = 'Right Arm Medium';
    }
    return `${bat} • ${bowl}`;
  };

  return (
    <div className="space-y-3.5 max-w-md mx-auto px-4 pb-6 text-[#172033] animate-in fade-in duration-150">
      {/* Title */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-[#172033]">
          Players
        </h1>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAF2FF] border border-[#DFE7F2] rounded-xl text-xs font-semibold select-none">
        {[
          { id: 'all' as const, label: `All (${players.length})` },
          { id: 'available' as const, label: `Available (${availableCount})` },
          { id: 'unavailable' as const, label: `Unavailable (${unavailableCount})` },
        ].map((tab) => {
          const isActive = availabilityFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAvailabilityFilter(tab.id)}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap truncate ${
                isActive
                  ? 'bg-[#1554B8] text-white font-bold shadow-xs'
                  : 'text-[#718096] hover:text-[#172033]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search players by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-[#DFE7F2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#172033] placeholder-[#718096] focus:outline-none focus:border-[#1554B8] transition-colors shadow-xs"
        />
      </div>

      {/* Player List */}
      <div className="space-y-2">
        {filteredPlayers.length === 0 ? (
          <div className="bg-white border border-[#DFE7F2] rounded-2xl p-6 text-center text-xs text-[#718096] space-y-2 shadow-xs">
            <p>No players found matching your criteria.</p>
          </div>
        ) : (
          filteredPlayers.map((player, index) => {
            const isAvail = player.status === 'active';
            const serialNo = index + 1;

            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="bg-white hover:bg-[#F2F6FC] border border-[#DFE7F2] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 shadow-xs hover:border-[#1554B8] transition-all cursor-pointer group active:scale-[0.99]"
              >
                {/* Serial Number */}
                <span className="font-sans font-bold text-sm text-[#718096] w-5 shrink-0 text-center font-mono">
                  {serialNo}
                </span>

                {/* Player Profile Image */}
                <img
                  src={player.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt={player.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-[#1554B8] shadow-xs shrink-0 bg-[#EAF2FF]"
                />

                {/* Name & Playing Style */}
                <div className="min-w-0 flex-1 truncate pr-1">
                  <h3 className="font-sans font-bold text-xs sm:text-sm text-[#172033] truncate leading-tight">
                    {player.fullName}
                  </h3>
                  <p className="text-[11px] text-[#718096] font-medium truncate mt-0.5">
                    {formatStyle(player)}
                  </p>
                </div>

                {/* Availability Badge */}
                <span
                  className={`font-sans font-bold text-[10px] px-2.5 py-1 rounded-full shrink-0 shadow-xs ${
                    isAvail
                      ? 'bg-[#21864A] text-white'
                      : 'bg-[#D94343] text-white'
                  }`}
                >
                  {isAvail ? 'Available' : 'Unavailable'}
                </span>

                {/* Right Arrow */}
                <ChevronRight className="w-4 h-4 text-[#718096] group-hover:text-[#1554B8] transition-colors shrink-0 -ml-1" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
