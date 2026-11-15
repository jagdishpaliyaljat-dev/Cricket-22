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

  // Find user player profile matching current authenticated user
  const userPlayer = players.find(
    (p) =>
      currentUser &&
      (p.userId === currentUser.uid ||
        p.id === currentUser.uid ||
        p.id === `player_${currentUser.uid}` ||
        (currentUser.email && p.email?.toLowerCase() === currentUser.email.toLowerCase()))
  );

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
    <div className="space-y-4 max-w-md mx-auto px-4 pb-20">
      {/* ================= GREETING / WELCOME PANEL ================= */}
      <div className="stadium-card rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else if (userPlayer) onSelectPlayer(userPlayer);
            }}
            className="relative shrink-0 focus:outline-none cursor-pointer touch-press"
          >
            <img
              src={avatarUrl}
              alt={greetingName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#00F2FE]/50 shadow-[0_0_12px_rgba(0,242,254,0.3)] bg-slate-800"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-[#0B1120] rounded-full" />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="font-sans font-bold text-base text-white flex items-center gap-1.5 leading-snug truncate">
              <span>Hi, {greetingName}!</span>
              <span role="img" aria-label="wave">👋</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-tight mt-0.5">
              Ready for cricket action?
            </p>
          </div>
        </div>

        {(isAdmin || isScorer) && (
          <button
            onClick={() => onNavigateTab('admin')}
            className="shrink-0 px-3.5 py-1.5 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        )}
      </div>

      {/* ================= LIVE MATCHES SECTION ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF4444]" />
            </span>
            <h3 className="font-display font-extrabold text-base text-white tracking-tight">Live Matches</h3>
            {liveMatches.length > 0 && (
              <span className="font-mono font-bold text-xs bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 px-2 py-0.5 rounded-full">
                {liveMatches.length} ACTIVE
              </span>
            )}
          </div>

          {liveMatches.length > 0 && (
            <button
              onClick={() => onNavigateTab('live')}
              className="text-xs font-bold text-[#00F2FE] hover:text-[#38BDF8] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {isInitializing ? (
          <div className="stadium-card rounded-2xl p-6 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#00F2FE]/30 border-t-[#00F2FE] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading live matches...</p>
          </div>
        ) : liveMatches.length === 0 ? (
          <div className="stadium-card rounded-2xl p-6 text-center space-y-2">
            <Activity className="w-6 h-6 text-slate-500 mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-slate-200">No Live Matches Right Now</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start scoring a match from the fixtures list to stream ball-by-ball updates live.
            </p>
            {upcomingMatches.length > 0 && (
              <button
                onClick={() => onNavigateTab('matches')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00F2FE] text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-md hover:bg-[#38BDF8] transition-colors"
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
                className="stadium-card-glow rounded-3xl p-4.5 space-y-3.5 relative overflow-hidden transition-all group"
              >
                {/* Top Subtle Broadcast Header */}
                <div className="relative flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="bg-[#EF4444] text-white font-black text-[9.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.7)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-slate-200 font-bold text-xs truncate">
                      {match.title}
                    </span>
                  </div>

                  <span className="bg-slate-800/80 border border-white/10 text-[#00F2FE] font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg shrink-0">
                    {oversDisplay}
                  </span>
                </div>

                {/* Score Area with Broadcast Style */}
                <div className="relative flex items-center justify-between gap-3 pt-1 pb-1">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="md" />
                    <span className="font-sans font-extrabold text-xs sm:text-sm text-white leading-tight truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <div className="text-center shrink-0 px-2">
                    <div className="font-mono font-black text-3xl sm:text-4xl text-[#00F2FE] tracking-tight leading-none drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                      {scoreDisplay}
                    </div>
                    {match.currentInnings === 2 && match.targetRuns && (
                      <div className="text-[11px] font-bold text-[#10B981] mt-1 font-mono tracking-tight bg-[#10B981]/15 px-2 py-0.5 rounded-md inline-block border border-[#10B981]/30">
                        Target {match.targetRuns}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2.5 min-w-0 flex-1">
                    <span className="font-sans font-extrabold text-xs sm:text-sm text-white text-right leading-tight truncate">
                      {match.teamB.name}
                    </span>
                    <TeamBadge teamNameOrKey={match.teamB.name} size="md" />
                  </div>
                </div>

                {/* Scorecard Action Button */}
                <button
                  onClick={() => onOpenScorecard(match)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#00F2FE] to-[#2563EB] hover:opacity-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,242,254,0.3)] active:scale-[0.99] touch-press"
                >
                  <Trophy className="w-3.5 h-3.5 text-slate-950" />
                  <span>View Live Scorecard & Commentary</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* ================= UPCOMING MATCHES SECTION ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-[#00F2FE] stroke-[2.2]" />
            <h3 className="font-display font-extrabold text-base text-white tracking-tight">Upcoming Matches</h3>
          </div>

          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs font-bold text-[#00F2FE] hover:text-[#38BDF8] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="stadium-card rounded-2xl p-5 text-center space-y-2">
            <Calendar className="w-5 h-5 text-slate-500 mx-auto opacity-70" />
            <p className="text-xs font-bold text-slate-300">No Upcoming Matches</p>
            <p className="text-[11px] text-slate-500">
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
                className="stadium-card rounded-2xl p-3.5 space-y-3 cursor-pointer hover:border-[#00F2FE]/40 transition-all touch-press group"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-12 rounded-xl bg-slate-800/90 border border-white/10 flex flex-col items-center justify-center shrink-0 group-hover:border-[#00F2FE]/40 transition-colors">
                      <span className="font-mono font-black text-base text-[#00F2FE] leading-none">
                        {dayStr}
                      </span>
                      <span className="font-sans font-bold text-[9px] text-slate-400 tracking-wider leading-none mt-0.5">
                        {monthStr}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-sans font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#00F2FE] transition-colors">
                        {match.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-[#00F2FE] shrink-0" />
                          <span className="truncate">{match.venue || 'Local Ground'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{timeStr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="bg-slate-800/80 border border-white/10 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-lg shrink-0 font-mono">
                    {match.playersPerTeam}v{match.playersPerTeam} • {match.oversPerInnings} Ov
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 px-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="sm" />
                    <span className="font-sans font-bold text-xs text-slate-200 truncate">
                      {match.teamA.name}
                    </span>
                  </div>

                  <span className="font-mono font-black text-[11px] text-slate-500 px-3 shrink-0">
                    VS
                  </span>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="font-sans font-bold text-xs text-slate-200 truncate text-right">
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
          <div className="flex items-center gap-2">
            <Trophy className="w-4.5 h-4.5 text-[#F59E0B] stroke-[2.2]" />
            <h3 className="font-display font-extrabold text-base text-white tracking-tight">Recent Results</h3>
          </div>

          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs font-bold text-[#00F2FE] hover:text-[#38BDF8] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {completedMatches.length === 0 ? (
          <div className="stadium-card rounded-2xl p-5 text-center space-y-2">
            <Trophy className="w-5 h-5 text-slate-500 mx-auto opacity-70" />
            <p className="text-xs font-bold text-slate-300">No Completed Matches Yet</p>
            <p className="text-[11px] text-slate-500">
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
                className="stadium-card rounded-2xl p-3.5 space-y-3 cursor-pointer hover:border-[#F59E0B]/40 transition-all touch-press group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-12 rounded-xl bg-slate-800/90 border border-white/10 flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono font-black text-base text-[#F59E0B] leading-none">
                      {dayStr}
                    </span>
                    <span className="font-sans font-bold text-[9px] text-slate-400 tracking-wider leading-none mt-0.5">
                      {monthStr}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-sans font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#F59E0B] transition-colors">
                      {match.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                      <span className="truncate">{match.venue}</span>
                      <span>•</span>
                      <span>{match.oversPerInnings} Overs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 px-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge teamNameOrKey={match.teamA.name} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-200 truncate">{match.teamA.name}</div>
                      <div className="font-mono text-xs font-bold text-[#00F2FE]">
                        {match.innings1 ? `${match.innings1.totalRuns}/${match.innings1.wickets}` : '—'}
                      </div>
                    </div>
                  </div>

                  {match.result && (
                    <div className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-xs mx-1">
                      <span className="font-black text-[10px] uppercase tracking-wider leading-none">
                        {match.result.summaryText || 'Finished'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <div className="min-w-0 text-right">
                      <div className="font-bold text-xs text-slate-200 truncate">{match.teamB.name}</div>
                      <div className="font-mono text-xs font-bold text-[#00F2FE]">
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
