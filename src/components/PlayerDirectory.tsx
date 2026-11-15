import React, { useState } from 'react';
import { Player } from '../types/cricket';
import { Search, ChevronRight, ArrowLeftRight } from 'lucide-react';

interface PlayerDirectoryProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onRefresh?: () => void;
  onOpenCompare?: () => void;
}

export const PlayerDirectory: React.FC<PlayerDirectoryProps> = ({
  players,
  onSelectPlayer,
  onOpenCompare,
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
    <div className="space-y-3.5 max-w-md mx-auto px-4 pb-6 text-slate-100 animate-in fade-in duration-150">
      {/* Title */}
      <div className="flex items-center justify-between pt-0.5 gap-3">
        <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-white flex items-center gap-2">
          <span>Players</span>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            {players.length}
          </span>
        </h1>
        {onOpenCompare && (
          <button
            type="button"
            onClick={onOpenCompare}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#00F2FE]/10 hover:bg-gradient-to-r hover:from-[#00F2FE] hover:to-[#38BDF8] text-[#00F2FE] hover:text-[#0B1120] border border-[#00F2FE]/30 text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#131E32]/90 border border-white/10 rounded-xl text-xs font-semibold select-none backdrop-blur-md">
        {[
          { id: 'all' as const, label: `All (${players.length})` },
          { id: 'available' as const, label: `Active (${availableCount})` },
          { id: 'unavailable' as const, label: `Inactive (${unavailableCount})` },
        ].map((tab) => {
          const isActive = availabilityFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAvailabilityFilter(tab.id)}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap truncate ${
                isActive
                  ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search players by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 transition-all shadow-inner"
        />
      </div>

      {/* Player List */}
      <div className="space-y-2">
        {filteredPlayers.length === 0 ? (
          <div className="stadium-card border border-white/10 rounded-2xl p-6 text-center text-xs text-slate-400 space-y-2 shadow-lg">
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
                className="stadium-card border border-white/10 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 shadow-sm hover:border-[#00F2FE]/50 transition-all cursor-pointer group active:scale-[0.99]"
              >
                {/* Serial Number */}
                <span className="font-sans font-bold text-sm text-slate-500 w-5 shrink-0 text-center font-mono">
                  {serialNo}
                </span>

                {/* Player Profile Image */}
                <img
                  src={player.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt={player.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-[#00F2FE]/40 shadow-xs shrink-0 bg-slate-800"
                />

                {/* Name & Playing Style */}
                <div className="min-w-0 flex-1 truncate pr-1">
                  <h3 className="font-sans font-bold text-xs sm:text-sm text-white truncate leading-tight group-hover:text-[#00F2FE] transition-colors">
                    {player.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {formatStyle(player)}
                  </p>
                </div>

                {/* Availability Badge */}
                <span
                  className={`font-sans font-bold text-[10px] px-2.5 py-1 rounded-full shrink-0 shadow-xs ${
                    isAvail
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isAvail ? 'Available' : 'Unavailable'}
                </span>

                {/* Right Arrow */}
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#00F2FE] group-hover:translate-x-0.5 transition-all shrink-0 -ml-1" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
