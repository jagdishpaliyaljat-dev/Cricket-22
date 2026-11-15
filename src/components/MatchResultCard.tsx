import React, { forwardRef } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { Award, Trophy } from 'lucide-react';

interface MatchResultCardProps {
  match: CricketMatch;
  playersMap: Record<string, Player>;
}

export const MatchResultCard = forwardRef<HTMLDivElement, MatchResultCardProps>(({ match, playersMap }, ref) => {
  const allBatters = [
    ...(Object.values(match.innings1?.batters || {})),
    ...(Object.values(match.innings2?.batters || {})),
  ];
  const allBowlers = [
    ...(Object.values(match.innings1?.bowlers || {})),
    ...(Object.values(match.innings2?.bowlers || {})),
  ];

  const topBatter = allBatters.sort((a, b) => b.runs - a.runs)[0];
  const topBowler = allBowlers.sort((a, b) => b.wickets - a.wickets)[0];
  const potm = match.result?.playerOfTheMatchId ? playersMap[match.result.playerOfTheMatchId] : null;

  return (
    <div
      ref={ref}
      className="w-[420px] bg-[#0B1120] p-6 text-slate-100 space-y-4 rounded-3xl shadow-[0_0_40px_rgba(0,242,254,0.2)] border border-cyan-500/30 relative overflow-hidden font-sans"
    >
      {/* Ambient stadium glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#00F2FE]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-600/15 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00F2FE] text-[10px] font-black uppercase tracking-widest mb-1">
          <Trophy className="w-3 h-3 text-[#00F2FE]" />
          <span>Match Summary</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">{match.title}</h2>
        <p className="text-xs text-slate-400 font-medium">
          {match.venue || 'Stadium'} • {new Date(match.dateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Result summary banner */}
      <div className="relative z-10 bg-[#131D33] p-4 rounded-2xl text-center border border-white/10 shadow-inner">
        <h3 className="text-lg font-black text-[#00F2FE] tracking-wide">
          {match.result?.summaryText || 'Match Concluded'}
        </h3>
      </div>

      {/* Highlights Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 text-center">
        {potm && (
          <div className="bg-[#131D33]/90 border border-amber-500/30 p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <Award className="w-5 h-5 mx-auto text-amber-400 mb-1" />
            <div>
              <p className="text-[9px] uppercase font-black tracking-wider text-amber-300">POTM</p>
              <p className="text-xs font-bold truncate text-white mt-0.5">{potm.fullName}</p>
            </div>
          </div>
        )}
        {topBatter && (
          <div className="bg-[#131D33]/90 border border-white/10 p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Top Batter</p>
              <p className="text-xs font-bold truncate text-white mt-0.5">{topBatter.playerName}</p>
            </div>
            <p className="text-sm font-black font-mono text-[#00F2FE] mt-1">
              {topBatter.runs} <span className="text-[11px] text-slate-400 font-normal">({topBatter.balls})</span>
            </p>
          </div>
        )}
        {topBowler && (
          <div className="bg-[#131D33]/90 border border-white/10 p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Top Bowler</p>
              <p className="text-xs font-bold truncate text-white mt-0.5">{topBowler.playerName}</p>
            </div>
            <p className="text-sm font-black font-mono text-emerald-400 mt-1">
              {topBowler.wickets}/{topBowler.runsConceded}
            </p>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 text-center pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span className="font-extrabold tracking-tight text-white">
          Local<span className="text-[#00F2FE]">XI</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Live Broadcast Card</span>
      </div>
    </div>
  );
});

MatchResultCard.displayName = 'MatchResultCard';
