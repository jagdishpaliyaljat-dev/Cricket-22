import React from 'react';
import { CricketMatch } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { Play, Eye, UserCheck, MapPin, Clock, Trophy } from 'lucide-react';
import { calculateRunRate } from '../lib/cricketEngine';

interface MatchCardProps {
  match: CricketMatch;
  onOpenScorecard: (match: CricketMatch) => void;
  onOpenScoringPad: (match: CricketMatch) => void;
  onOpenAvailability: (match: CricketMatch) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onOpenScorecard,
  onOpenScoringPad,
  onOpenAvailability,
}) => {
  const { isScorer } = useAuth();

  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const isScheduled = match.status === 'scheduled';

  // Format date
  const dateObj = new Date(match.dateTime);
  const matchDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const matchTime = dateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate scores
  const inn1 = match.innings1;
  const inn2 = match.innings2;

  // Determine which team batted first
  const battingFirstId =
    match.toss?.decision === 'bat'
      ? match.toss.winnerTeamId
      : match.toss?.winnerTeamId === match.teamA.id
      ? match.teamB.id
      : match.teamA.id;

  const team1IsA = battingFirstId === match.teamA.id;
  const team1Name = team1IsA ? match.teamA.name : match.teamB.name;
  const team2Name = team1IsA ? match.teamB.name : match.teamA.name;

  // Helper for team initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Determine win/loss status for badge
  const team1Id = team1IsA ? match.teamA.id : match.teamB.id;
  const team2Id = team1IsA ? match.teamB.id : match.teamA.id;
  const team1Won = isCompleted && match.result?.winnerTeamId === team1Id;
  const team2Won = isCompleted && match.result?.winnerTeamId === team2Id;

  return (
    <div
      className={`rounded-3xl border ${
        isLive
          ? 'stadium-card-glow border-[#00F2FE]/30'
          : 'stadium-card border-white/10'
      } p-4 hover:border-[#00F2FE]/40 transition-all shadow-xl flex flex-col justify-between relative overflow-hidden group`}
    >
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#EF4444] via-[#00F2FE] to-[#2563EB]" />
      )}

      <div>
        {/* Top Header: Title, Venue & Status */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0 flex-1 truncate pr-1">
            <h3 className="font-display font-bold text-sm text-white tracking-tight leading-snug truncate group-hover:text-[#00F2FE] transition-colors">
              {match.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px]">
                <MapPin className="w-3 h-3 text-[#00F2FE] shrink-0" />
                <span className="truncate">{match.venue}</span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                {matchDate}, {matchTime}
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="shrink-0">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EF4444] text-white font-mono text-[9px] font-black shadow-[0_0_10px_#EF4444] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#10B981] bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 rounded-full shadow-xs">
                <Trophy className="w-2.5 h-2.5" />
                FINAL
              </span>
            )}
            {isScheduled && (
              <span className="text-[9px] font-mono font-bold text-[#00F2FE] bg-[#00F2FE]/15 border border-[#00F2FE]/30 px-2 py-0.5 rounded-full">
                UPCOMING
              </span>
            )}
          </div>
        </div>

        {/* Format & Rules Badge Strip */}
        <div className="text-[10px] text-slate-400 mb-3 flex items-center gap-1.5 font-mono flex-wrap">
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/10 text-slate-300">
            {match.playersPerTeam}v{match.playersPerTeam}
          </span>
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/10 text-slate-300">
            {match.oversPerInnings} ov
          </span>
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/10 text-slate-300">
            Max {match.rules.maxWickets} wkts
          </span>
        </div>

        {/* Scoreboard Box */}
        <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10 mb-3 space-y-2.5">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate pr-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-[#00F2FE] shrink-0">
                {getInitials(team1Name)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate">
                    {team1Name}
                  </span>
                  {isCompleted && match.result?.winnerTeamId && (
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        team1Won ? 'bg-[#10B981] text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {team1Won ? 'Win' : 'Loss'}
                    </span>
                  )}
                </div>
                {match.currentInnings === 1 && isLive && (
                  <span className="text-[9px] text-[#00F2FE] font-mono font-bold uppercase tracking-wider block mt-0.5">
                    Batting Now
                  </span>
                )}
              </div>
            </div>

            <div className="font-mono text-right shrink-0">
              {inn1 ? (
                <div
                  className={`text-xs sm:text-sm font-bold tabular-nums ${
                    match.currentInnings === 1 && isLive ? 'text-[#00F2FE]' : 'text-slate-200'
                  }`}
                >
                  {inn1.totalRuns}/{inn1.wickets}
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">
                    ({inn1.legalOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate pr-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-[#00F2FE] shrink-0">
                {getInitials(team2Name)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate">
                    {team2Name}
                  </span>
                  {isCompleted && match.result?.winnerTeamId && (
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        team2Won ? 'bg-[#10B981] text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {team2Won ? 'Win' : 'Loss'}
                    </span>
                  )}
                </div>
                {match.currentInnings === 2 && isLive && (
                  <span className="text-[9px] text-[#00F2FE] font-mono font-bold uppercase tracking-wider block mt-0.5">
                    Batting Now
                  </span>
                )}
              </div>
            </div>

            <div className="font-mono text-right shrink-0">
              {inn2 ? (
                <div
                  className={`text-xs sm:text-sm font-bold tabular-nums ${
                    match.currentInnings === 2 && isLive ? 'text-[#00F2FE]' : 'text-slate-200'
                  }`}
                >
                  {inn2.totalRuns}/{inn2.wickets}
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">
                    ({inn2.legalOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Live Chase Equation or Match Summary */}
          {isLive && match.currentInnings === 2 && match.targetRuns && inn2 && (
            <div className="pt-2 border-t border-white/10 text-[10.5px] text-[#00F2FE] flex flex-wrap items-center justify-between gap-1 font-mono bg-[#00F2FE]/10 px-2.5 py-1.5 rounded-xl border border-[#00F2FE]/20">
              <span>
                Target: <strong className="text-white font-bold">{match.targetRuns}</strong>
              </span>
              <span>
                Need <strong className="text-white font-bold">{Math.max(0, match.targetRuns - inn2.totalRuns)}</strong> from{' '}
                <strong className="text-white font-bold">{Math.max(0, match.oversPerInnings * match.rules.legalBallsPerOver - inn2.legalBalls)}</strong> b
              </span>
            </div>
          )}

          {isLive && match.currentInnings === 1 && inn1 && (
            <div className="pt-1.5 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>
                CRR: <strong className="text-[#00F2FE]">{calculateRunRate(inn1.totalRuns, inn1.legalBalls, match.rules.legalBallsPerOver)}</strong>
              </span>
              <span>
                Proj: <strong className="text-white">{Math.round(calculateRunRate(inn1.totalRuns, inn1.legalBalls, match.rules.legalBallsPerOver) * match.oversPerInnings)}</strong>
              </span>
            </div>
          )}

          {isCompleted && match.result && (
            <div className="pt-2 border-t border-white/10 text-[11px] text-[#10B981] font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
              <span className="truncate">{match.result.summaryText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 pt-1">
        <button
          onClick={() => onOpenScorecard(match)}
          className="flex-1 min-w-[75px] min-h-[38px] px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-press"
        >
          <Eye className="w-3.5 h-3.5 shrink-0 text-[#00F2FE]" />
          <span>Scorecard</span>
        </button>

        {isScheduled && (
          <button
            onClick={() => onOpenAvailability(match)}
            className="flex-1 min-w-[75px] min-h-[38px] px-3 py-1.5 text-xs font-bold text-[#00F2FE] bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 rounded-xl border border-[#00F2FE]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-press"
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">RSVP</span>
          </button>
        )}

        {isScorer && !isCompleted && (
          <button
            onClick={() => onOpenScoringPad(match)}
            className="flex-1 min-w-[85px] min-h-[38px] px-3 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-[#00F2FE] to-[#2563EB] hover:opacity-95 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all cursor-pointer touch-press"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="truncate">{isLive ? 'Score Live' : 'Start Toss'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
