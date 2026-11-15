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
    <div className="space-y-4 max-w-md mx-auto px-4 pb-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-white flex items-center gap-2">
          <span>Matches</span>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            {matches.length}
          </span>
        </h1>

        {canCreateMatch && onOpenCreateMatch && (
          <button
            onClick={onOpenCreateMatch}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:opacity-95 transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Match</span>
          </button>
        )}
      </div>

      {/* Match Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#131E32]/90 border border-white/10 rounded-xl text-xs font-semibold select-none backdrop-blur-md">
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
                  ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
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
          <div className="stadium-card rounded-2xl p-7 text-center space-y-2 border border-white/10 shadow-lg">
            <Calendar className="w-6 h-6 text-slate-400 mx-auto opacity-70" />
            <h3 className="font-bold text-sm text-white">No Matches Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
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
                className="mt-3 px-3.5 py-1.5 bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5 hover:opacity-95 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
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
                className={`stadium-card rounded-2xl p-3.5 space-y-3 border text-slate-100 cursor-pointer transition-all active:scale-[0.99] ${
                  isLive
                    ? 'border-[#EF4444]/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-[#EF4444]'
                    : 'border-white/10 hover:border-[#00F2FE]/50 hover:shadow-[0_0_18px_rgba(0,242,254,0.1)]'
                }`}
              >
                {/* Top Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isLive ? (
                      <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[9.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    ) : isCompleted ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9.5px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                        FINAL
                      </span>
                    ) : (
                      <span className="bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 font-bold text-[9.5px] px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                        SCHEDULED
                      </span>
                    )}

                    <span className="font-bold text-white text-xs truncate">
                      {match.title}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-medium">
                      {match.playersPerTeam}v{match.playersPerTeam}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-medium">
                      {match.oversPerInnings} Overs
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                {/* Score / Teams Row */}
                <div className="flex items-center justify-between gap-2 pt-0.5 pb-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="md" />
                    <span className="font-sans font-bold text-xs text-white leading-tight truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <div className="text-center shrink-0 px-2">
                    {isLive ? (
                      <>
                        <div className="font-sans font-black text-2xl sm:text-3xl text-[#00F2FE] tracking-tight leading-none font-mono drop-shadow-[0_0_10px_rgba(0,242,254,0.4)]">
                          {scoreDisplay}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          ({oversDisplay})
                        </div>
                      </>
                    ) : isCompleted ? (
                      <div className="text-center">
                        <span className="text-xs font-bold text-emerald-400 block">
                          {match.result?.summaryText || 'Finished'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {match.innings1?.totalRuns || 0} vs {match.innings2?.totalRuns || 0}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-xs font-bold text-white block">{dateStr}</span>
                        <span className="text-[10px] text-slate-400">{timeStr}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="font-sans font-bold text-xs text-white text-right leading-tight truncate">
                      {match.teamB.name}
                    </span>
                    <TeamBadge teamNameOrKey={match.teamB.name} size="md" />
                  </div>
                </div>

                {/* Sub-bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-white/10 pt-2 pb-0.5 px-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-[#00F2FE] shrink-0" />
                    <span className="truncate">{match.venue || 'Local Pitch'}</span>
                  </span>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {onOpenAvailability && match.status === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAvailability(match);
                        }}
                        className="text-[#00F2FE] font-bold hover:underline cursor-pointer"
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
                        className="text-[#38BDF8] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
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
                        className="text-[#EF4444] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <span className="text-[#00F2FE] font-bold flex items-center gap-0.5">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in text-white">
          <div className="bg-[#0F172A] rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-white/15">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-[#EF4444] flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-white">
                Delete Scheduled Match?
              </h3>
              <p className="text-xs text-slate-400">
                क्या आप वाकई इस मैच "{matchToDelete.title}" को डिलीट करना चाहते हैं?
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-xs space-y-1">
              <div className="font-bold text-white truncate">{matchToDelete.title}</div>
              <div className="text-[#00F2FE] font-semibold flex items-center justify-between">
                <span>{matchToDelete.teamA.name}</span>
                <span className="text-slate-400 text-[10px]">VS</span>
                <span>{matchToDelete.teamB.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors border border-white/10"
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
                className="py-2.5 px-4 bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25"
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
