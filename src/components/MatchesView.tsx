import React, { useState } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { TeamBadge } from './TeamBadge';
import {
  Radio,
  Calendar,
  Trophy,
  ArrowRight,
  ChevronRight,
  PlusCircle,
  Clock,
  MapPin,
  Edit3,
  Trash2,
} from 'lucide-react';

interface MatchesViewProps {
  matches: CricketMatch[];
  players: Player[];
  onOpenMatchDetails: (match: CricketMatch) => void;
  onOpenAvailability?: (match: CricketMatch) => void;
  onOpenTeamBuilder?: (match: CricketMatch) => void;
  onOpenCreateMatch?: () => void;
  onEditMatch?: (match: CricketMatch) => void;
  onDeleteMatch?: (match: CricketMatch) => void;
  canCreateMatch?: boolean;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  matches,
  players,
  onOpenMatchDetails,
  onOpenAvailability,
  onOpenTeamBuilder,
  onOpenCreateMatch,
  onEditMatch,
  onDeleteMatch,
  canCreateMatch = false,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [matchToDelete, setMatchToDelete] = useState<CricketMatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const filteredMatches = matches.filter((m) => {
    if (filterTab === 'live') return m.status === 'live';
    if (filterTab === 'upcoming') return m.status === 'scheduled';
    if (filterTab === 'completed') return m.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-6 text-[#172033]">
      {/* Title & Actions */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-[#172033]">
          Matches
        </h1>

        {canCreateMatch && onOpenCreateMatch && (
          <button
            onClick={onOpenCreateMatch}
            className="px-3 py-1.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Match</span>
          </button>
        )}
      </div>

      {/* Match Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#EAF2FF] border border-[#DFE7F2] rounded-xl text-xs font-semibold select-none">
        {[
          { id: 'all' as const, label: `All (${matches.length})` },
          { id: 'live' as const, label: `Live (${liveMatches.length})` },
          { id: 'upcoming' as const, label: `Upcoming (${upcomingMatches.length})` },
          { id: 'completed' as const, label: `Completed (${completedMatches.length})` },
        ].map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap truncate ${
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

      {/* Matches List */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="bg-white border border-[#DFE7F2] rounded-2xl p-7 text-center space-y-2 shadow-xs">
            <Calendar className="w-6 h-6 text-[#718096] mx-auto opacity-70" />
            <h3 className="font-bold text-sm text-[#172033]">No Matches Found</h3>
            <p className="text-xs text-[#718096] max-w-xs mx-auto">
              {filterTab === 'live'
                ? 'There are no active matches being scored right now.'
                : filterTab === 'upcoming'
                ? 'No fixtures scheduled in this category.'
                : filterTab === 'completed'
                ? 'No finalized match scorecards recorded yet.'
                : 'No cricket fixtures recorded in the system yet.'}
            </p>
            {canCreateMatch && onOpenCreateMatch && (
              <button
                onClick={onOpenCreateMatch}
                className="mt-3 px-3.5 py-1.5 bg-[#1554B8] text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5 hover:bg-[#0B3F91]"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Match Fixture</span>
              </button>
            )}
          </div>
        ) : (
          filteredMatches.map((match) => {
            const isLive = match.status === 'live';
            const isCompleted = match.status === 'completed';
            const dateObj = new Date(match.dateTime);
            const dateStr = dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            const activeInnings = match.currentInnings === 2 ? match.innings2 : match.innings1;
            const oversDisplay = activeInnings
              ? `${activeInnings.legalOvers}.${activeInnings.legalBalls} / ${match.oversPerInnings} ov`
              : `0.0 / ${match.oversPerInnings} ov`;
            const scoreDisplay = activeInnings
              ? `${activeInnings.totalRuns}/${activeInnings.wickets}`
              : '0/0';

            return (
              <div
                key={match.id}
                onClick={() => onOpenMatchDetails(match)}
                className="bg-white rounded-2xl p-3.5 space-y-3 shadow-xs border border-[#DFE7F2] text-[#172033] cursor-pointer hover:border-[#1554B8] transition-all"
              >
                {/* Top Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isLive ? (
                      <span className="bg-[#D94343] text-white font-bold text-[9.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 uppercase tracking-wider shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    ) : isCompleted ? (
                      <span className="bg-[#21864A] text-white font-bold text-[9.5px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider shadow-xs">
                        FINAL
                      </span>
                    ) : (
                      <span className="bg-[#EAF2FF] text-[#1554B8] font-bold text-[9.5px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider border border-[#DFE7F2]">
                        SCHEDULED
                      </span>
                    )}

                    <span className="font-bold text-[#172033] text-xs truncate">
                      {match.title}
                    </span>
                    <span className="text-[#718096]">•</span>
                    <span className="text-[#718096] font-medium">
                      {match.playersPerTeam}v{match.playersPerTeam}
                    </span>
                    <span className="text-[#718096]">•</span>
                    <span className="text-[#718096] font-medium">
                      {match.oversPerInnings} Overs
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#718096] shrink-0" />
                </div>

                {/* Score / Teams Row */}
                <div className="flex items-center justify-between gap-2 pt-0.5 pb-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="md" />
                    <span className="font-sans font-bold text-xs text-[#172033] leading-tight truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <div className="text-center shrink-0 px-2">
                    {isLive ? (
                      <>
                        <div className="font-sans font-black text-2xl sm:text-3xl text-[#1554B8] tracking-tight leading-none font-mono">
                          {scoreDisplay}
                        </div>
                        <div className="text-[11px] font-mono text-[#718096] mt-1">
                          ({oversDisplay})
                        </div>
                      </>
                    ) : isCompleted ? (
                      <div className="text-center">
                        <span className="text-xs font-bold text-[#21864A] block">
                          {match.result?.summaryText || 'Finished'}
                        </span>
                        <span className="text-[10px] text-[#718096] font-mono">
                          {match.innings1?.totalRuns || 0} vs {match.innings2?.totalRuns || 0}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-xs font-bold text-[#172033] block">{dateStr}</span>
                        <span className="text-[10px] text-[#718096]">{timeStr}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="font-sans font-bold text-xs text-[#172033] text-right leading-tight truncate">
                      {match.teamB.name}
                    </span>
                    <TeamBadge teamNameOrKey={match.teamB.name} size="md" />
                  </div>
                </div>

                {/* Sub-bar */}
                <div className="flex items-center justify-between text-[11px] text-[#718096] font-medium border-t border-[#DFE7F2] pt-2 pb-0.5 px-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#1554B8] shrink-0" />
                    <span className="truncate">{match.venue || 'Local Pitch'}</span>
                  </span>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {onOpenAvailability && match.status === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAvailability(match);
                        }}
                        className="text-[#1554B8] font-bold hover:underline cursor-pointer"
                      >
                        Availability
                      </button>
                    )}
                    {canCreateMatch && onEditMatch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMatch(match);
                        }}
                        className="text-[#1554B8] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                    {canCreateMatch && onDeleteMatch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMatchToDelete(match);
                        }}
                        className="text-[#D94343] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <span className="text-[#1554B8] font-bold flex items-center gap-0.5">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DELETE MATCH CONFIRMATION MODAL */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in text-[#172033]">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-[#DFE7F2]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D94343] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#172033]">
                Delete Scheduled Match?
              </h3>
              <p className="text-xs text-[#718096]">
                क्या आप वाकई इस मैच "{matchToDelete.title}" को डिलीट करना चाहते हैं?
              </p>
            </div>

            <div className="bg-[#F2F6FC] border border-[#DFE7F2] rounded-2xl p-3 text-xs space-y-1">
              <div className="font-bold text-[#172033] truncate">{matchToDelete.title}</div>
              <div className="text-[#1554B8] font-semibold flex items-center justify-between">
                <span>{matchToDelete.teamA.name}</span>
                <span className="text-[#718096] text-[10px]">VS</span>
                <span>{matchToDelete.teamB.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 px-4 bg-[#F2F6FC] hover:bg-[#EAF2FF] text-[#172033] font-bold text-xs rounded-xl cursor-pointer transition-colors border border-[#DFE7F2]"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteMatch || !matchToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMatch(matchToDelete);
                    setMatchToDelete(null);
                  } catch (e) {
                    console.error('Delete match error:', e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="py-2.5 px-4 bg-[#D94343] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'हटाएं (Delete)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
