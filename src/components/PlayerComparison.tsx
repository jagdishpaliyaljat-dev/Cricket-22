import React, { useEffect, useMemo, useState } from 'react';
import { Player, PlayerMatchStat } from '../types/cricket';
import { calculateEconomy, calculateStrikeRate } from '../lib/cricketEngine';
import { fetchPlayerMatchStats } from '../services/playerService';
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart2,
  ChevronDown,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface PlayerComparisonProps {
  players: Player[];
  initialPlayerAId?: string;
  onBack?: () => void;
  onSelectPlayerProfile?: (player: Player) => void;
}

type ComparisonTab = 'overview' | 'batting' | 'bowling' | 'form';
type RoleFilter = 'all' | 'batter' | 'bowler' | 'allrounder';

interface ComputedPlayerMetrics {
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  ballsFaced: number;
  highestScore: number;
  battingAvg: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  boundaryRuns: number;
  boundaryPct: number;
  wickets: number;
  oversBowled: number;
  ballsBowled: number;
  runsConceded: number;
  economy: number;
  bowlingAvg: number;
  bowlingSR: number;
  bestBowlingLabel: string;
  catches: number;
  runOuts: number;
  potmAwards: number;
  impactScore: number;
}

const COLOR_A = '#00F2FE';
const COLOR_A_LIGHT = 'rgba(0, 242, 254, 0.15)';
const COLOR_B = '#F59E0B';
const COLOR_B_LIGHT = 'rgba(245, 158, 11, 0.15)';

