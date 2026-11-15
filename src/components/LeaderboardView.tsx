import React, { useState } from 'react';
import { Player } from '../types/cricket';
import { calculateStrikeRate, calculateEconomy } from '../lib/cricketEngine';
import { Trophy, Award, Target, Flame, Search, Crown } from 'lucide-react';

interface LeaderboardViewProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  players,
  onSelectPlayer,
}) => {
  const [category, setCategory] = useState<'runs' | 'wickets' | 'strikeRate' | 'economy' | 'potm'>('runs');
  const [requireMinMatches, setRequireMinMatches] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const MIN_MATCHES = 3;

  // Filter players by eligibility and search
  const filteredPlayers = players.filter((p) => {
    if (requireMinMatches && p.career.matches < MIN_MATCHES) return false;
    if (searchQuery.trim() && !p.fullName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return p.status === 'active';
  });

  // Sort based on category
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (category) {
      case 'runs':
        return b.career.runs - a.career.runs;
      case 'wickets':
        return b.career.wickets - a.career.wickets;
      case 'strikeRate': {
        const srA = calculateStrikeRate(a.career.runs, a.career.ballsFaced);
        const srB = calculateStrikeRate(b.career.runs, b.career.ballsFaced);
        return srB - srA;
      }
      case 'economy': {
        const econA = calculateEconomy(a.career.runsConceded, a.career.ballsBowled);
        const econB = calculateEconomy(b.career.runsConceded, b.career.ballsBowled);
        if (econA === 0) return 1;
        if (econB === 0) return -1;
        return econA - econB;
      }
      case 'potm':
        return b.career.potmAwards - a.career.potmAwards;
      default:
        return 0;
    }
  });

  const getMetricLabel = (p: Player) => {
    switch (category) {
      case 'runs':
        return `${p.career.runs} Runs`;
      case 'wickets':
        return `${p.career.wickets} Wickets`;
      case 'strikeRate':
        return `${calculateStrikeRate(p.career.runs, p.career.ballsFaced)} SR`;
      case 'economy':
        return `${calculateEconomy(p.career.runsConceded, p.career.ballsBowled)} Econ`;
      case 'potm':
        return `${p.career.potmAwards} Awards`;
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-8 font-sans text-slate-100">
      {/* Title & Eligibility Toggle */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="font-sans font-black text-xl text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#00F2FE]" />
            <span>Leaderboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Career statistics and rankings across official matches.
          </p>
        </div>

        {/* Minimum match threshold toggle */}
        <label className="flex items-center gap-2 bg-[#131E32]/90 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer text-xs backdrop-blur-md">
          <input
            type="checkbox"
            checked={requireMinMatches}
            onChange={(e) => setRequireMinMatches(e.target.checked)}
            className="accent-[#00F2FE] w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-slate-300 font-mono text-[11px] font-semibold">
            Min {MIN_MATCHES} M
          </span>
        </label>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'runs', label: 'Runs', icon: Flame },
          { id: 'wickets', label: 'Wickets', icon: Target },
          { id: 'strikeRate', label: 'Strike Rate', icon: Trophy },
          { id: 'economy', label: 'Economy', icon: Trophy },
          { id: 'potm', label: 'MOTM', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id as typeof category)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer touch-press ${
                isActive
                  ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'bg-[#131E32]/80 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search player..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] shadow-inner"
        />
      </div>

      {/* Leaderboard Table List */}
      <div className="stadium-card rounded-2xl border border-white/10 overflow-hidden shadow-lg">
        <div className="bg-white/5 px-3.5 py-2.5 border-b border-white/10 text-xs font-semibold text-slate-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="w-6 text-center font-mono">#</span>
            <span>Player</span>
          </div>
          <span className="font-mono text-right text-[#00F2FE]">
            {category.toUpperCase()}
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {sortedPlayers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No players found matching the criteria.
            </div>
          ) : (
            sortedPlayers.map((player, idx) => {
              const rank = idx + 1;

              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="px-3.5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer touch-press gap-2 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.5)] font-black'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950 shadow-xs font-black'
                          : rank === 3
                          ? 'bg-amber-700 text-amber-100 shadow-xs font-black'
                          : 'text-slate-500 bg-white/5'
                      }`}
                    >
                      {rank}
                    </span>

                    <div className="min-w-0 flex-1 truncate">
                      <div className="font-semibold text-xs text-white group-hover:text-[#00F2FE] transition-colors truncate">
                        {player.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize truncate mt-0.5">
                        {player.playingRole.replace(/_/g, ' ')} · {player.career.matches} M
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Metric */}
                  <div className="font-mono text-right shrink-0">
                    {category === 'runs' && (
                      <div>
                        <span className="font-black text-sm text-[#00F2FE] tabular-nums">
                          {player.career.runs}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {player.career.innings} inns
                        </span>
                      </div>
                    )}

                    {category === 'wickets' && (
                      <div>
                        <span className="font-black text-sm text-[#00F2FE] tabular-nums">
                          {player.career.wickets}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {player.career.oversBowled} ov
                        </span>
                      </div>
                    )}

                    {category === 'strikeRate' && (
                      <span className="font-black text-sm text-[#00F2FE] tabular-nums">
                        {calculateStrikeRate(player.career.runs, player.career.ballsFaced)}
                      </span>
                    )}

                    {category === 'economy' && (
                      <span className="font-black text-sm text-[#00F2FE] tabular-nums">
                        {calculateEconomy(player.career.runsConceded, player.career.ballsBowled)}
                      </span>
                    )}

                    {category === 'potm' && (
                      <span className="font-black text-sm text-amber-400 tabular-nums">
                        {player.career.potmAwards}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
