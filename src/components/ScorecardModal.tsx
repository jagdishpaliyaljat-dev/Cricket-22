import React, { useState, useEffect } from 'react';
import { CricketMatch, Player, BallEvent } from '../types/cricket';
import { subscribeBalls } from '../services/matchService';
import { X } from 'lucide-react';
import { formatOvers, calculateStrikeRate, calculateEconomy } from '../lib/cricketEngine';

interface ScorecardModalProps {
  match: CricketMatch;
  players: Player[];
  onClose: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({ match, players, onClose }) => {
  const [selectedInnings, setSelectedInnings] = useState<1 | 2>(match.currentInnings || 1);
  const [balls, setBalls] = useState<BallEvent[]>([]);

  // Map of players for quick lookup
  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Subscribe to real-time balls for commentary
  useEffect(() => {
    const unsub = subscribeBalls(match.id, selectedInnings, (data) => {
      setBalls(data);
    });
    return () => unsub();
  }, [match.id, selectedInnings]);

  const summary = selectedInnings === 1 ? match.innings1 : match.innings2;

  // Batting team name
  const battingFirstId =
    match.toss?.decision === 'bat'
      ? match.toss.winnerTeamId
      : match.toss?.winnerTeamId === match.teamA.id
      ? match.teamB.id
      : match.teamA.id;

  const inn1TeamName = battingFirstId === match.teamA.id ? match.teamA.name : match.teamB.name;
  const inn2TeamName = battingFirstId === match.teamA.id ? match.teamB.name : match.teamA.name;
  const currentTeamName = selectedInnings === 1 ? inn1TeamName : inn2TeamName;

  const battersList = Object.values(summary?.batters || {});
  const bowlersList = Object.values(summary?.bowlers || {});

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#DFE7F2] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col text-[#172033]">
        {/* Header */}
        <div className="bg-[#1554B8] p-4 border-b border-[#0B3F91] flex items-center justify-between text-white">
          <div>
            <h2 className="font-display font-bold text-lg text-white tracking-tight">
              {match.title}
            </h2>
            <div className="text-xs text-[#EAF2FF] font-mono">
              {match.venue} · {match.playersPerTeam}v{match.playersPerTeam} ({match.oversPerInnings} ov)
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Result Banner */}
        {match.result && (
          <div className="bg-[#EAF2FF] px-4 py-2 border-b border-[#DFE7F2] text-xs text-[#1554B8] font-bold text-center">
            {match.result.summaryText}
            {match.result.playerOfTheMatchId && (
              <span className="text-[#172033] ml-2 font-normal">
                · POTM: {playersMap[match.result.playerOfTheMatchId]?.fullName || match.result.playerOfTheMatchId}
              </span>
            )}
          </div>
        )}

