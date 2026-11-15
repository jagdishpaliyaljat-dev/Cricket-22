import React, { useState, useEffect } from 'react';
import { Player, PlayerMatchStat } from '../types/cricket';
import {
  ArrowLeft,
  MoreVertical,
  User,
  BarChart2,
  Trophy,
  Shield,
  Calendar,
  Share2,
  Target,
  Flame,
  History,
  Info,
  ChevronRight,
  Edit3,
  ArrowLeftRight,
} from 'lucide-react';
import { fetchPlayerMatchStats } from '../services/playerService';
import { format } from 'date-fns';

interface PlayerProfileViewProps {
  player: Player;
  onBack: () => void;
  initialTab?: 'overview' | 'batting' | 'bowling' | 'history' | 'bio';
  onSelectMatchDetails?: (matchId: string) => void;
  onEditPlayer?: (player: Player) => void;
  onComparePlayer?: (player: Player) => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  player,
  onBack,
  initialTab = 'overview',
  onSelectMatchDetails,
  onEditPlayer,
  onComparePlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'batting' | 'bowling' | 'history' | 'bio'>(
    initialTab
  );
  const [showMenu, setShowMenu] = useState(false);
  const [recentMatches, setRecentMatches] = useState<PlayerMatchStat[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    if (player.id) {
      setIsLoadingMatches(true);
      fetchPlayerMatchStats(player.id)
        .then((stats) => {
          const sorted = (stats || []).sort(
            (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
          );
          setRecentMatches(sorted);
        })
        .finally(() => setIsLoadingMatches(false));
    }
  }, [player.id]);

  // Derived career statistics
  const career = player.career || ({} as any);
  const matchesCount = career.matches || 0;
  const runsCount = career.runs || 0;
  const wicketsCount = career.wickets || 0;
  const fiftiesCount = career.fifties || 0;
  const hundredsCount = career.hundreds || 0;
  const inningsCount = career.innings || 0;
  const notOutsCount = career.notOuts || 0;
  const ballsFaced = career.ballsFaced || 0;
  const foursCount = career.fours || 0;
  const sixesCount = career.sixes || 0;
  const highestScore = career.highestScore || 0;
  const oversBowled = career.oversBowled || 0;
  const runsConceded = career.runsConceded || 0;
  const bestBowlingW = career.bestBowlingWickets || 0;
  const bestBowlingR = career.bestBowlingRuns || 0;
  const potmAwards = career.potmAwards || 0;

  const dismissals = inningsCount - notOutsCount;
  const battingAvg =
    dismissals > 0
      ? (runsCount / dismissals).toFixed(1)
      : runsCount > 0
      ? runsCount.toFixed(1)
      : '0.0';
  const strikeRate = ballsFaced > 0 ? ((runsCount / ballsFaced) * 100).toFixed(1) : '0.0';

  const bowlingAvg = wicketsCount > 0 ? (runsConceded / wicketsCount).toFixed(1) : '0.0';
  const bowlingEcon = oversBowled > 0 ? (runsConceded / oversBowled).toFixed(2) : '0.00';

  const isAvailable = player.status === 'active';
  const jerseyDisplay = player.jerseyNumber ? `#${String(player.jerseyNumber).padStart(2, '0')}` : null;

