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
} from 'lucide-react';
import { fetchPlayerMatchStats } from '../services/playerService';
import { format } from 'date-fns';

interface PlayerProfileViewProps {
  player: Player;
  onBack: () => void;
  initialTab?: 'overview' | 'batting' | 'bowling' | 'history' | 'bio';
  onSelectMatchDetails?: (matchId: string) => void;
  onEditPlayer?: (player: Player) => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  player,
  onBack,
  initialTab = 'overview',
  onSelectMatchDetails,
  onEditPlayer,
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
          const sorted = (stats || []).sort((a, b) => 
            new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
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
    if (!r) return 'Club Player';
    return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${player.fullName} - LocalXI Player Profile`,
          text: `Check out ${player.fullName}'s career cricket profile on LocalXI: ${runsCount} runs, ${wicketsCount} wickets.`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F6FC] pb-12 font-sans overflow-x-hidden text-[#172033]">
      {/* ================= CLEAN SINGLE STICKY HEADER ================= */}
      <header className="sticky top-0 z-40 bg-[#1554B8] text-white border-b border-[#0B3F91] shadow-sm">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5.5 h-5.5 stroke-[2.2]" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-sans font-bold text-sm tracking-tight text-white leading-tight truncate uppercase">
              Player Profile
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-5.5 h-5.5 stroke-[2]" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 bg-white border border-[#DFE7F2] rounded-2xl shadow-xl py-1.5 w-44 text-xs font-bold text-[#172033] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {onEditPlayer && (
                  <button
                    onClick={() => { setShowMenu(false); onEditPlayer(player); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F2F6FC] flex items-center gap-2.5 transition-colors cursor-pointer border-b border-[#DFE7F2]"
                  >
                    <Edit3 className="w-4 h-4 text-[#1554B8]" />
                    <span>Edit Profile</span>
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); handleShare(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F2F6FC] flex items-center gap-2.5 transition-colors cursor-pointer text-[#172033]"
                >
                  <Share2 className="w-4 h-4 text-[#1554B8]" />
                  <span>Share Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ================= PRIMARY PROFILE HERO CARD ================= */}
        <div className="relative bg-[#1554B8] text-white border border-[#0B3F91] rounded-2xl p-4.5 shadow-md overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2878E5]/30 via-[#1554B8]/80 to-[#0B3F91] pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-white flex items-center justify-center overflow-hidden shadow-md">
                {player.photoUrl ? (
                  <img src={player.photoUrl} alt={player.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#1554B8]" />
                )}
              </div>
              {jerseyDisplay && (
                <div className="absolute -bottom-1 -right-1 bg-white text-[#1554B8] font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md border border-[#DFE7F2] shadow-xs">
                  {jerseyDisplay}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight uppercase truncate">
                  {player.fullName}
                </h2>
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isAvailable ? 'bg-[#21864A] ring-2 ring-white' : 'bg-[#E99A27] ring-2 ring-white'
                  }`}
                  title={isAvailable ? 'Available' : 'Unavailable'}
                />
              </div>

              <p className="text-xs text-[#EAF2FF] font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="truncate">{player.teamName || 'Free Agent'}</span>
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
                  {formatRole(player.playingRole)}
                </span>
                <span className="text-[10px] font-bold bg-white/10 text-[#EAF2FF] px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
                  {player.battingStyle?.split('_')[0] || 'RHB'}
                </span>
                <span className="text-[10px] font-bold bg-white/10 text-[#EAF2FF] px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
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
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-[#1554B8] text-white border-[#1554B8] shadow-xs'
                    : 'bg-white text-[#718096] border-[#DFE7F2] hover:text-[#172033] hover:border-[#1554B8]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#718096]'}`} />
                {tab.label}
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
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-[10px] font-bold text-[#1554B8] uppercase tracking-wider mb-1">Matches</span>
                  <span className="text-3xl font-bold text-[#172033] font-mono leading-none">{matchesCount}</span>
                </div>
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-[10px] font-bold text-[#1554B8] uppercase tracking-wider mb-1">Innings</span>
                  <span className="text-3xl font-bold text-[#172033] font-mono leading-none">{inningsCount}</span>
                </div>
              </div>

              {/* Major Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Target className="w-4 h-4 text-[#1554B8]" />
                    <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Batting</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-2xl font-bold text-[#172033] font-mono">{runsCount}</span>
                    <span className="text-xs text-[#718096] font-medium ml-1">Runs</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#1554B8] pt-1">{battingAvg} Avg • {strikeRate} SR</p>
                </div>

                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Flame className="w-4 h-4 text-[#1554B8]" />
                    <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Bowling</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-2xl font-bold text-[#172033] font-mono">{wicketsCount}</span>
                    <span className="text-xs text-[#718096] font-medium ml-1">Wkts</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#1554B8] pt-1">{bowlingEcon} Econ • {bowlingAvg} Avg</p>
                </div>
              </div>

              {/* POTM / Achievement Card */}
              <div className="bg-gradient-to-r from-[#1554B8] to-[#0B3F91] text-white border border-[#0B3F91] rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Player of the Match</h4>
                    <p className="text-[11px] text-[#EAF2FF] font-medium">{potmAwards} Awards Won</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#EAF2FF] uppercase tracking-wider">Total Matches</span>
                  <div className="text-sm font-mono font-bold text-white">{matchesCount}</div>
                </div>
              </div>

              {/* Recent Form Sparkline */}
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1554B8] uppercase tracking-wider">Recent Form</span>
                  <span className="text-[11px] text-[#718096] font-medium">Last 5 Innings</span>
                </div>
                <div className="flex gap-2">
                  {recentMatches
                    .filter(m => m.dismissalStatus !== 'Did not bat')
                    .slice(0, 5)
                    .reverse()
                    .map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-[#F2F6FC] rounded-xl border border-[#DFE7F2] p-2 text-center group hover:border-[#1554B8] transition-colors">
                          <span className="text-xs font-mono font-bold text-[#172033]">{m.battingRuns}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${m.battingRuns >= 50 ? 'bg-[#E99A27]' : m.battingRuns >= 30 ? 'bg-[#1554B8]' : 'bg-[#718096]'}`} />
                      </div>
                    ))}
                  {recentMatches.filter(m => m.dismissalStatus !== 'Did not bat').length === 0 && (
                    <span className="text-xs text-[#718096] italic font-medium py-2">No recent batting data recorded</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BATTING TAB */}
          {activeTab === 'batting' && (
            <div className="space-y-3.5">
              <div className="bg-white border border-[#DFE7F2] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3.5 bg-[#EAF2FF] border-b border-[#DFE7F2] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#1554B8] uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4" /> Batting Career Stats
                  </h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[#DFE7F2]">
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
                      <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block mb-1">{s.label}</span>
                      <span className="text-lg font-mono font-bold text-[#172033]">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 text-center shadow-xs">
                  <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block mb-1">Fours (4s)</span>
                  <span className="text-xl font-mono font-bold text-[#1554B8]">{foursCount}</span>
                </div>
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 text-center shadow-xs">
                  <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block mb-1">Sixes (6s)</span>
                  <span className="text-xl font-mono font-bold text-[#1554B8]">{sixesCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* BOWLING TAB */}
          {activeTab === 'bowling' && (
            <div className="space-y-3.5">
              <div className="bg-white border border-[#DFE7F2] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3.5 bg-[#EAF2FF] border-b border-[#DFE7F2] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#1554B8] uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4" /> Bowling Career Stats
                  </h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[#DFE7F2]">
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
                      <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block mb-1">{s.label}</span>
                      <span className="text-lg font-mono font-bold text-[#172033]">{s.val}</span>
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
                  <div className="w-7 h-7 border-3 border-[#1554B8] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-[#718096]">Loading Match History...</span>
                </div>
              ) : recentMatches.length === 0 ? (
                <div className="bg-white border border-[#DFE7F2] rounded-2xl p-8 text-center shadow-xs">
                  <Calendar className="w-9 h-9 text-[#718096] mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-[#718096]">No match history found for this player.</p>
                </div>
              ) : (
                recentMatches.map((stat) => (
                  <button
                    key={stat.id}
                    onClick={() => onSelectMatchDetails?.(stat.matchId)}
                    className="w-full bg-white border border-[#DFE7F2] rounded-2xl p-3.5 text-left shadow-xs hover:border-[#1554B8] hover:bg-[#F2F6FC] transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider mb-0.5">
                          {format(new Date(stat.matchDate), 'MMM dd, yyyy')}
                        </div>
                        <h4 className="text-sm font-bold text-[#172033] leading-tight uppercase group-hover:text-[#1554B8] transition-colors">
                          vs {stat.opponentName}
                        </h4>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#718096] group-hover:text-[#1554B8]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DFE7F2]">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-[#1554B8] rounded-full" />
                        <div>
                          <span className="text-[10px] font-bold text-[#718096] uppercase tracking-tight block leading-none">Batting</span>
                          <span className="text-xs font-mono font-bold text-[#172033]">{stat.battingRuns}({stat.ballsFaced})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-[#2878E5] rounded-full" />
                        <div>
                          <span className="text-[10px] font-bold text-[#718096] uppercase tracking-tight block leading-none">Bowling</span>
                          <span className="text-xs font-mono font-bold text-[#172033]">{stat.wickets}/{stat.runsConceded}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        stat.matchResult.toLowerCase().includes('won') 
                          ? 'bg-[#21864A]/10 text-[#21864A] border border-[#21864A]/20' 
                          : 'bg-[#E99A27]/10 text-[#E99A27] border border-[#E99A27]/20'
                      }`}>
                        {stat.matchResult}
                      </span>
                      {stat.potmAward && (
                        <span className="text-[10px] font-bold text-[#1554B8] flex items-center gap-1 uppercase">
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
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4.5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-[#1554B8] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Personal Profile
                </h3>
                
                <div className="space-y-2.5">
                  {[
                    { label: 'Batting Style', val: formatBatStyle(player.battingStyle) },
                    { label: 'Bowling Style', val: formatBowlStyle(player.bowlingStyle) },
                    { label: 'Playing Role', val: formatRole(player.playingRole) },
                    { label: 'Location', val: player.location || '—' },
                    { label: 'Registered', val: format(new Date(player.registrationDate), 'MMM dd, yyyy') },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center border-b border-[#DFE7F2] pb-2">
                      <span className="text-xs font-medium text-[#718096]">{item.label}</span>
                      <span className="text-xs font-bold text-[#172033]">{item.val}</span>
                    </div>
                  ))}
                </div>

                {player.bio && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-[#1554B8] uppercase tracking-wider block mb-2">Player Bio</span>
                    <p className="text-xs text-[#718096] leading-relaxed italic bg-[#F2F6FC] p-3.5 rounded-xl border border-[#DFE7F2]">
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