        {/* Innings Selector Tabs */}
        <div className="flex border-b border-[#DFE7F2] bg-white text-xs font-semibold">
          <button
            onClick={() => setSelectedInnings(1)}
            className={`flex-1 py-2.5 sm:py-3 px-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
              selectedInnings === 1
                ? 'text-[#1554B8] border-b-2 border-[#1554B8] bg-[#EAF2FF] font-bold'
                : 'text-[#718096] hover:text-[#172033]'
            }`}
          >
            <span className="truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">{inn1TeamName}</span>
            {match.innings1 && (
              <span className="font-mono text-[11px] tabular-nums shrink-0">
                ({match.innings1.totalRuns}/{match.innings1.wickets})
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedInnings(2)}
            className={`flex-1 py-2.5 sm:py-3 px-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
              selectedInnings === 2
                ? 'text-[#1554B8] border-b-2 border-[#1554B8] bg-[#EAF2FF] font-bold'
                : 'text-[#718096] hover:text-[#172033]'
            }`}
          >
            <span className="truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">{inn2TeamName}</span>
            {match.innings2 && (
              <span className="font-mono text-[11px] tabular-nums shrink-0">
                ({match.innings2.totalRuns}/{match.innings2.wickets})
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 sm:space-y-5 text-xs flex-1">
          {!summary ? (
            <div className="text-center py-12 text-[#718096] italic">
              This innings has not started yet.
            </div>
          ) : (
            <>
              {/* Innings Summary Bar */}
              <div className="bg-[#F2F6FC] p-3 sm:p-3.5 rounded-2xl border border-[#DFE7F2] flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
                <div>
                  <div className="text-[#718096] font-medium text-xs">{currentTeamName} Total</div>
                  <div className="font-display font-extrabold text-xl sm:text-2xl text-[#172033] mt-0.5">
                    {summary.totalRuns}/{summary.wickets}
                    <span className="text-xs text-[#1554B8] font-semibold ml-2 font-mono">
                      ({summary.legalOvers} of {match.oversPerInnings} ov)
                    </span>
                  </div>
                </div>

                <div className="xs:text-right text-[10.5px] xs:text-[11px] font-mono text-[#718096] space-y-0.5 pt-1 xs:pt-0 border-t xs:border-t-0 border-[#DFE7F2]">
                  <div>
                    Extras:{' '}
                    <strong className="text-[#172033]">
                      {summary.extras.total}
                    </strong>{' '}
                    (w {summary.extras.wides}, nb {summary.extras.noBalls}, b {summary.extras.byes}, lb {summary.extras.legByes})
                  </div>
                  {summary.isCompleted && (
                    <div className="text-[#E99A27] italic font-semibold">{summary.completedReason}</div>
                  )}
                </div>
              </div>

              {/* BATTING SCORECARD TABLE */}
              <div className="bg-white rounded-2xl border border-[#DFE7F2] overflow-hidden shadow-xs">
                <div className="bg-[#F2F6FC] px-3 py-2 font-semibold text-[#1554B8] flex justify-between items-center text-xs border-b border-[#DFE7F2]">
                  <span>Batting</span>
                  <div className="grid grid-cols-5 w-32 xs:w-40 sm:w-48 text-right font-mono text-[9px] xs:text-[10px] sm:text-[11px] shrink-0 text-[#718096]">
                    <span>R</span>
                    <span>B</span>
                    <span>4s</span>
                    <span>6s</span>
                    <span>SR</span>
                  </div>
                </div>

                <div className="divide-y divide-[#DFE7F2]">
                  {battersList.length === 0 ? (
                    <div className="p-3 text-[#718096] italic">No batting records yet.</div>
                  ) : (
                    battersList.map((b) => (
                      <div key={b.playerId} className="px-3 py-2 sm:py-2.5 flex items-center justify-between hover:bg-[#F2F6FC]">
                        <div className="min-w-0 flex-1 truncate pr-2">
                          <div className="font-semibold text-[#172033] truncate text-xs sm:text-sm">
                            {b.playerName}
                          </div>
                          <div className="text-[9.5px] xs:text-[10px] text-[#718096] font-mono truncate">
                            {b.isOut ? b.dismissal || 'out' : 'not out'}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 w-32 xs:w-40 sm:w-48 text-right font-mono tabular-nums text-[#172033] text-[9.5px] xs:text-[10px] sm:text-xs shrink-0">
                          <span className="font-bold text-[#172033]">{b.runs}</span>
                          <span className="text-[#718096]">{b.balls}</span>
                          <span className="text-[#718096]">{b.fours}</span>
                          <span className="text-[#718096]">{b.sixes}</span>
                          <span className="text-[#1554B8] font-bold">
                            {calculateStrikeRate(b.runs, b.balls)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* BOWLING SCORECARD TABLE */}
              <div className="bg-white rounded-2xl border border-[#DFE7F2] overflow-hidden shadow-xs">
                <div className="bg-[#F2F6FC] px-3 py-2 font-semibold text-[#1554B8] flex justify-between items-center text-xs border-b border-[#DFE7F2]">
                  <span>Bowling</span>
                  <div className="grid grid-cols-5 w-32 xs:w-40 sm:w-48 text-right font-mono text-[9px] xs:text-[10px] sm:text-[11px] shrink-0 text-[#718096]">
                    <span>O</span>
                    <span>M</span>
                    <span>R</span>
                    <span>W</span>
                    <span>Econ</span>
                  </div>
                </div>

                <div className="divide-y divide-[#DFE7F2]">
                  {bowlersList.length === 0 ? (
                    <div className="p-3 text-[#718096] italic">No bowling records yet.</div>
                  ) : (
                    bowlersList.map((bow) => (
                      <div key={bow.playerId} className="px-3 py-2 flex items-center justify-between hover:bg-[#F2F6FC]">
                        <span className="font-semibold text-[#172033] truncate min-w-0 flex-1 pr-2 text-xs sm:text-sm">
                          {bow.playerName}
                        </span>

                        <div className="grid grid-cols-5 w-32 xs:w-40 sm:w-48 text-right font-mono tabular-nums text-[#172033] text-[9.5px] xs:text-[10px] sm:text-xs shrink-0">
                          <span className="text-[#718096]">{formatOvers(bow.balls, match.rules.legalBallsPerOver)}</span>
                          <span className="text-[#718096]">{bow.maidens}</span>
                          <span className="text-[#718096]">{bow.runsConceded}</span>
                          <span className="font-bold text-[#21864A]">{bow.wickets}</span>
                          <span className="text-[#1554B8] font-bold">
                            {calculateEconomy(bow.runsConceded, bow.balls, match.rules.legalBallsPerOver)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* FALL OF WICKETS (FOW) */}
              {summary.fallOfWickets && summary.fallOfWickets.length > 0 && (
                <div className="bg-[#F2F6FC] p-3 rounded-2xl border border-[#DFE7F2]">
                  <div className="font-semibold text-[#1554B8] mb-1.5">Fall of Wickets</div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#172033]">
                    {summary.fallOfWickets.map((fow) => (
                      <span key={fow.wicketNumber} className="bg-white px-2 py-0.5 rounded border border-[#DFE7F2] shadow-2xs">
                        <strong>{fow.score}/{fow.wicketNumber}</strong> ({playersMap[fow.playerOutId]?.fullName?.split(' ')[0] || fow.playerOutId}, {fow.over} ov)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* BALL-BY-BALL COMMENTARY */}
              <div className="bg-white rounded-2xl border border-[#DFE7F2] p-3 space-y-2 shadow-xs">
                <div className="font-semibold text-[#1554B8]">Ball-by-Ball Feed ({balls.length} balls)</div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {balls.length === 0 ? (
                    <div className="text-[#718096] italic">No delivery events logged yet.</div>
                  ) : (
                    balls
                      .slice()
                      .reverse()
                      .map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-[#DFE7F2] last:border-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#1554B8] text-[11px] w-10 font-bold">
                              {b.overNumber}.{b.ballInOver}
                            </span>
                            <span className="text-[#172033]">
                              {playersMap[b.bowlerId]?.fullName?.split(' ')[0] || 'Bowler'} to{' '}
                              {playersMap[b.strikerId]?.fullName?.split(' ')[0] || 'Batter'}
                            </span>
                          </div>

                          <div className="font-mono font-bold text-right">
                            {b.isWicket ? (
                              <span className="text-[#D94343]">OUT ({b.wicketDetails?.type})</span>
                            ) : b.extraType === 'wide' ? (
                              <span className="text-[#E99A27]">{b.extraRuns} Wides</span>
                            ) : b.extraType === 'noBall' ? (
                              <span className="text-[#E99A27]">{b.runsBatter} Runs (No-Ball)</span>
                            ) : (
                              <span className="text-[#172033]">{b.runsBatter} runs</span>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