  const formatBatStyle = (s?: string) => {
    if (!s) return 'Right Hand Bat';
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatBowlStyle = (s?: string) => {
    if (!s) return 'Right Arm Medium';
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatRole = (r?: string) => {
    if (!r) return 'Batter';
    return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${player.fullName} - Player Profile`,
        text: `Check out ${player.fullName}'s cricket stats on LocalXI!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] pb-24 font-sans overflow-x-hidden text-slate-100">
      {/* ================= CLEAN SINGLE STICKY HEADER ================= */}
      <header className="sticky top-0 z-40 bg-[#0B1120]/90 backdrop-blur-xl border-b border-white/10 text-white">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-display font-black text-sm tracking-wide text-white leading-tight truncate uppercase">
              Player Profile
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-5 h-5 stroke-[2]" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 z-50 bg-[#131D33] border border-white/10 rounded-2xl shadow-2xl py-1.5 w-44 text-xs font-bold text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {onEditPlayer && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditPlayer(player);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer border-b border-white/10 text-slate-200"
                  >
                    <Edit3 className="w-4 h-4 text-[#00F2FE]" />
                    <span>Edit Profile</span>
                  </button>
                )}
                {onComparePlayer && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onComparePlayer(player);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer border-b border-white/10 text-slate-200"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-[#00F2FE]" />
                    <span>Compare Player</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleShare();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-200"
                >
                  <Share2 className="w-4 h-4 text-[#00F2FE]" />
                  <span>Share Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ================= PRIMARY PROFILE HERO CARD ================= */}
        <div className="stadium-card-glow rounded-3xl p-5 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#00F2FE]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-[#131D33] border-2 border-[#00F2FE] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                {player.photoUrl ? (
                  <img src={player.photoUrl} alt={player.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#00F2FE]" />
                )}
              </div>
              {jerseyDisplay && (
                <div className="absolute -bottom-1 -right-1 bg-[#00F2FE] text-slate-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded-lg shadow-sm">
                  {jerseyDisplay}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-white tracking-tight uppercase truncate">
                  {player.fullName}
                </h2>
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isAvailable ? 'bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse' : 'bg-amber-400 ring-2 ring-amber-500/30'
                  }`}
                  title={isAvailable ? 'Available' : 'Unavailable'}
                />
              </div>

              <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                <span className="truncate">{player.teamName || 'Free Agent'}</span>
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-black bg-cyan-500/10 text-[#00F2FE] border border-cyan-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {formatRole(player.playingRole)}
                </span>
                <span className="text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {player.battingStyle?.split('_')[0] || 'RHB'}
                </span>
                <span className="text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {player.bowlingStyle?.split('_')[2] || 'MED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart2 },
            { id: 'batting' as const, label: 'Batting', icon: Target },
            { id: 'bowling' as const, label: 'Bowling', icon: Flame },
            { id: 'history' as const, label: 'History', icon: History },
            { id: 'bio' as const, label: 'Bio', icon: Info },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-2xl whitespace-nowrap text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.35)]'
                    : 'bg-[#131D33] text-slate-400 border border-white/10 hover:text-white hover:border-cyan-500/30'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= TAB CONTENT ================= */}
        <div className="animate-fade-in-up duration-200">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-3.5">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="stadium-card rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10">
                  <span className="text-[10px] font-black text-[#00F2FE] uppercase tracking-wider mb-1">
                    Matches
                  </span>
                  <span className="text-3xl font-black text-white font-mono leading-none">
                    {matchesCount}
                  </span>
                </div>
                <div className="stadium-card rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10">
                  <span className="text-[10px] font-black text-[#00F2FE] uppercase tracking-wider mb-1">
                    Innings
                  </span>
                  <span className="text-3xl font-black text-white font-mono leading-none">
                    {inningsCount}
                  </span>
                </div>
              </div>

              {/* Major Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="stadium-card rounded-2xl p-4 space-y-1 border border-white/10">
                  <div className="flex items-center justify-between">
                    <Target className="w-4 h-4 text-[#00F2FE]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Batting
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-2xl font-black text-white font-mono">{runsCount}</span>
                    <span className="text-xs text-slate-400 font-medium ml-1">Runs</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#00F2FE] pt-1">
                    {battingAvg} Avg • {strikeRate} SR
                  </p>
                </div>

                <div className="stadium-card rounded-2xl p-4 space-y-1 border border-white/10">
                  <div className="flex items-center justify-between">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Bowling
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-2xl font-black text-white font-mono">{wicketsCount}</span>
                    <span className="text-xs text-slate-400 font-medium ml-1">Wkts</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-400 pt-1">
                    {bowlingEcon} Econ • {bowlingAvg} Avg
                  </p>
                </div>
              </div>

              {/* POTM / Achievement Card */}
              <div className="stadium-card rounded-2xl p-4 border border-amber-500/30 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Player of the Match
                    </h4>
                    <p className="text-[11px] text-amber-300 font-medium">{potmAwards} Awards Won</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Matches
                  </span>
                  <div className="text-sm font-mono font-black text-white">{matchesCount}</div>
                </div>
              </div>

              {/* Recent Form Sparkline */}
              <div className="stadium-card rounded-2xl p-4 space-y-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#00F2FE] uppercase tracking-wider">
                    Recent Form
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Last 5 Innings</span>
                </div>
                <div className="flex gap-2">
                  {recentMatches
                    .filter((m) => m.dismissalStatus !== 'Did not bat')
                    .slice(0, 5)
                    .reverse()
                    .map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full bg-[#0B1120] rounded-xl border border-white/10 p-2 text-center group hover:border-cyan-500/50 transition-colors">
                          <span className="text-xs font-mono font-bold text-white">{m.battingRuns}</span>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            m.battingRuns >= 50
                              ? 'bg-amber-400 shadow-[0_0_6px_#F59E0B]'
                              : m.battingRuns >= 30
                              ? 'bg-[#00F2FE] shadow-[0_0_6px_#00F2FE]'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>
                    ))}
                  {recentMatches.filter((m) => m.dismissalStatus !== 'Did not bat').length === 0 && (
                    <span className="text-xs text-slate-400 italic font-medium py-2">
                      No recent batting data recorded
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BATTING TAB */}
          {activeTab === 'batting' && (
            <div className="space-y-3.5">
              <div className="stadium-card rounded-2xl overflow-hidden border border-white/10">
                <div className="p-3.5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#00F2FE] uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4" /> Batting Career Stats
                  </h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-white/10">
                  {[
                    { label: 'Innings', val: inningsCount },
                    { label: 'Runs', val: runsCount },
                    { label: 'Highest', val: highestScore },
                    { label: 'Average', val: battingAvg },
                    { label: 'Strike Rate', val: strikeRate },
                    { label: 'Balls Faced', val: ballsFaced },
                    { label: 'Fifties', val: fiftiesCount },
                    { label: 'Hundreds', val: hundredsCount },
                  ].map((s) => (
                    <div key={s.label} className="p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {s.label}
                      </span>
                      <span className="text-lg font-mono font-black text-white">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="stadium-card rounded-2xl p-4 text-center border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fours (4s)
                  </span>
                  <span className="text-xl font-mono font-black text-[#00F2FE]">{foursCount}</span>
                </div>
                <div className="stadium-card rounded-2xl p-4 text-center border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Sixes (6s)
                  </span>
                  <span className="text-xl font-mono font-black text-amber-400">{sixesCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* BOWLING TAB */}
          {activeTab === 'bowling' && (
            <div className="space-y-3.5">
              <div className="stadium-card rounded-2xl overflow-hidden border border-white/10">
                <div className="p-3.5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4" /> Bowling Career Stats
                  </h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-white/10">
                  {[
                    { label: 'Innings', val: matchesCount },
                    { label: 'Wickets', val: wicketsCount },
                    { label: 'Economy', val: bowlingEcon },
                    { label: 'Average', val: bowlingAvg },
                    { label: 'Best Wkts', val: bestBowlingW },
                    { label: 'Best Runs', val: bestBowlingR },
                    { label: 'Overs', val: oversBowled },
                    { label: 'Runs Conc', val: runsConceded },
                  ].map((s) => (
                    <div key={s.label} className="p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {s.label}
                      </span>
                      <span className="text-lg font-mono font-black text-white">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {isLoadingMatches ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-7 h-7 border-3 border-cyan-500/20 border-t-[#00F2FE] rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    Loading Match History...
                  </span>
                </div>
              ) : recentMatches.length === 0 ? (
                <div className="stadium-card rounded-2xl p-8 text-center border border-white/10 space-y-2">
                  <Calendar className="w-9 h-9 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">No match history found for this player.</p>
                </div>
              ) : (
                recentMatches.map((stat) => (
                  <button
                    key={stat.id}
                    onClick={() => onSelectMatchDetails?.(stat.matchId)}
                    className="w-full stadium-card rounded-2xl p-3.5 text-left border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-mono">
                          {format(new Date(stat.matchDate), 'MMM dd, yyyy')}
                        </div>
                        <h4 className="text-sm font-black text-white leading-tight uppercase group-hover:text-[#00F2FE] transition-colors">
                          vs {stat.opponentName}
                        </h4>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-[#00F2FE] transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-[#00F2FE] rounded-full" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block leading-none">
                            Batting
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {stat.battingRuns} ({stat.ballsFaced})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-amber-400 rounded-full" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block leading-none">
                            Bowling
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {stat.wickets}/{stat.runsConceded}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                          stat.matchResult.toLowerCase().includes('won')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {stat.matchResult}
                      </span>
                      {stat.potmAward && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 uppercase">
                          <Trophy className="w-3 h-3" /> POTM
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* BIO TAB */}
          {activeTab === 'bio' && (
            <div className="space-y-3.5">
              <div className="stadium-card rounded-2xl p-4.5 space-y-4 border border-white/10">
                <h3 className="text-xs font-black text-[#00F2FE] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Personal Profile
                </h3>

                <div className="space-y-2.5">
                  {[
                    { label: 'Batting Style', val: formatBatStyle(player.battingStyle) },
                    { label: 'Bowling Style', val: formatBowlStyle(player.bowlingStyle) },
                    { label: 'Playing Role', val: formatRole(player.playingRole) },
                    { label: 'Location', val: player.location || '—' },
                    {
                      label: 'Registered',
                      val: format(new Date(player.registrationDate), 'MMM dd, yyyy'),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center border-b border-white/10 pb-2 text-xs"
                    >
                      <span className="font-medium text-slate-400">{item.label}</span>
                      <span className="font-bold text-white">{item.val}</span>
                    </div>
                  ))}
                </div>

                {player.bio && (
                  <div className="pt-2">
                    <span className="text-xs font-black text-[#00F2FE] uppercase tracking-wider block mb-2">
                      Player Bio
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic bg-[#0B1120] p-3.5 rounded-xl border border-white/10">
                      "{player.bio}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
