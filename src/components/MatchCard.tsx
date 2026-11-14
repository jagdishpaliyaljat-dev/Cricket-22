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
      className={`bg-white rounded-2xl border ${
        isLive ? 'border-[#1554B8]' : 'border-[#DFE7F2]'
      } p-3 sm:p-3.5 hover:border-[#1554B8] transition-all shadow-xs flex flex-col justify-between relative overflow-hidden`}
    >
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1554B8] to-[#2878E5]" />
      )}

      <div>
        {/* Top Header: Title, Venue & Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1 truncate pr-1">
            <h3 className="font-display font-bold text-sm text-[#172033] tracking-tight leading-snug truncate">
              {match.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[10.5px] text-[#718096] mt-0.5">
              <span className="flex items-center gap-1 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px]">
                <MapPin className="w-3 h-3 text-[#1554B8] shrink-0" />
                <span className="truncate">{match.venue}</span>
              </span>
              <span className="text-[#DFE7F2]">·</span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-[#718096] shrink-0" />
                {matchDate}, {matchTime}
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="shrink-0">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D94343] text-white font-mono text-[9px] font-bold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-white bg-[#21864A] px-2 py-0.5 rounded-full shadow-xs">
                <Trophy className="w-2.5 h-2.5" />
                FINAL
              </span>
            )}
            {isScheduled && (
              <span className="text-[9px] font-mono font-semibold text-[#1554B8] bg-[#EAF2FF] border border-[#DFE7F2] px-2 py-0.5 rounded-full">
                UPCOMING
              </span>
            )}
          </div>
        </div>

        {/* Format & Rules Badge Strip */}
        <div className="text-[10px] text-[#718096] mb-2.5 flex items-center gap-1.5 font-mono flex-wrap">
          <span className="bg-[#F2F6FC] px-2 py-0.5 rounded-md border border-[#DFE7F2]">
            {match.playersPerTeam}v{match.playersPerTeam}
          </span>
          <span className="bg-[#F2F6FC] px-2 py-0.5 rounded-md border border-[#DFE7F2]">
            {match.oversPerInnings} ov
          </span>
          <span className="bg-[#F2F6FC] px-2 py-0.5 rounded-md border border-[#DFE7F2]">
            Max {match.rules.maxWickets} wkts
          </span>
        </div>

        {/* Scoreboard Box */}
        <div className="bg-[#F2F6FC] rounded-xl p-2.5 border border-[#DFE7F2] mb-2.5 space-y-2">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate pr-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center font-bold text-[10px] text-[#1554B8] shrink-0">
                {getInitials(team1Name)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-[#172033] truncate">
                    {team1Name}
                  </span>
                  {isCompleted && match.result?.winnerTeamId && (
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        team1Won ? 'bg-[#21864A] text-white' : 'bg-[#EAF2FF] text-[#718096]'
                      }`}
                    >
                      {team1Won ? 'Win' : 'Loss'}
                    </span>
                  )}
                </div>
                {match.currentInnings === 1 && isLive && (
                  <span className="text-[9px] text-[#1554B8] font-mono font-bold uppercase tracking-wider block">
                    Batting Now
                  </span>
                )}
              </div>
            </div>

            <div className="font-mono text-right shrink-0">
              {inn1 ? (
                <div
                  className={`text-xs sm:text-sm font-bold tabular-nums ${
                    match.currentInnings === 1 && isLive ? 'text-[#1554B8]' : 'text-[#172033]'
                  }`}
                >
                  {inn1.totalRuns}/{inn1.wickets}
                  <span className="text-[10px] text-[#718096] ml-1 font-normal">
                    ({inn1.legalOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-[#718096] italic">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between pt-1.5 border-t border-[#DFE7F2]">
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate pr-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center font-bold text-[10px] text-[#1554B8] shrink-0">
                {getInitials(team2Name)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-[#172033] truncate">
                    {team2Name}
                  </span>
                  {isCompleted && match.result?.winnerTeamId && (
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        team2Won ? 'bg-[#21864A] text-white' : 'bg-[#EAF2FF] text-[#718096]'
                      }`}
                    >
                      {team2Won ? 'Win' : 'Loss'}
                    </span>
                  )}
                </div>
                {match.currentInnings === 2 && isLive && (
                  <span className="text-[9px] text-[#1554B8] font-mono font-bold uppercase tracking-wider block">
                    Batting Now
                  </span>
                )}
              </div>
            </div>

            <div className="font-mono text-right shrink-0">
              {inn2 ? (
                <div
                  className={`text-xs sm:text-sm font-bold tabular-nums ${
                    match.currentInnings === 2 && isLive ? 'text-[#1554B8]' : 'text-[#172033]'
                  }`}
                >
                  {inn2.totalRuns}/{inn2.wickets}
                  <span className="text-[10px] text-[#718096] ml-1 font-normal">
                    ({inn2.legalOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-[#718096] italic">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Live Chase Equation or Match Summary */}
          {isLive && match.currentInnings === 2 && match.targetRuns && inn2 && (
            <div className="pt-1.5 border-t border-[#DFE7F2] text-[10.5px] text-[#1554B8] flex flex-wrap items-center justify-between gap-1 font-mono bg-[#EAF2FF] px-2 py-1 rounded-lg">
              <span>
                Target: <strong className="text-[#0B3F91]">{match.targetRuns}</strong>
              </span>
              <span>
                Need <strong className="text-[#0B3F91]">{Math.max(0, match.targetRuns - inn2.totalRuns)}</strong> from{' '}
                <strong>{Math.max(0, match.oversPerInnings * match.rules.legalBallsPerOver - inn2.legalBalls)}</strong> b
              </span>
            </div>
          )}

          {isLive && match.currentInnings === 1 && inn1 && (
            <div className="pt-1 border-t border-[#DFE7F2] text-[10px] text-[#718096] flex items-center justify-between font-mono">
              <span>
                CRR: <strong className="text-[#172033]">{calculateRunRate(inn1.totalRuns, inn1.legalBalls, match.rules.legalBallsPerOver)}</strong>
              </span>
              <span>
                Proj: <strong className="text-[#172033]">{Math.round(calculateRunRate(inn1.totalRuns, inn1.legalBalls, match.rules.legalBallsPerOver) * match.oversPerInnings)}</strong>
              </span>
            </div>
          )}

          {isCompleted && match.result && (
            <div className="pt-1.5 border-t border-[#DFE7F2] text-[11px] text-[#21864A] font-semibold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-[#21864A]" />
              <span className="truncate">{match.result.summaryText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-1.5 pt-1">
        <button
          onClick={() => onOpenScorecard(match)}
          className="flex-1 min-w-[75px] min-h-[38px] px-2.5 py-1.5 text-xs font-semibold text-[#1554B8] bg-[#EAF2FF] hover:bg-[#1554B8] hover:text-white rounded-xl border border-[#DFE7F2] flex items-center justify-center gap-1 transition-all cursor-pointer touch-press"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Scorecard</span>
        </button>

        {isScheduled && (
          <button
            onClick={() => onOpenAvailability(match)}
            className="flex-1 min-w-[75px] min-h-[38px] px-2.5 py-1.5 text-xs font-semibold text-[#1554B8] bg-[#EAF2FF] hover:bg-[#1554B8] hover:text-white rounded-xl border border-[#DFE7F2] flex items-center justify-center gap-1 transition-all cursor-pointer touch-press"
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">RSVP</span>
          </button>
        )}

        {isScorer && !isCompleted && (
          <button
            onClick={() => onOpenScoringPad(match)}
            className="flex-1 min-w-[85px] min-h-[38px] px-2.5 py-1.5 text-xs font-bold text-white bg-[#1554B8] hover:bg-[#0B3F91] rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer touch-press"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="truncate">{isLive ? 'Score Live' : 'Start Toss'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
