import React, { useState, useEffect } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';
import { getCachedMatches, setCachedMatches } from '../utils/cacheStorage';
import {
  Activity,
  Calendar,
  Trophy,
  ArrowRight,
  MapPin,
  Clock,
  PlusCircle,
  Play,
  Users,
} from 'lucide-react';

interface HomeViewProps {
  matches: CricketMatch[];
  players: Player[];
  onNavigateTab: (tab: 'home' | 'matches' | 'live' | 'players' | 'leaderboard' | 'admin' | 'profile') => void;
  onOpenScorecard: (match: CricketMatch) => void;
  onOpenScoringPad: (match: CricketMatch) => void;
  onOpenAvailability: (match: CricketMatch) => void;
  onOpenTeamBuilder: (match: CricketMatch) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenProfile?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  matches,
  players,
  onNavigateTab,
  onOpenScorecard,
  onOpenScoringPad,
  onOpenAvailability,
  onOpenTeamBuilder,
  onSelectPlayer,
  onOpenProfile,
}) => {
  const { currentUser, isAdmin, isScorer } = useAuth();
  const [cachedMatchesList, setCachedMatchesList] = useState<CricketMatch[]>(() => getCachedMatches() || []);
  const [isInitializing, setIsInitializing] = useState(matches.length === 0 && cachedMatchesList.length === 0);

  useEffect(() => {
    if (matches.length > 0) {
      setIsInitializing(false);
      setCachedMatches(matches);
      setCachedMatchesList(matches);
    }
  }, [matches]);

  const effectiveMatches = matches.length > 0 ? matches : cachedMatchesList;

  // Find user player profile or fallback to first player in directory
  const userPlayer =
    players.find((p) => currentUser && (p.userId === currentUser.uid || p.id === currentUser.uid)) ||
    players[0];

  const greetingName =
    currentUser?.displayName?.split(' ')[0] ||
    userPlayer?.fullName?.split(' ')[0] ||
    'Player';

  const avatarUrl =
    currentUser?.photoURL ||
    userPlayer?.photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80';

  const liveMatches = effectiveMatches.filter((m) => m.status === 'live');
  const upcomingMatches = effectiveMatches.filter((m) => m.status === 'scheduled');
  const completedMatches = effectiveMatches.filter((m) => m.status === 'completed');

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-4">
      {/* ================= GREETING / WELCOME PANEL ================= */}
      <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (userPlayer) onSelectPlayer(userPlayer);
              else if (onOpenProfile) onOpenProfile();
            }}
            className="relative shrink-0 focus:outline-none cursor-pointer"
          >
            <img
              src={avatarUrl}
              alt={greetingName}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#1554B8] shadow-xs bg-[#EAF2FF]"
              referrerPolicy="no-referrer"
            />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="font-sans font-bold text-base text-[#172033] flex items-center gap-1.5 leading-snug truncate">
              <span>Hi, {greetingName}!</span>
              <span role="img" aria-label="wave">👋</span>
            </h2>
            <p className="text-xs text-[#718096] font-medium leading-tight mt-0.5">
              Ready for cricket action?
            </p>
          </div>
        </div>

        {(isAdmin || isScorer) && (
          <button
            onClick={() => onNavigateTab('admin')}
            className="shrink-0 px-3 py-1.5 bg-[#EAF2FF] hover:bg-[#1554B8] hover:text-white border border-[#DFE7F2] text-[#1554B8] rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        )}
      </div>

      {/* ================= LIVE MATCHES SECTION ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4.5 h-4.5 text-[#D94343] stroke-[2.5]" />
            <h3 className="font-sans font-bold text-base text-[#172033]">Live Matches</h3>
            {liveMatches.length > 0 && (
              <span className="font-sans font-bold text-base text-[#1554B8]">
                ({liveMatches.length})
              </span>
            )}
          </div>

          {liveMatches.length > 0 && (
            <button
              onClick={() => onNavigateTab('live')}
              className="text-xs font-semibold text-[#1554B8] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {isInitializing ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-white border border-[#DFE7F2] rounded-2xl h-40 w-full" />
            <div className="animate-pulse bg-white border border-[#DFE7F2] rounded-2xl h-40 w-full" />
          </div>
        ) : liveMatches.length === 0 ? (
          <div className="bg-white border border-[#DFE7F2] rounded-2xl p-5 text-center space-y-2 shadow-xs">
            <Activity className="w-5 h-5 text-[#718096] mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#172033]">No Live Matches Right Now</p>
            <p className="text-[11px] text-[#718096] max-w-xs mx-auto">
              Start scoring a match from the fixtures list to stream ball-by-ball updates live.
            </p>
            {upcomingMatches.length > 0 && (
              <button
                onClick={() => onNavigateTab('matches')}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1554B8] text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs hover:bg-[#0B3F91] transition-colors"
              >
                <span>View Fixtures</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          liveMatches.slice(0, 2).map((match) => {
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
                className="bg-white border border-[#DFE7F2] rounded-2xl p-3.5 space-y-3 relative overflow-hidden shadow-xs hover:border-[#1554B8] transition-all"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1554B8]" />

                {/* Top Row */}
                <div className="relative flex items-center justify-between text-xs gap-2 pt-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="bg-[#D94343] text-white font-bold text-[9.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 uppercase tracking-wider shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-[#172033] font-semibold text-xs truncate">
                      {match.title}
                    </span>
                    <span className="text-[#718096] text-xs">•</span>
                    <span className="text-[#718096] text-xs font-mono">
                      {match.playersPerTeam}v{match.playersPerTeam}
                    </span>
                  </div>

                  <span className="bg-[#EAF2FF] border border-[#DFE7F2] text-[#1554B8] font-mono font-semibold text-[11px] px-2 py-0.5 rounded-md shrink-0">
                    {oversDisplay}
                  </span>
                </div>

                {/* Score Area */}
                <div className="relative flex items-center justify-between gap-2 pt-1 pb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="md" />
                    <span className="font-sans font-bold text-xs text-[#172033] leading-tight truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <div className="text-center shrink-0 px-2">
                    <div className="font-sans font-black text-3xl sm:text-4xl text-[#1554B8] tracking-tight leading-none font-mono">
                      {scoreDisplay}
                    </div>
                    {match.currentInnings === 2 && match.targetRuns && (
                      <div className="text-[11px] font-semibold text-[#21864A] mt-1 font-mono">
                        Target {match.targetRuns}
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

                {/* Scorecard Action */}
                <button
                  onClick={() => onOpenScorecard(match)}
                  className="w-full py-2 px-4 bg-[#1554B8] hover:bg-[#0B3F91] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-[0.99]"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Live Scorecard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* ================= UPCOMING MATCHES SECTION ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4.5 h-4.5 text-[#1554B8] stroke-[2.2]" />
            <h3 className="font-sans font-bold text-base text-[#172033]">Upcoming Matches</h3>
          </div>

          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs font-semibold text-[#1554B8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white border border-[#DFE7F2] rounded-2xl p-5 text-center space-y-2 shadow-xs">
            <Calendar className="w-5 h-5 text-[#718096] mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#172033]">No Upcoming Matches</p>
            <p className="text-[11px] text-[#718096]">
              Schedule a match in the Admin Panel to set dates, format, and availability.
            </p>
          </div>
        ) : (
          upcomingMatches.slice(0, 3).map((match) => {
            const dateObj = new Date(match.dateTime);
            const dayStr = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
            const monthStr = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={match.id}
                onClick={() => onOpenAvailability(match)}
                className="bg-white border border-[#DFE7F2] rounded-2xl p-3 space-y-2.5 shadow-xs cursor-pointer hover:border-[#1554B8] transition-all"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-11 rounded-xl bg-[#EAF2FF] border border-[#DFE7F2] flex flex-col items-center justify-center shrink-0">
                      <span className="font-sans font-black text-base text-[#1554B8] leading-none">
                        {dayStr}
                      </span>
                      <span className="font-sans font-bold text-[9px] text-[#172033] tracking-wider leading-none mt-0.5">
                        {monthStr}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-sans font-bold text-xs sm:text-sm text-[#172033] truncate">
                        {match.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#718096] mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-[#1554B8] shrink-0" />
                          <span className="truncate">{match.venue || 'Local Ground'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-[#718096] shrink-0" />
                          <span>{timeStr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="bg-[#F2F6FC] border border-[#DFE7F2] text-[#718096] text-[10px] font-medium px-2 py-0.5 rounded-lg shrink-0 font-mono">
                    {match.playersPerTeam}v{match.playersPerTeam} • {match.oversPerInnings} Ov
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#DFE7F2] pt-2 px-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="sm" />
                    <span className="font-sans font-bold text-xs text-[#172033] truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <span className="font-sans font-bold text-[11px] text-[#718096] px-3 shrink-0">
                    VS
                  </span>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="font-sans font-bold text-xs text-[#172033] truncate text-right">
                      {match.teamB.name}
                    </span>
                    <TeamBadge teamNameOrKey={match.teamB.name} size="sm" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ================= RECENT MATCH RESULTS SECTION ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4.5 h-4.5 text-[#1554B8] stroke-[2.2]" />
            <h3 className="font-sans font-bold text-base text-[#172033]">Recent Results</h3>
          </div>

          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs font-semibold text-[#1554B8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {completedMatches.length === 0 ? (
          <div className="bg-white border border-[#DFE7F2] rounded-2xl p-5 text-center space-y-2 shadow-xs">
            <Trophy className="w-5 h-5 text-[#718096] mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#172033]">No Completed Matches Yet</p>
            <p className="text-[11px] text-[#718096]">
              Finalized matches with winner summaries will appear here.
            </p>
          </div>
        ) : (
          completedMatches.slice(0, 2).map((match) => {
            const dateObj = new Date(match.dateTime);
            const dayStr = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
            const monthStr = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();

            return (
              <div
                key={match.id}
                onClick={() => onOpenScorecard(match)}
                className="bg-white border border-[#DFE7F2] rounded-2xl p-3 space-y-2.5 shadow-xs cursor-pointer hover:border-[#1554B8] transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-11 rounded-xl bg-[#EAF2FF] border border-[#DFE7F2] flex flex-col items-center justify-center shrink-0">
                    <span className="font-sans font-black text-base text-[#1554B8] leading-none">
                      {dayStr}
                    </span>
                    <span className="font-sans font-bold text-[9px] text-[#718096] tracking-wider leading-none mt-0.5">
                      {monthStr}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-sans font-bold text-xs sm:text-sm text-[#172033] truncate">
                      {match.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#718096] mt-0.5">
                      <span className="truncate">{match.venue}</span>
                      <span>•</span>
                      <span>{match.oversPerInnings} Overs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#DFE7F2] pt-2 px-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#172033] truncate">{match.teamA.name}</div>
                      <div className="font-mono text-xs text-[#1554B8]">
                        {match.innings1 ? `${match.innings1.totalRuns}/${match.innings1.wickets}` : '—'}
                      </div>
                    </div>
                  </div>

                  {match.result && (
                    <div className="bg-[#21864A] text-white px-2.5 py-1 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-xs mx-1">
                      <span className="font-bold text-[10px] uppercase leading-none">
                        {match.result.summaryText || 'Finished'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <div className="min-w-0 text-right">
                      <div className="font-bold text-xs text-[#172033] truncate">{match.teamB.name}</div>
                      <div className="font-mono text-xs text-[#1554B8]">
                        {match.innings2 ? `${match.innings2.totalRuns}/${match.innings2.wickets}` : '—'}
                      </div>
                    </div>
                    <TeamBadge teamNameOrKey={match.teamB.name} size="sm" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};