function computeMetrics(player: Player): ComputedPlayerMetrics {
  const c = player.career || ({} as Player['career']);
  const matches = c.matches || 0;
  const innings = c.innings || 0;
  const notOuts = c.notOuts || 0;
  const runs = c.runs || 0;
  const ballsFaced = c.ballsFaced || 0;
  const highestScore = c.highestScore || 0;
  const fours = c.fours || 0;
  const sixes = c.sixes || 0;
  const fifties = c.fifties || 0;
  const hundreds = c.hundreds || 0;
  const wickets = c.wickets || 0;
  const oversBowled = c.oversBowled || 0;
  const ballsBowled = c.ballsBowled || Math.round(oversBowled * 6);
  const runsConceded = c.runsConceded || 0;
  const catches = c.catches || 0;
  const runOuts = c.runOuts || 0;
  const potmAwards = c.potmAwards || 0;

  const dismissals = Math.max(0, innings - notOuts);
  const battingAvg =
    dismissals > 0 ? Number((runs / dismissals).toFixed(1)) : runs > 0 ? runs : 0;
  const strikeRate = calculateStrikeRate(runs, ballsFaced);
  const boundaryRuns = fours * 4 + sixes * 6;
  const boundaryPct = runs > 0 ? Number(((boundaryRuns / runs) * 100).toFixed(1)) : 0;

  const economy = ballsBowled > 0 ? calculateEconomy(runsConceded, ballsBowled) : 0;
  const bowlingAvg = wickets > 0 ? Number((runsConceded / wickets).toFixed(1)) : 0;
  const bowlingSR = wickets > 0 && ballsBowled > 0 ? Number((ballsBowled / wickets).toFixed(1)) : 0;
  const bestBowlingLabel =
    (c.bestBowlingWickets || 0) > 0
      ? `${c.bestBowlingWickets}/${c.bestBowlingRuns || 0}`
      : '—';

  const impactScore = catches + runOuts * 1.5 + potmAwards * 3;

  return {
    matches,
    innings,
    notOuts,
    runs,
    ballsFaced,
    highestScore,
    battingAvg,
    strikeRate,
    fours,
    sixes,
    fifties,
    hundreds,
    boundaryRuns,
    boundaryPct,
    wickets,
    oversBowled,
    ballsBowled,
    runsConceded,
    economy,
    bowlingAvg,
    bowlingSR,
    bestBowlingLabel,
    catches,
    runOuts,
    potmAwards,
    impactScore,
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRoleLabel(role?: string): string {
  if (!role) return 'Club Player';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PlayerAvatar: React.FC<{
  player: Player;
  accentColor: string;
  sizeClass?: string;
}> = ({ player, accentColor, sizeClass = 'w-12 h-12' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [player.id, player.photoUrl]);

  if (player.photoUrl && !imgFailed) {
    return (
      <img
        src={player.photoUrl}
        alt={player.fullName}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{ borderColor: accentColor }}
        className={`${sizeClass} rounded-full object-cover border-2 shrink-0 bg-[#00F2FE]/15`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: accentColor }}
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs`}
      aria-label={player.fullName}
    >
      {getInitials(player.fullName)}
    </div>
  );
};

interface StatComparisonRow {
  key: string;
  label: string;
  valA: number;
  valB: number;
  displayA: string;
  displayB: string;
  lowerIsBetter?: boolean;
  requiresPositiveToLead?: boolean;
}

export const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  players,
  initialPlayerAId,
  onBack,
  onSelectPlayerProfile,
}) => {
  const sortedDirectory = useMemo(() => {
    return [...players].sort((a, b) => {
      const scoreA = (a.career?.runs || 0) + (a.career?.wickets || 0) * 20;
      const scoreB = (b.career?.runs || 0) + (b.career?.wickets || 0) * 20;
      return scoreB - scoreA;
    });
  }, [players]);

  const [playerAId, setPlayerAId] = useState<string>(() => {
    if (initialPlayerAId && players.some((p) => p.id === initialPlayerAId)) {
      return initialPlayerAId;
    }
    return sortedDirectory[0]?.id || '';
  });

  const [playerBId, setPlayerBId] = useState<string>(() => {
    const firstId =
      initialPlayerAId && players.some((p) => p.id === initialPlayerAId)
        ? initialPlayerAId
        : sortedDirectory[0]?.id || '';
    const second = sortedDirectory.find((p) => p.id !== firstId);
    return second?.id || '';
  });

  const [activeTab, setActiveTab] = useState<ComparisonTab>('overview');
  const [pickerSlot, setPickerSlot] = useState<'A' | 'B' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeRadarAxis, setActiveRadarAxis] = useState<number>(0);
  const [formMetric, setFormMetric] = useState<'runs' | 'wickets'>('runs');
  const [selectedFormIndex, setSelectedFormIndex] = useState<number | null>(null);

  const [statsA, setStatsA] = useState<PlayerMatchStat[]>([]);
  const [statsB, setStatsB] = useState<PlayerMatchStat[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Keep selections valid when players list updates
  useEffect(() => {
    if (sortedDirectory.length === 0) return;
    const hasA = sortedDirectory.some((p) => p.id === playerAId);
    const hasB = sortedDirectory.some((p) => p.id === playerBId);
    if (!hasA) {
      setPlayerAId(sortedDirectory[0].id);
    }
    if (!hasB || playerBId === playerAId) {
      const fallback = sortedDirectory.find((p) => p.id !== (hasA ? playerAId : sortedDirectory[0].id));
      setPlayerBId(fallback?.id || '');
    }
  }, [sortedDirectory, playerAId, playerBId]);

  const playerA = useMemo(
    () => sortedDirectory.find((p) => p.id === playerAId) || null,
    [sortedDirectory, playerAId]
  );
  const playerB = useMemo(
    () => sortedDirectory.find((p) => p.id === playerBId) || null,
    [sortedDirectory, playerBId]
  );

  // Fetch recent match history for both players when form tab is opened or players change
  useEffect(() => {
    if (!playerA || !playerB) return;
    let cancelled = false;
    setLoadingForm(true);
    setFormError(null);

    Promise.all([
      fetchPlayerMatchStats(playerA.id).catch(() => []),
      fetchPlayerMatchStats(playerB.id).catch(() => []),
    ])
      .then(([resA, resB]) => {
        if (cancelled) return;
        const sortByDateDesc = (arr: PlayerMatchStat[]) =>
          [...(arr || [])].sort(
            (x, y) => new Date(y.matchDate).getTime() - new Date(x.matchDate).getTime()
          );
        setStatsA(sortByDateDesc(resA));
        setStatsB(sortByDateDesc(resB));
      })
      .catch(() => {
        if (!cancelled) setFormError('Could not load recent match history.');
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerA?.id, playerB?.id]);

  const metricsA = useMemo(() => (playerA ? computeMetrics(playerA) : null), [playerA]);
  const metricsB = useMemo(() => (playerB ? computeMetrics(playerB) : null), [playerB]);

  // Compute squad benchmarks for Radar normalization
  const squadMax = useMemo(() => {
    let maxRuns = 100;
    let maxAvg = 30;
    let maxSR = 140;
    let maxWickets = 10;
    let maxImpact = 10;

    for (const p of players) {
      const m = computeMetrics(p);
      if (m.runs > maxRuns) maxRuns = m.runs;
      if (m.battingAvg > maxAvg) maxAvg = m.battingAvg;
      if (m.strikeRate > maxSR) maxSR = m.strikeRate;
      if (m.wickets > maxWickets) maxWickets = m.wickets;
      if (m.impactScore > maxImpact) maxImpact = m.impactScore;
    }

    return { maxRuns, maxAvg, maxSR, maxWickets, maxImpact };
  }, [players]);

  const radarData = useMemo(() => {
    if (!metricsA || !metricsB) return [];

    const econScore = (m: ComputedPlayerMetrics) => {
      if (m.ballsBowled === 0) return 0;
      // Map economy 3.0 -> 100, 12.0 -> 15
      return Math.max(12, Math.min(100, Math.round(((13 - m.economy) / 10) * 100)));
    };

    const pct = (val: number, max: number) =>
      max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;

    return [
      {
        label: 'Runs',
        scoreA: pct(metricsA.runs, squadMax.maxRuns),
        scoreB: pct(metricsB.runs, squadMax.maxRuns),
        rawA: `${metricsA.runs}`,
        rawB: `${metricsB.runs}`,
      },
      {
        label: 'Bat Avg',
        scoreA: pct(metricsA.battingAvg, squadMax.maxAvg),
        scoreB: pct(metricsB.battingAvg, squadMax.maxAvg),
        rawA: metricsA.battingAvg.toFixed(1),
        rawB: metricsB.battingAvg.toFixed(1),
      },
      {
        label: 'Strike Rate',
        scoreA: pct(metricsA.strikeRate, squadMax.maxSR),
        scoreB: pct(metricsB.strikeRate, squadMax.maxSR),
        rawA: metricsA.strikeRate.toFixed(1),
        rawB: metricsB.strikeRate.toFixed(1),
      },
      {
        label: 'Wickets',
        scoreA: pct(metricsA.wickets, squadMax.maxWickets),
        scoreB: pct(metricsB.wickets, squadMax.maxWickets),
        rawA: `${metricsA.wickets}`,
        rawB: `${metricsB.wickets}`,
      },
      {
        label: 'Control',
        scoreA: econScore(metricsA),
        scoreB: econScore(metricsB),
        rawA: metricsA.ballsBowled > 0 ? `${metricsA.economy.toFixed(2)} econ` : '—',
        rawB: metricsB.ballsBowled > 0 ? `${metricsB.economy.toFixed(2)} econ` : '—',
      },
      {
        label: 'Impact',
        scoreA: pct(metricsA.impactScore, squadMax.maxImpact),
        scoreB: pct(metricsB.impactScore, squadMax.maxImpact),
        rawA: `${metricsA.catches}c · ${metricsA.potmAwards} POTM`,
        rawB: `${metricsB.catches}c · ${metricsB.potmAwards} POTM`,
      },
    ];
  }, [metricsA, metricsB, squadMax]);

  const allComparisonRows: StatComparisonRow[] = useMemo(() => {
    if (!metricsA || !metricsB) return [];
    return [
      {
        key: 'matches',
        label: 'Matches',
        valA: metricsA.matches,
        valB: metricsB.matches,
        displayA: `${metricsA.matches}`,
        displayB: `${metricsB.matches}`,
      },
      {
        key: 'runs',
        label: 'Total Runs',
        valA: metricsA.runs,
        valB: metricsB.runs,
        displayA: `${metricsA.runs}`,
        displayB: `${metricsB.runs}`,
      },
      {
        key: 'batAvg',
        label: 'Batting Avg',
        valA: metricsA.battingAvg,
        valB: metricsB.battingAvg,
        displayA: metricsA.battingAvg.toFixed(1),
        displayB: metricsB.battingAvg.toFixed(1),
      },
      {
        key: 'strikeRate',
        label: 'Strike Rate',
        valA: metricsA.strikeRate,
        valB: metricsB.strikeRate,
        displayA: metricsA.strikeRate.toFixed(1),
        displayB: metricsB.strikeRate.toFixed(1),
      },
      {
        key: 'highest',
        label: 'Highest Score',
        valA: metricsA.highestScore,
        valB: metricsB.highestScore,
        displayA: `${metricsA.highestScore}`,
        displayB: `${metricsB.highestScore}`,
      },
      {
        key: 'fours',
        label: 'Fours (4s)',
        valA: metricsA.fours,
        valB: metricsB.fours,
        displayA: `${metricsA.fours}`,
        displayB: `${metricsB.fours}`,
      },
      {
        key: 'sixes',
        label: 'Sixes (6s)',
        valA: metricsA.sixes,
        valB: metricsB.sixes,
        displayA: `${metricsA.sixes}`,
        displayB: `${metricsB.sixes}`,
      },
      {
        key: 'wickets',
        label: 'Wickets',
        valA: metricsA.wickets,
        valB: metricsB.wickets,
        displayA: `${metricsA.wickets}`,
        displayB: `${metricsB.wickets}`,
      },
      {
        key: 'economy',
        label: 'Economy Rate',
        valA: metricsA.economy,
        valB: metricsB.economy,
        displayA: metricsA.ballsBowled > 0 ? metricsA.economy.toFixed(2) : '—',
        displayB: metricsB.ballsBowled > 0 ? metricsB.economy.toFixed(2) : '—',
        lowerIsBetter: true,
        requiresPositiveToLead: true,
      },
      {
        key: 'bowlAvg',
        label: 'Bowling Avg',
        valA: metricsA.bowlingAvg,
        valB: metricsB.bowlingAvg,
        displayA: metricsA.wickets > 0 ? metricsA.bowlingAvg.toFixed(1) : '—',
        displayB: metricsB.wickets > 0 ? metricsB.bowlingAvg.toFixed(1) : '—',
        lowerIsBetter: true,
        requiresPositiveToLead: true,
      },
      {
        key: 'catches',
        label: 'Catches',
        valA: metricsA.catches,
        valB: metricsB.catches,
        displayA: `${metricsA.catches}`,
        displayB: `${metricsB.catches}`,
      },
      {
        key: 'potm',
        label: 'POTM Awards',
        valA: metricsA.potmAwards,
        valB: metricsB.potmAwards,
        displayA: `${metricsA.potmAwards}`,
        displayB: `${metricsB.potmAwards}`,
      },
    ];
  }, [metricsA, metricsB]);

  const getWinner = (row: StatComparisonRow): 'A' | 'B' | 'tie' => {
    if (row.requiresPositiveToLead) {
      if (row.valA <= 0 && row.valB <= 0) return 'tie';
      if (row.valA <= 0) return 'B';
      if (row.valB <= 0) return 'A';
    }
    if (row.valA === row.valB) return 'tie';
    if (row.lowerIsBetter) {
      return row.valA < row.valB ? 'A' : 'B';
    }
    return row.valA > row.valB ? 'A' : 'B';
  };

  const leadTally = useMemo(() => {
    let a = 0;
    let b = 0;
    let tie = 0;
    for (const row of allComparisonRows) {
      const w = getWinner(row);
      if (w === 'A') a++;
      else if (w === 'B') b++;
      else tie++;
    }
    return { a, b, tie, total: allComparisonRows.length };
  }, [allComparisonRows]);

  const filteredTableRows = useMemo(() => {
    if (activeTab === 'batting') {
      return allComparisonRows.filter((r) =>
        ['matches', 'runs', 'batAvg', 'strikeRate', 'highest', 'fours', 'sixes'].includes(r.key)
      );
    }
    if (activeTab === 'bowling') {
      return allComparisonRows.filter((r) =>
        ['matches', 'wickets', 'economy', 'bowlAvg', 'catches', 'potm'].includes(r.key)
      );
    }
    return allComparisonRows;
  }, [allComparisonRows, activeTab]);

  // Grouped Bar Chart Data depending on active tab
  const groupedBarItems = useMemo(() => {
    if (!metricsA || !metricsB) return [];
    if (activeTab === 'batting') {
      return [
        { label: 'Runs', a: metricsA.runs, b: metricsB.runs, fmtA: `${metricsA.runs}`, fmtB: `${metricsB.runs}` },
        { label: 'High', a: metricsA.highestScore, b: metricsB.highestScore, fmtA: `${metricsA.highestScore}`, fmtB: `${metricsB.highestScore}` },
        { label: 'Avg', a: metricsA.battingAvg, b: metricsB.battingAvg, fmtA: metricsA.battingAvg.toFixed(1), fmtB: metricsB.battingAvg.toFixed(1) },
        { label: 'SR', a: metricsA.strikeRate, b: metricsB.strikeRate, fmtA: metricsA.strikeRate.toFixed(0), fmtB: metricsB.strikeRate.toFixed(0) },
        { label: '4s', a: metricsA.fours, b: metricsB.fours, fmtA: `${metricsA.fours}`, fmtB: `${metricsB.fours}` },
        { label: '6s', a: metricsA.sixes, b: metricsB.sixes, fmtA: `${metricsA.sixes}`, fmtB: `${metricsB.sixes}` },
      ];
    }
    if (activeTab === 'bowling') {
      return [
        { label: 'Wkts', a: metricsA.wickets, b: metricsB.wickets, fmtA: `${metricsA.wickets}`, fmtB: `${metricsB.wickets}` },
        { label: 'Overs', a: metricsA.oversBowled, b: metricsB.oversBowled, fmtA: `${metricsA.oversBowled}`, fmtB: `${metricsB.oversBowled}` },
        { label: 'Runs', a: metricsA.runsConceded, b: metricsB.runsConceded, fmtA: `${metricsA.runsConceded}`, fmtB: `${metricsB.runsConceded}` },
        { label: 'Econ', a: metricsA.economy, b: metricsB.economy, fmtA: metricsA.economy.toFixed(1), fmtB: metricsB.economy.toFixed(1) },
        { label: 'B.Avg', a: metricsA.bowlingAvg, b: metricsB.bowlingAvg, fmtA: metricsA.bowlingAvg.toFixed(1), fmtB: metricsB.bowlingAvg.toFixed(1) },
      ];
    }
    return [
      { label: 'Matches', a: metricsA.matches, b: metricsB.matches, fmtA: `${metricsA.matches}`, fmtB: `${metricsB.matches}` },
      { label: 'Runs', a: metricsA.runs, b: metricsB.runs, fmtA: `${metricsA.runs}`, fmtB: `${metricsB.runs}` },
      { label: 'Wickets', a: metricsA.wickets, b: metricsB.wickets, fmtA: `${metricsA.wickets}`, fmtB: `${metricsB.wickets}` },
      { label: '4s + 6s', a: metricsA.fours + metricsA.sixes, b: metricsB.fours + metricsB.sixes, fmtA: `${metricsA.fours + metricsA.sixes}`, fmtB: `${metricsB.fours + metricsB.sixes}` },
      { label: 'Catches', a: metricsA.catches, b: metricsB.catches, fmtA: `${metricsA.catches}`, fmtB: `${metricsB.catches}` },
      { label: 'POTM', a: metricsA.potmAwards, b: metricsB.potmAwards, fmtA: `${metricsA.potmAwards}`, fmtB: `${metricsB.potmAwards}` },
    ];
  }, [metricsA, metricsB, activeTab]);

  // Recent 6 matches ordered chronologically (oldest -> newest) for Form chart
  const recentFormSeries = useMemo(() => {
    const aRecent = [...statsA].slice(0, 6).reverse();
    const bRecent = [...statsB].slice(0, 6).reverse();
    const count = Math.max(aRecent.length, bRecent.length);
    return { aRecent, bRecent, count };
  }, [statsA, statsB]);

  const handleSwapPlayers = () => {
    if (!playerA || !playerB) return;
    setPlayerAId(playerB.id);
    setPlayerBId(playerA.id);
  };

  const handlePickPlayer = (picked: Player) => {
    if (pickerSlot === 'A') {
      if (picked.id === playerBId && playerA) {
        setPlayerBId(playerA.id);
      }
      setPlayerAId(picked.id);
    } else if (pickerSlot === 'B') {
      if (picked.id === playerAId && playerB) {
        setPlayerAId(playerB.id);
      }
      setPlayerBId(picked.id);
    }
    setPickerSlot(null);
    setPickerSearch('');
  };

  const pickerPlayers = useMemo(() => {
    return sortedDirectory.filter((p) => {
      if (pickerSearch.trim() && !p.fullName.toLowerCase().includes(pickerSearch.toLowerCase())) {
        return false;
      }
      if (roleFilter === 'batter') {
        return p.playingRole.includes('batter');
      }
      if (roleFilter === 'bowler') {
        return p.playingRole.includes('bowler');
      }
      if (roleFilter === 'allrounder') {
        return p.playingRole.includes('allrounder');
      }
      return true;
    });
  }, [sortedDirectory, pickerSearch, roleFilter]);

  if (players.length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 font-sans text-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl stadium-card border border-white/10 text-white hover:border-[#1554B8] cursor-pointer"
              aria-label="Back to players"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="font-black text-2xl tracking-tight">Player Comparison</h1>
        </div>
        <div className="stadium-card border border-white/10 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <Users className="w-10 h-10 text-[#00F2FE] mx-auto opacity-80" />
          <h2 className="font-bold text-base text-white">Not Enough Players to Compare</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add at least two players to the directory to compare batting, bowling, and match-impact charts side-by-side.
          </p>
        </div>
      </div>
    );
  }

  // Radar SVG geometry
  const radarSize = 260;
  const radarCenter = radarSize / 2;
  const radarRadius = 86;
  const radarAxesCount = radarData.length || 6;

  const getRadarPoint = (axisIndex: number, valuePct: number) => {
    const angle = (Math.PI * 2 * axisIndex) / radarAxesCount - Math.PI / 2;
    const r = (Math.max(6, valuePct) / 100) * radarRadius;
    return {
      x: radarCenter + r * Math.cos(angle),
      y: radarCenter + r * Math.sin(angle),
    };
  };

  const polygonPoints = (scores: number[]) =>
    scores
      .map((s, idx) => {
        const pt = getRadarPoint(idx, s);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-5 font-sans text-white animate-in fade-in duration-150">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-start gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl stadium-card border border-white/10 text-white hover:border-[#1554B8] hover:text-[#00F2FE] transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Back to Players"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="font-black text-2xl sm:text-3xl tracking-tight text-white leading-tight">
              Player Comparison
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Select two players from the directory to compare career impact side-by-side.
            </p>
          </div>
        </div>
      </div>

      {/* Dual Player Selector */}
      {playerA && playerB && metricsA && metricsB && (
        <>
          <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            {/* Player A Selector Card */}
            <button
              type="button"
              onClick={() => setPickerSlot('A')}
              className="w-full text-left stadium-card border border-white/10 hover:border-[#1554B8] rounded-2xl p-3.5 shadow-xs transition-all cursor-pointer flex items-center gap-3 group min-h-[76px]"
            >
              <PlayerAvatar player={playerA} accentColor={COLOR_A} sizeClass="w-12 h-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00F2FE]">
                  <span>Player A</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 font-medium truncate">
                    {formatRoleLabel(playerA.playingRole)}
                  </span>
                </div>
                <div className="font-bold text-sm sm:text-base text-white truncate mt-0.5 group-hover:text-[#00F2FE] transition-colors">
                  {playerA.fullName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                  {metricsA.matches} M · {metricsA.runs} R · {metricsA.wickets} W
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#00F2FE] shrink-0" />
            </button>

            {/* Swap Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapPlayers}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#00F2FE]/15 hover:bg-[#1554B8] text-[#00F2FE] hover:text-white border border-white/10 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Swap Player A and Player B"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="sm:hidden">Swap Players</span>
              </button>
            </div>

            {/* Player B Selector Card */}
            <button
              type="button"
              onClick={() => setPickerSlot('B')}
              className="w-full text-left stadium-card border border-white/10 hover:border-[#D97706] rounded-2xl p-3.5 shadow-xs transition-all cursor-pointer flex items-center gap-3 group min-h-[76px]"
            >
              <PlayerAvatar player={playerB} accentColor={COLOR_B} sizeClass="w-12 h-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                  <span>Player B</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 font-medium truncate">
                    {formatRoleLabel(playerB.playingRole)}
                  </span>
                </div>
                <div className="font-bold text-sm sm:text-base text-white truncate mt-0.5 group-hover:text-amber-400 transition-colors">
                  {playerB.fullName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                  {metricsB.matches} M · {metricsB.runs} R · {metricsB.wickets} W
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0" />
            </button>
          </div>

          {/* Head-to-Head Lead Summary Bar */}
          <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-[#00F2FE] truncate block">
                  {playerA.fullName}
                </span>
                <span className="text-slate-400 font-mono tabular-nums text-[11px]">
                  Leads {leadTally.a} of {leadTally.total} metrics
                </span>
              </div>

              <div className="text-center shrink-0 px-2">
                <span className="text-[11px] font-semibold text-slate-400 font-mono tabular-nums">
                  {leadTally.tie > 0 ? `${leadTally.tie} Tied` : 'Head-to-Head'}
                </span>
              </div>

              <div className="min-w-0 text-right">
                <span className="font-bold text-amber-400 truncate block">
                  {playerB.fullName}
                </span>
                <span className="text-slate-400 font-mono tabular-nums text-[11px]">
                  Leads {leadTally.b} of {leadTally.total} metrics
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full overflow-hidden stadium-card/5 flex border border-white/10">
              <div
                style={{
                  width: `${leadTally.total > 0 ? (leadTally.a / leadTally.total) * 100 : 50}%`,
                  backgroundColor: COLOR_A,
                }}
                className="h-full transition-all duration-300"
              />
              <div
                style={{
                  width: `${leadTally.total > 0 ? (leadTally.tie / leadTally.total) * 100 : 0}%`,
                }}
                className="h-full bg-[#CBD5E1] transition-all duration-300"
              />
              <div
                style={{
                  width: `${leadTally.total > 0 ? (leadTally.b / leadTally.total) * 100 : 50}%`,
                  backgroundColor: COLOR_B,
                }}
                className="h-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Segmented Category Filter */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#00F2FE]/15 border border-white/10 rounded-xl text-xs font-semibold">
            {(
              [
                { id: 'overview', label: 'Overview', icon: BarChart2 },
                { id: 'batting', label: 'Batting', icon: Target },
                { id: 'bowling', label: 'Bowling', icon: Users },
                { id: 'form', label: 'Form', icon: TrendingUp },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1554B8] text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* OVERVIEW / BATTING / BOWLING CHARTS */}
          {activeTab !== 'form' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Chart: Radar Skill Profile (Overview) or Run Composition (Batting) or Bowling Profile (Bowling) */}
              {activeTab === 'overview' && (
                <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="font-bold text-sm text-white">All-Round Skill Radar</h2>
                      <p className="text-[11px] text-slate-400">
                        Scaled relative to squad benchmarks · Tap any axis
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center py-1">
                    <svg
                      viewBox={`0 0 ${radarSize} ${radarSize}`}
                      className="w-full max-w-[260px] h-auto overflow-visible"
                      role="img"
                      aria-label={`Skill radar comparing ${playerA.fullName} and ${playerB.fullName}`}
                    >
                      {/* Concentric hexagonal grid rings */}
                      {[25, 50, 75, 100].map((ring) => (
                        <polygon
                          key={ring}
                          points={polygonPoints(Array(radarAxesCount).fill(ring))}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.15)"
                          strokeWidth={ring === 100 ? 1.4 : 1}
                        />
                      ))}

                      {/* Axis spokes & clickable labels */}
                      {radarData.map((axis, idx) => {
                        const edge = getRadarPoint(idx, 100);
                        const angle = (Math.PI * 2 * idx) / radarAxesCount - Math.PI / 2;
                        const labelX = radarCenter + (radarRadius + 24) * Math.cos(angle);
                        const labelY = radarCenter + (radarRadius + 22) * Math.sin(angle);
                        const isSelected = activeRadarAxis === idx;

                        return (
                          <g
                            key={axis.label}
                            onClick={() => setActiveRadarAxis(idx)}
                            className="cursor-pointer"
                          >
                            <line
                              x1={radarCenter}
                              y1={radarCenter}
                              x2={edge.x}
                              y2={edge.y}
                              stroke={isSelected ? '#1554B8' : '#DFE7F2'}
                              strokeWidth={isSelected ? 1.5 : 1}
                            />
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`text-[10.5px] font-semibold select-none ${
                                isSelected ? 'fill-[#00F2FE] font-bold' : 'fill-[#94A3B8]'
                              }`}
                            >
                              {axis.label}
                            </text>
                          </g>
                        );
                      })}

                      {/* Player B Polygon */}
                      <polygon
                        points={polygonPoints(radarData.map((d) => d.scoreB))}
                        fill={COLOR_B}
                        fillOpacity={0.18}
                        stroke={COLOR_B}
                        strokeWidth={2}
                      />

                      {/* Player A Polygon */}
                      <polygon
                        points={polygonPoints(radarData.map((d) => d.scoreA))}
                        fill={COLOR_A}
                        fillOpacity={0.22}
                        stroke={COLOR_A}
                        strokeWidth={2.2}
                      />

                      {/* Vertex Dots */}
                      {radarData.map((d, idx) => {
                        const ptA = getRadarPoint(idx, d.scoreA);
                        const ptB = getRadarPoint(idx, d.scoreB);
                        return (
                          <g
                            key={`pts-${d.label}`}
                            onClick={() => setActiveRadarAxis(idx)}
                            className="cursor-pointer"
                          >
                            <circle cx={ptB.x} cy={ptB.y} r={activeRadarAxis === idx ? 4.5 : 3} fill={COLOR_B} stroke="#FFFFFF" strokeWidth={1.2} />
                            <circle cx={ptA.x} cy={ptA.y} r={activeRadarAxis === idx ? 4.5 : 3} fill={COLOR_A} stroke="#FFFFFF" strokeWidth={1.2} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Interactive Axis Readout */}
                  {radarData[activeRadarAxis] && (
                    <div className="mt-2 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <div className="font-mono tabular-nums font-bold text-[#00F2FE]">
                        {radarData[activeRadarAxis].rawA}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        {radarData[activeRadarAxis].label}
                      </div>
                      <div className="font-mono tabular-nums font-bold text-amber-400">
                        {radarData[activeRadarAxis].rawB}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'batting' && (
                <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="font-bold text-sm text-white">Run Scoring Composition</h2>
                    <p className="text-[11px] text-slate-400">
                      Share of runs from Sixes (6s), Fours (4s), and Running (1s/2s/3s)
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { player: playerA, m: metricsA, color: COLOR_A, labelColor: 'text-[#00F2FE]' },
                      { player: playerB, m: metricsB, color: COLOR_B, labelColor: 'text-amber-400' },
                    ].map(({ player, m, labelColor }) => {
                      const runs6 = m.sixes * 6;
                      const runs4 = m.fours * 4;
                      const runsOther = Math.max(0, m.runs - runs6 - runs4);
                      const total = Math.max(1, m.runs);
                      const pct6 = m.runs > 0 ? Math.round((runs6 / total) * 100) : 0;
                      const pct4 = m.runs > 0 ? Math.round((runs4 / total) * 100) : 0;
                      const pctOther = m.runs > 0 ? Math.max(0, 100 - pct6 - pct4) : 0;

                      return (
                        <div key={player.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold truncate ${labelColor}`}>{player.fullName}</span>
                            <span className="font-mono tabular-nums text-slate-400">
                              {m.runs} runs · {m.boundaryPct}% boundaries
                            </span>
                          </div>
                          <div className="h-4 w-full rounded-lg overflow-hidden stadium-card/5 border border-white/10 flex">
                            {m.runs > 0 ? (
                              <>
                                <div
                                  style={{ width: `${pct6}%` }}
                                  className="h-full bg-[#1554B8]"
                                  title={`Sixes: ${runs6} runs (${pct6}%)`}
                                />
                                <div
                                  style={{ width: `${pct4}%` }}
                                  className="h-full bg-[#2878E5]"
                                  title={`Fours: ${runs4} runs (${pct4}%)`}
                                />
                                <div
                                  style={{ width: `${pctOther}%` }}
                                  className="h-full bg-[#93C5FD]"
                                  title={`Running: ${runsOther} runs (${pctOther}%)`}
                                />
                              </>
                            ) : (
                              <div className="w-full h-full bg-[#E2E8F0]" />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                            <span>6s: {runs6}r ({pct6}%)</span>
                            <span>4s: {runs4}r ({pct4}%)</span>
                            <span>1s–3s: {runsOther}r ({pctOther}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#1554B8]" /> Sixes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#2878E5]" /> Fours
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#93C5FD]" /> Running
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'bowling' && (
                <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="font-bold text-sm text-white">Bowling Efficiency Gauges</h2>
                    <p className="text-[11px] text-slate-400">
                      Wickets, economy rate, and best match bowling figures
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { player: playerA, m: metricsA, color: COLOR_A, text: 'text-[#00F2FE]', bg: COLOR_A_LIGHT },
                      { player: playerB, m: metricsB, color: COLOR_B, text: 'text-amber-400', bg: COLOR_B_LIGHT },
                    ].map(({ player, m, color, text, bg }) => {
                      const econNormalized =
                        m.ballsBowled > 0 ? Math.min(100, Math.round((m.economy / 12) * 100)) : 0;
                      const r = 30;
                      const circ = 2 * Math.PI * r;
                      const dashOffset = circ - (econNormalized / 100) * circ;

                      return (
                        <div
                          key={player.id}
                          style={{ backgroundColor: bg }}
                          className="rounded-xl p-3 border border-white/10 flex flex-col items-center text-center space-y-2"
                        >
                          <span className={`font-bold text-xs truncate w-full ${text}`}>
                            {player.fullName}
                          </span>
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                              <circle cx="36" cy="36" r={r} fill="none" stroke="#FFFFFF" strokeWidth="6" />
                              <circle
                                cx="36"
                                cy="36"
                                r={r}
                                fill="none"
                                stroke={color}
                                strokeWidth="6"
                                strokeDasharray={circ}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-mono tabular-nums font-bold text-sm text-white">
                                {m.ballsBowled > 0 ? m.economy.toFixed(2) : '—'}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-semibold">ECON</span>
                            </div>
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-white">
                            {m.wickets} Wkts · Best {m.bestBowlingLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Right Chart: Side-by-Side Grouped Vertical Bar Chart */}
              <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-bold text-sm text-white">Head-to-Head Bar Chart</h2>
                    <p className="text-[11px] text-slate-400">
                      Each pair scaled to its higher value with exact figures
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[11px] font-semibold mb-3">
                  <span className="flex items-center gap-1.5 text-white truncate max-w-[140px]">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: COLOR_A }} />
                    <span className="truncate">{playerA.fullName}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-white truncate max-w-[140px]">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: COLOR_B }} />
                    <span className="truncate">{playerB.fullName}</span>
                  </span>
                </div>

                {/* Grouped Bar Canvas */}
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 items-end h-44 pt-5 border-b border-white/10 pb-2">
                  {groupedBarItems.slice(0, 6).map((item) => {
                    const pairMax = Math.max(item.a, item.b, 1);
                    const pctA = item.a > 0 ? Math.max(8, Math.round((item.a / pairMax) * 100)) : 2;
                    const pctB = item.b > 0 ? Math.max(8, Math.round((item.b / pairMax) * 100)) : 2;

                    return (
                      <div key={item.label} className="flex flex-col items-center h-full justify-end gap-1.5">
                        <div className="flex items-end justify-center gap-1 w-full flex-1">
                          {/* Bar A */}
                          <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                            <span className="text-[9.5px] font-mono tabular-nums font-bold text-[#00F2FE] mb-1">
                              {item.fmtA}
                            </span>
                            <div
                              style={{ height: `${pctA}%`, backgroundColor: COLOR_A }}
                              className="w-full rounded-t-md transition-all duration-300"
                            />
                          </div>

                          {/* Bar B */}
                          <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                            <span className="text-[9.5px] font-mono tabular-nums font-bold text-amber-400 mb-1">
                              {item.fmtB}
                            </span>
                            <div
                              style={{ height: `${pctB}%`, backgroundColor: COLOR_B }}
                              className="w-full rounded-t-md transition-all duration-300"
                            />
                          </div>
                        </div>
                        <span className="text-[10.5px] font-semibold text-slate-400 whitespace-nowrap">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* RECENT FORM LINE CHART TAB */
            <div className="stadium-card border border-white/10 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm text-white">Recent Match Form (Last 6 Matches)</h2>
                  <p className="text-[11px] text-slate-400">
                    Match-by-match trajectory from recorded scorecards
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 stadium-card/5 border border-white/10 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => { setFormMetric('runs'); setSelectedFormIndex(null); }}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      formMetric === 'runs' ? 'bg-[#1554B8] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Runs
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormMetric('wickets'); setSelectedFormIndex(null); }}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      formMetric === 'wickets' ? 'bg-[#1554B8] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Wickets
                  </button>
                </div>
              </div>

              {loadingForm ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading recent match stats...
                </div>
              ) : formError ? (
                <div className="py-8 text-center text-xs text-[#D94343]">{formError}</div>
              ) : recentFormSeries.count === 0 ? (
                <div className="py-10 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-white">No finalized match history yet</p>
                  <p className="text-[11px] text-slate-400">
                    Recent match form charts appear once matches are scored and finalized.
                  </p>
                </div>
              ) : (
                (() => {
                  const chartW = 540;
                  const chartH = 200;
                  const padL = 34;
                  const padR = 18;
                  const padT = 20;
                  const padB = 30;
                  const innerW = chartW - padL - padR;
                  const innerH = chartH - padT - padB;
                  const slots = Math.max(2, recentFormSeries.count);

                  const valOf = (s: PlayerMatchStat) =>
                    formMetric === 'runs' ? s.battingRuns : s.wickets;

                  const maxVal = Math.max(
                    formMetric === 'runs' ? 30 : 3,
                    ...recentFormSeries.aRecent.map(valOf),
                    ...recentFormSeries.bRecent.map(valOf)
                  );

                  const xAt = (idx: number) =>
                    padL + (slots === 1 ? innerW / 2 : (idx / (slots - 1)) * innerW);
                  const yAt = (v: number) => padT + innerH - (v / maxVal) * innerH;

                  const buildPoints = (list: PlayerMatchStat[]) =>
                    list.map((s, i) => `${xAt(i).toFixed(1)},${yAt(valOf(s)).toFixed(1)}`).join(' ');

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-[11px] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: COLOR_A }} />
                          <span className="text-[#00F2FE]">{playerA.fullName}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: COLOR_B }} />
                          <span className="text-amber-400">{playerB.fullName}</span>
                        </span>
                      </div>

                      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
                        {[0, 0.5, 1].map((frac) => {
                          const y = padT + innerH * (1 - frac);
                          const labelVal = Math.round(maxVal * frac);
                          return (
                            <g key={frac}>
                              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />
                              <text x={padL - 6} y={y + 3} textAnchor="end" className="text-[10px] font-mono fill-[#94A3B8]">
                                {labelVal}
                              </text>
                            </g>
                          );
                        })}

                        {recentFormSeries.bRecent.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={COLOR_B}
                            strokeWidth={2.5}
                            strokeLinejoin="round"
                            points={buildPoints(recentFormSeries.bRecent)}
                          />
                        )}
                        {recentFormSeries.aRecent.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={COLOR_A}
                            strokeWidth={2.5}
                            strokeLinejoin="round"
                            points={buildPoints(recentFormSeries.aRecent)}
                          />
                        )}

                        {Array.from({ length: recentFormSeries.count }).map((_, i) => {
                          const x = xAt(i);
                          const itemA = recentFormSeries.aRecent[i];
                          const itemB = recentFormSeries.bRecent[i];
                          return (
                            <g key={i} onClick={() => setSelectedFormIndex(i)} className="cursor-pointer">
                              <text x={x} y={chartH - 8} textAnchor="middle" className="text-[10px] font-mono fill-[#94A3B8]">
                                M{i + 1}
                              </text>
                              {itemB && (
                                <circle
                                  cx={x}
                                  cy={yAt(valOf(itemB))}
                                  r={selectedFormIndex === i ? 5.5 : 4}
                                  fill={COLOR_B}
                                  stroke="#FFFFFF"
                                  strokeWidth={1.5}
                                />
                              )}
                              {itemA && (
                                <circle
                                  cx={x}
                                  cy={yAt(valOf(itemA))}
                                  r={selectedFormIndex === i ? 5.5 : 4}
                                  fill={COLOR_A}
                                  stroke="#FFFFFF"
                                  strokeWidth={1.5}
                                />
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {selectedFormIndex !== null && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                          <div className="bg-[#00F2FE]/15 rounded-xl p-2.5">
                            <div className="font-bold text-[#00F2FE] truncate">{playerA.fullName}</div>
                            {recentFormSeries.aRecent[selectedFormIndex] ? (
                              <div className="text-[11px] text-white font-mono tabular-nums mt-0.5">
                                {recentFormSeries.aRecent[selectedFormIndex].battingRuns}r ({recentFormSeries.aRecent[selectedFormIndex].ballsFaced}b) · {recentFormSeries.aRecent[selectedFormIndex].wickets}w — vs {recentFormSeries.aRecent[selectedFormIndex].opponentName}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 mt-0.5">No match record in slot</div>
                            )}
                          </div>
                          <div className="bg-[#FEF3C7] rounded-xl p-2.5">
                            <div className="font-bold text-amber-400 truncate">{playerB.fullName}</div>
                            {recentFormSeries.bRecent[selectedFormIndex] ? (
                              <div className="text-[11px] text-white font-mono tabular-nums mt-0.5">
                                {recentFormSeries.bRecent[selectedFormIndex].battingRuns}r ({recentFormSeries.bRecent[selectedFormIndex].ballsFaced}b) · {recentFormSeries.bRecent[selectedFormIndex].wickets}w — vs {recentFormSeries.bRecent[selectedFormIndex].opponentName}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 mt-0.5">No match record in slot</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Diverging Split-Bar Stat Breakdown */}
          <div className="stadium-card border border-white/10 rounded-2xl overflow-hidden shadow-xs">
            <div className="stadium-card/5 px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs font-bold">
              <span className="text-[#00F2FE] truncate max-w-[35%]">{playerA.fullName}</span>
              <span className="text-slate-400 text-[11px] uppercase tracking-wider">Metric</span>
              <span className="text-amber-400 truncate max-w-[35%] text-right">{playerB.fullName}</span>
            </div>

            <div className="divide-y divide-[#DFE7F2]">
              {filteredTableRows.map((row) => {
                const winner = getWinner(row);
                const maxVal = Math.max(row.valA, row.valB, 1);
                const pctA = row.valA > 0 ? Math.min(100, Math.round((row.valA / maxVal) * 100)) : 0;
                const pctB = row.valB > 0 ? Math.min(100, Math.round((row.valB / maxVal) * 100)) : 0;

                return (
                  <div key={row.key} className="px-4 py-3 space-y-1.5">
                    <div className="grid grid-cols-3 items-center text-xs">
                      <span
                        className={`font-mono tabular-nums text-sm ${
                          winner === 'A' ? 'font-bold text-[#00F2FE]' : 'font-medium text-white'
                        }`}
                      >
                        {row.displayA}
                      </span>
                      <span className="text-center text-[11px] font-semibold text-slate-400">
                        {row.label}
                      </span>
                      <span
                        className={`font-mono tabular-nums text-sm text-right ${
                          winner === 'B' ? 'font-bold text-amber-400' : 'font-medium text-white'
                        }`}
                      >
                        {row.displayB}
                      </span>
                    </div>

                    {/* Opposing proportional bars */}
                    <div className="grid grid-cols-2 gap-1.5 h-2">
                      <div className="stadium-card/5 rounded-l-full overflow-hidden flex justify-end">
                        <div
                          style={{
                            width: `${pctA}%`,
                            backgroundColor: winner === 'A' ? COLOR_A : '#93C5FD',
                          }}
                          className="h-full rounded-l-full transition-all duration-300"
                        />
                      </div>
                      <div className="stadium-card/5 rounded-r-full overflow-hidden flex justify-start">
                        <div
                          style={{
                            width: `${pctB}%`,
                            backgroundColor: winner === 'B' ? COLOR_B : '#FCD34D',
                          }}
                          className="h-full rounded-r-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {onSelectPlayerProfile && (
              <div className="stadium-card/5 px-4 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectPlayerProfile(playerA)}
                  className="text-xs font-bold text-[#00F2FE] hover:underline cursor-pointer min-h-[36px]"
                >
                  Open {playerA.fullName} Profile →
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPlayerProfile(playerB)}
                  className="text-xs font-bold text-amber-400 hover:underline cursor-pointer min-h-[36px]"
                >
                  Open {playerB.fullName} Profile →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* PLAYER PICKER MODAL */}
      {pickerSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="stadium-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Select Player {pickerSlot}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Choose from {players.length} registered players
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:stadium-card/5 cursor-pointer"
                aria-label="Close player picker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-white/10 space-y-2.5 stadium-card/5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search player name..."
                  className="w-full stadium-card border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#718096] focus:outline-none focus:border-[#1554B8]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 stadium-card border border-white/10 rounded-xl text-[11px] font-semibold">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'batter', label: 'Batters' },
                    { id: 'bowler', label: 'Bowlers' },
                    { id: 'allrounder', label: 'Allround' },
                  ] as const
                ).map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setRoleFilter(rf.id)}
                    className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                      roleFilter === rf.id
                        ? 'bg-[#1554B8] text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#DFE7F2]">
              {pickerPlayers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No players match "{pickerSearch}".
                </div>
              ) : (
                pickerPlayers.map((p) => {
                  const isCurrentSlot =
                    (pickerSlot === 'A' && p.id === playerAId) ||
                    (pickerSlot === 'B' && p.id === playerBId);
                  const isOtherSlot =
                    (pickerSlot === 'A' && p.id === playerBId) ||
                    (pickerSlot === 'B' && p.id === playerAId);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePickPlayer(p)}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer min-h-[60px] ${
                        isCurrentSlot ? 'bg-[#00F2FE]/15' : 'hover:stadium-card/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          player={p}
                          accentColor={pickerSlot === 'A' ? COLOR_A : COLOR_B}
                          sizeClass="w-10 h-10"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-white truncate">
                            {p.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {formatRoleLabel(p.playingRole)} · {p.career?.runs || 0} R · {p.career?.wickets || 0} W
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-[11px] font-semibold">
                        {isCurrentSlot ? (
                          <span className="text-[#00F2FE] flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Selected
                          </span>
                        ) : isOtherSlot ? (
                          <span className="text-slate-400">Swap</span>
                        ) : (
                          <span className="text-[#00F2FE]">Select</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
