import React, { useState, useEffect, useRef } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { subscribeSingleMatch, nominatePlayerOfTheMatch } from '../services/matchService';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';
import { MatchResultCard } from './MatchResultCard';
import { toPng } from 'html-to-image';
import { calculateWinProbability } from '../utils/winProbability';
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  Trophy,
  MessageSquare,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle,
  Users,
  Edit3,
  Trash2,
  Image as ImageIcon,
  TrendingUp,
  Award,
  Search,
  Star,
  Check,
  Sparkles,
  Copy,
} from 'lucide-react';

interface MatchDetailsViewProps {
  match: CricketMatch;
  players: Player[];
  onBack: () => void;
  onOpenScorecardModal?: (match: CricketMatch) => void;
  onSelectPlayer?: (player: Player) => void;
  onEditMatch?: (match: CricketMatch) => void;
  onDeleteMatch?: (match: CricketMatch) => void;
}

export const MatchDetailsView: React.FC<MatchDetailsViewProps> = ({
  match: initialMatch,
  players,
  onBack,
  onOpenScorecardModal,
  onSelectPlayer,
  onEditMatch,
  onDeleteMatch,
}) => {
  const [match, setMatch] = useState<CricketMatch>(initialMatch);

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    if (!initialMatch?.id) return;
    const unsub = subscribeSingleMatch(initialMatch.id, (updated) => {
      if (updated) {
        setMatch(updated);
      }
    });
    return () => unsub();
  }, [initialMatch?.id]);

  if (!match) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-12 bg-[#EAF2FF] rounded-2xl w-full" />
        <div className="h-48 bg-[#EAF2FF] rounded-3xl w-full" />
        <div className="h-32 bg-[#EAF2FF] rounded-2xl w-full" />
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'live' | 'scorecard' | 'commentary' | 'info'>('live');
  const [isMatchInfoOpen, setIsMatchInfoOpen] = useState(true);
  const [isTeam1Open, setIsTeam1Open] = useState(true);
  const [isTeam2Open, setIsTeam2Open] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShareImage = async () => {
    if (cardRef.current) {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `match-result-${match.id}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const copyDeepLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?matchId=${match.id}`;
    let success = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        textArea.remove();
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }

    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?matchId=${match.id}`;
    const title = `${match.title} - LocalXI Live Match`;
    const text = `${match.title}: ${match.teamA.name} vs ${match.teamB.name} - Watch Live Match Status on LocalXI!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await copyDeepLink();
  };

  const handleCopySummary = async () => {
    const innings1Text = match.innings1
      ? `${match.innings1.teamName || match.teamA.name}: ${match.innings1.totalRuns}/${match.innings1.wickets} (${match.innings1.legalOvers}.${match.innings1.legalBalls} ov)`
      : '';
    const innings2Text = match.innings2
      ? `${match.innings2.teamName || match.teamB.name}: ${match.innings2.totalRuns}/${match.innings2.wickets} (${match.innings2.legalOvers}.${match.innings2.legalBalls} ov)`
      : '';

    const resultText = match.result?.summaryText ? `Result: ${match.result.summaryText}` : '';
    const url = `${window.location.origin}${window.location.pathname}?matchId=${match.id}`;

    const summary = [
      `🏏 *${match.title}* 🏏`,
      `${match.teamA.name} vs ${match.teamB.name}`,
      '',
      innings1Text,
      innings2Text,
      '',
      resultText,
      '',
      `Check live updates on LocalXI!`,
      url
    ].filter(line => line !== '').join('\n').trim();

    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(summary);
        success = true;
      } catch (err) {
        console.error('Clipboard API failed:', err);
      }
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        textArea.remove();
      } catch (err) {
        console.error('Fallback copy summary failed:', err);
      }
    }

    if (success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    for (const p of players) map[p.id] = p;
    return map;
  }, [players]);

  const winProb = React.useMemo(() => calculateWinProbability(match), [match]);

  const { currentUser, isAdmin, isScorer } = useAuth();
  const canNominateMotm = isAdmin || isScorer;

  const [showMotmModal, setShowMotmModal] = useState(false);
  const [selectedMotmPlayerId, setSelectedMotmPlayerId] = useState<string>('');
  const [motmSearchQuery, setMotmSearchQuery] = useState('');
  const [motmTeamFilter, setMotmTeamFilter] = useState<'all' | 'teamA' | 'teamB'>('all');
  const [isSubmittingMotm, setIsSubmittingMotm] = useState(false);
  const [motmToast, setMotmToast] = useState(false);

  // Man of the Match details
  const potmPlayerId = match.result?.playerOfTheMatchId;
  const potmPlayer = potmPlayerId ? playersMap[potmPlayerId] : null;

  // Gather stats for POTM
  const potmBattingStat1 = potmPlayerId && match.innings1?.batters ? match.innings1.batters[potmPlayerId] : null;
  const potmBattingStat2 = potmPlayerId && match.innings2?.batters ? match.innings2.batters[potmPlayerId] : null;
  const potmBowlingStat1 = potmPlayerId && match.innings1?.bowlers ? match.innings1.bowlers[potmPlayerId] : null;
  const potmBowlingStat2 = potmPlayerId && match.innings2?.bowlers ? match.innings2.bowlers[potmPlayerId] : null;

  const potmTotalRuns = (potmBattingStat1?.runs || 0) + (potmBattingStat2?.runs || 0);
  const potmTotalBalls = (potmBattingStat1?.balls || 0) + (potmBattingStat2?.balls || 0);
  const potmTotalWickets = (potmBowlingStat1?.wickets || 0) + (potmBowlingStat2?.wickets || 0);
  const potmTotalRunsConceded = (potmBowlingStat1?.runsConceded || 0) + (potmBowlingStat2?.runsConceded || 0);
  const potmTotalOvers = (potmBowlingStat1?.overs || 0) + (potmBowlingStat2?.overs || 0);

  // Calculate top performer recommendations for modal
  const recommendedPerformers = React.useMemo(() => {
    const allPlayerIds = new Set([
      ...(match.teamA?.playerIds || []),
      ...(match.teamB?.playerIds || []),
    ]);

    const perfList: Array<{
      player: Player;
      teamName: string;
      teamId: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      wickets: number;
      runsConceded: number;
      overs: number;
      score: number;
      statSummary: string;
    }> = [];

    allPlayerIds.forEach((pId) => {
      const p = playersMap[pId];
      if (!p) return;

      const teamId = match.teamA.playerIds.includes(pId) ? match.teamA.id : match.teamB.id;
      const teamName = teamId === match.teamA.id ? match.teamA.name : match.teamB.name;

      const b1 = match.innings1?.batters?.[pId];
      const b2 = match.innings2?.batters?.[pId];
      const bw1 = match.innings1?.bowlers?.[pId];
      const bw2 = match.innings2?.bowlers?.[pId];

      const runs = (b1?.runs || 0) + (b2?.runs || 0);
      const balls = (b1?.balls || 0) + (b2?.balls || 0);
      const fours = (b1?.fours || 0) + (b2?.fours || 0);
      const sixes = (b1?.sixes || 0) + (b2?.sixes || 0);

      const wickets = (bw1?.wickets || 0) + (bw2?.wickets || 0);
      const runsConceded = (bw1?.runsConceded || 0) + (bw2?.runsConceded || 0);
      const overs = (bw1?.overs || 0) + (bw2?.overs || 0);

      const score = runs * 1.5 + wickets * 25 + fours * 1 + sixes * 2;

      const statParts: string[] = [];
      if (runs > 0) statParts.push(`${runs} runs (${balls}b)`);
      if (wickets > 0) statParts.push(`${wickets}/${runsConceded} (${overs}ov)`);
      const statSummary = statParts.length > 0 ? statParts.join(' & ') : 'Squad Player';

      perfList.push({
        player: p,
        teamName,
        teamId,
        runs,
        balls,
        fours,
        sixes,
        wickets,
        runsConceded,
        overs,
        score,
        statSummary,
      });
    });

    perfList.sort((a, b) => b.score - a.score);
    return perfList;
  }, [match, playersMap]);

  const handleNominateMotmSubmit = async (pId: string) => {
    if (!pId || isSubmittingMotm) return;
    setIsSubmittingMotm(true);
    try {
      await nominatePlayerOfTheMatch(
        match.id,
        pId,
        currentUser?.uid,
        currentUser?.displayName || 'Admin/Scorer'
      );
      setShowMotmModal(false);
      setMotmToast(true);
      setTimeout(() => setMotmToast(false), 3500);
    } catch (e) {
      console.error('Failed to nominate MOTM:', e);
    } finally {
      setIsSubmittingMotm(false);
    }
  };

  const activeInnings = match.currentInnings === 2 ? match.innings2 : match.innings1;

  // Determine batting and bowling team
  const battingTeamId =
    match.currentInnings === 1
      ? match.toss?.decision === 'bat'
        ? match.toss.winnerTeamId
        : match.toss?.winnerTeamId === match.teamA.id
        ? match.teamB.id
        : match.teamA.id
      : match.toss?.decision === 'bat'
      ? match.toss?.winnerTeamId === match.teamA.id
        ? match.teamB.id
        : match.teamA.id
      : match.toss?.winnerTeamId || match.teamB.id;

  const battingTeam = battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam = battingTeamId === match.teamA.id ? match.teamB : match.teamA;

  const striker = match.currentStrikerId ? playersMap[match.currentStrikerId] : null;
  const nonStriker = match.currentNonStrikerId ? playersMap[match.currentNonStrikerId] : null;
  const bowler = match.currentBowlerId ? playersMap[match.currentBowlerId] : null;

  const strikerStat = striker && activeInnings?.batters ? activeInnings.batters[striker.id] : null;
  const nonStrikerStat =
    nonStriker && activeInnings?.batters ? activeInnings.batters[nonStriker.id] : null;
  const bowlerStat = bowler && activeInnings?.bowlers ? activeInnings.bowlers[bowler.id] : null;

  const oversBalls = (activeInnings?.legalOvers ?? 0) * 6 + (activeInnings?.legalBalls ?? 0);
  const currentRunRate =
    oversBalls > 0
      ? (((activeInnings?.totalRuns ?? 0) / oversBalls) * 6).toFixed(2)
      : '0.00';

  const requiredRuns =
    match.currentInnings === 2 && match.targetRuns
      ? Math.max(0, match.targetRuns - (activeInnings?.totalRuns ?? 0))
      : null;
  const remainingBalls =
    match.currentInnings === 2
      ? Math.max(0, match.oversPerInnings * 6 - oversBalls)
      : null;
  const requiredRunRate =
    requiredRuns !== null && remainingBalls !== null && remainingBalls > 0
      ? ((requiredRuns / remainingBalls) * 6).toFixed(2)
      : null;

  const team1Squad = match.teamA.playerIds.map((id) => playersMap[id] || { id, fullName: `Player ${id.slice(-4)}` });
  const team2Squad = match.teamB.playerIds.map((id) => playersMap[id] || { id, fullName: `Player ${id.slice(-4)}` });

  return (
    <div className="space-y-3.5 max-w-md mx-auto px-4 pb-8 text-[#172033] relative">
      {/* Toast Notice for Copied Link */}
      {copiedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1554B8] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-white/20 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4 text-[#21864A] bg-white rounded-full p-0.5 shrink-0" />
          <span>Match info copied to clipboard! (मैच की जानकारी कॉपी हो गई)</span>
        </div>
      )}

      {/* Toast Notice for MOTM Nomination */}
      {motmToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1554B8] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-white/20 animate-in fade-in slide-in-from-top duration-200">
          <Award className="w-4 h-4 text-amber-300 shrink-0" />
          <span>Man of the Match nominated successfully! (मैन ऑफ द मैच मनोनीत हुआ)</span>
        </div>
      )}

      {/* Hidden Card for Image Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <MatchResultCard ref={cardRef} match={match} playersMap={playersMap} />
      </div>

      {/* ================= TOP HEADER ================= */}
      <div className="flex items-center justify-between pt-1 pb-1 text-[#172033] border-b border-[#DFE7F2]">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
          title="Back to Matches"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center min-w-0 flex-1 px-2 truncate">
          <h2 className="font-sans font-bold text-base text-[#172033] leading-tight truncate">
            {match.title}
          </h2>
          <p className="text-[11px] text-[#718096] font-medium leading-tight mt-0.5 truncate">
            {match.playersPerTeam}v{match.playersPerTeam} • {match.oversPerInnings} Overs •{' '}
            {match.status.toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-1 relative">
          {match.status === 'completed' && (
            <button
              onClick={handleShareImage}
              className="p-1.5 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
              title="Share Result Image"
            >
              <ImageIcon className="w-4.5 h-4.5 stroke-[2]" />
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-1.5 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
            title="Share Match / Copy Link"
          >
            <Share2 className="w-4.5 h-4.5 stroke-[2]" />
          </button>
          <button
            onClick={handleCopySummary}
            className="p-1.5 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
            title="Copy Match Summary"
          >
            <Copy className="w-4.5 h-4.5 stroke-[2]" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-[#172033] hover:text-[#1554B8] rounded-lg transition-colors cursor-pointer"
            title="More options"
          >
            <MoreVertical className="w-4.5 h-4.5 stroke-[2]" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-[#DFE7F2] rounded-xl shadow-xl py-1 w-44 text-xs text-[#172033]">
              {onEditMatch && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditMatch(match);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#EAF2FF] flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#1554B8]" />
                  <span>Edit Match</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleShare();
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#EAF2FF] flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-[#1554B8]" />
                <span>Share Match Link</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleCopySummary();
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#EAF2FF] flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-[#1554B8]" />
                <span>Copy Summary (सारांश)</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setActiveTab('scorecard');
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#EAF2FF] flex items-center gap-2"
              >
                <Trophy className="w-3.5 h-3.5 text-[#1554B8]" />
                <span>Full Scorecard</span>
              </button>
              {onDeleteMatch && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-[#D94343] flex items-center gap-2 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Match (मैच हटाएं)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SCHEDULED MATCH ADMIN / MANAGEMENT ACTION BAR */}
      {match.status === 'scheduled' && (
        <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 shadow-xs space-y-2 text-[#172033]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1554B8] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Scheduled Match (शेड्यूल किया गया मैच)</span>
            </span>
            <span className="text-[10px] text-[#718096] font-mono">ID: {match.id.slice(-6)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onEditMatch && (
              <button
                type="button"
                onClick={() => onEditMatch(match)}
                className="py-2 px-3 bg-[#EAF2FF] hover:bg-[#dbe7fd] text-[#1554B8] border border-[#DFE7F2] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>मैच एडिट करें (Edit)</span>
              </button>
            )}
            {onDeleteMatch && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-[#D94343] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>मैच डिलीट करें (Delete)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= TABS ================= */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#EAF2FF] border border-[#DFE7F2] rounded-xl text-xs font-semibold select-none">
        {[
          { id: 'live' as const, label: 'Live' },
          { id: 'scorecard' as const, label: 'Scorecard' },
          { id: 'commentary' as const, label: 'Commentary' },
          { id: 'info' as const, label: 'Match Info' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1554B8] text-white font-bold shadow-xs'
                  : 'text-[#718096] hover:text-[#1554B8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= LIVE TAB ================= */}
      {activeTab === 'live' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* LIVE SCORE HERO */}
          <div className="bg-[#1554B8] border border-[#0B3F91] rounded-2xl p-3.5 space-y-3 relative overflow-hidden shadow-md text-white">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />

            <div className="relative flex items-center justify-between text-xs">
              <span className="bg-[#21864A] text-white font-bold text-[9.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 uppercase tracking-wider shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
              </span>
              <span className="bg-[#0B3F91]/80 border border-white/20 text-white font-mono text-[11px] px-2.5 py-0.5 rounded-md">
                {activeInnings
                  ? `${activeInnings.legalOvers}.${activeInnings.legalBalls} / ${match.oversPerInnings} ov`
                  : `0.0 / ${match.oversPerInnings} ov`}
              </span>
            </div>

            <div className="relative flex items-center justify-between gap-2 pt-1 pb-1">
              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                <TeamBadge teamNameOrKey={match.teamA.name} size="md" />
                <span className="font-sans font-bold text-xs text-white leading-tight truncate">
                  {match.teamA.name}
                </span>
                {match.innings1 && (
                  <span className="text-xs font-mono text-white/80">
                    {match.innings1.totalRuns}/{match.innings1.wickets}
                  </span>
                )}
              </div>

              <div className="text-center shrink-0 px-2">
                <div className="font-sans font-black text-3xl sm:text-4xl text-white tracking-tight leading-none font-mono">
                  {activeInnings ? `${activeInnings.totalRuns}/${activeInnings.wickets}` : '0/0'}
                </div>
                {match.currentInnings === 2 && match.targetRuns && (
                  <div className="text-xs font-semibold text-[#EAF2FF] mt-1.5 font-mono">
                    Target {match.targetRuns}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 min-w-0 flex-1">
                <TeamBadge teamNameOrKey={match.teamB.name} size="md" />
                <span className="font-sans font-bold text-xs text-white text-right leading-tight truncate">
                  {match.teamB.name}
                </span>
                {match.innings2 && (
                  <span className="text-xs font-mono text-white/80">
                    {match.innings2.totalRuns}/{match.innings2.wickets}
                  </span>
                )}
              </div>
            </div>

            <div className="relative flex items-center justify-between text-[11px] text-[#EAF2FF] border-t border-white/20 pt-2 pb-0.5 px-0.5 font-medium">
              <span>RR {currentRunRate}</span>
              {requiredRunRate && (
                <>
                  <span className="text-white/40">|</span>
                  <span>Required {requiredRunRate}</span>
                </>
              )}
              {requiredRuns !== null && remainingBalls !== null && (
                <>
                  <span className="text-white/40">|</span>
                  <span className="text-white font-semibold">
                    {requiredRuns} runs in {remainingBalls} balls
                  </span>
                </>
              )}
            </div>
          </div>

          {/* WIN PROBABILITY CARD */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] text-[#172033] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#1554B8]" />
                <span>Win Probability (जीतने की संभावना)</span>
              </span>
              <span className="text-[10px] text-[#1554B8] font-bold bg-[#EAF2FF] px-2 py-0.5 rounded-full border border-[#DFE7F2]">
                {match.status === 'completed'
                  ? 'Final Result'
                  : match.status === 'live'
                  ? 'Live Match Predictor'
                  : 'Pre-Match 50/50'}
              </span>
            </div>

            {/* TEAM PROBABILITY BREAKDOWN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <div className="flex items-center gap-1.5 text-[#1554B8] truncate max-w-[48%]">
                  <TeamBadge teamNameOrKey={match.teamA.name} size="sm" />
                  <span className="truncate">{match.teamA.name}</span>
                  <span className="text-sm font-black">{winProb.teamAWinProb}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#21864A] truncate max-w-[48%] justify-end">
                  <span className="text-sm font-black">{winProb.teamBWinProb}%</span>
                  <span className="truncate">{match.teamB.name}</span>
                  <TeamBadge teamNameOrKey={match.teamB.name} size="sm" />
                </div>
              </div>

              {/* DYNAMIC DUAL BAR */}
              <div className="h-3 w-full bg-[#EAF2FF] rounded-full overflow-hidden flex border border-[#DFE7F2] p-0.5 relative">
                <div
                  className="h-full bg-[#1554B8] rounded-l-full transition-all duration-500 ease-out flex items-center justify-end pr-1 text-[8px] text-white font-bold font-mono overflow-hidden"
                  style={{ width: `${winProb.teamAWinProb}%` }}
                />
                <div
                  className="h-full bg-[#21864A] rounded-r-full transition-all duration-500 ease-out flex items-center justify-start pl-1 text-[8px] text-white font-bold font-mono overflow-hidden"
                  style={{ width: `${winProb.teamBWinProb}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10.5px] text-[#718096] pt-0.5">
                <span>
                  {match.status === 'live' && winProb.battingTeamId
                    ? `Batting: ${
                        winProb.battingTeamId === match.teamA.id
                          ? match.teamA.name
                          : match.teamB.name
                      }`
                    : match.status === 'completed'
                    ? winProb.summaryText || 'Match Finished'
                    : 'Balanced odds before toss'}
                </span>
                <span>
                  {match.currentInnings === 2 && match.targetRuns
                    ? `Target: ${match.targetRuns}`
                    : match.currentInnings === 1
                    ? `1st Innings in progress`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* MAN OF THE MATCH CARD (for completed matches or when nominated) */}
          {(match.status === 'completed' || potmPlayer) && (
            <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] text-[#172033] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#172033] flex items-center gap-1.5">
                  <Award className="w-4.5 h-4.5 text-[#1554B8]" />
                  <span>Man of the Match (मैन ऑफ द मैच)</span>
                </span>
                {canNominateMotm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMotmPlayerId(potmPlayerId || '');
                      setShowMotmModal(true);
                    }}
                    className="px-2.5 py-1 bg-[#EAF2FF] hover:bg-[#dbe7fd] border border-[#DFE7F2] text-[#1554B8] rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{potmPlayer ? 'Edit Nomination (बदलाव)' : 'Nominate (मनोनीत करें)'}</span>
                  </button>
                )}
              </div>

              {potmPlayer ? (
                <div className="bg-[#EAF2FF] border border-[#DFE7F2] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1554B8] text-white flex items-center justify-center font-black text-sm shrink-0 border-2 border-white shadow-xs overflow-hidden">
                    {potmPlayer.photoUrl ? (
                      <img
                        src={potmPlayer.photoUrl}
                        alt={potmPlayer.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{potmPlayer.fullName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-[#172033] truncate leading-tight">
                        {potmPlayer.fullName}
                      </h4>
                      <span className="bg-[#1554B8] text-white font-black text-[9px] px-1.5 py-0.2 rounded-md uppercase shrink-0">
                        POTM
                      </span>
                    </div>
                    <p className="text-[11px] text-[#718096] font-medium truncate">
                      {match.teamA.playerIds.includes(potmPlayer.id) ? match.teamA.name : match.teamB.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono font-bold text-[#1554B8]">
                      {potmTotalRuns > 0 && (
                        <span>🏏 {potmTotalRuns} Runs ({potmTotalBalls}b)</span>
                      )}
                      {potmTotalWickets > 0 && (
                        <span>🎯 {potmTotalWickets}/{potmTotalRunsConceded} ({potmTotalOvers}ov)</span>
                      )}
                      {potmTotalRuns === 0 && potmTotalWickets === 0 && (
                        <span>⭐ Match MVP</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl space-y-2">
                  <p className="text-xs text-[#718096] font-medium">
                    No Man of the Match nominated yet for this completed match.
                  </p>
                  {canNominateMotm ? (
                    <button
                      type="button"
                      onClick={() => setShowMotmModal(true)}
                      className="py-1.5 px-3.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Nominate Man of the Match (मैन ऑफ द मैच मनोनीत करें)</span>
                    </button>
                  ) : (
                    <p className="text-[10.5px] text-[#718096]">Admins or scorers will nominate the match awardee.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CURRENT BATTERS & BOWLERS */}
          {(striker || nonStriker || bowler) ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5">
              {/* BATTING */}
              <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] text-[#172033] space-y-2">
                <span className="text-[10.5px] font-bold text-[#718096] uppercase tracking-wider block">
                  Current Batters
                </span>
                <div className="space-y-2">
                  {striker && (
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-[#172033] truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#21864A]" />
                        {striker.fullName} *
                      </span>
                      <span className="font-mono font-bold text-xs text-[#1554B8]">
                        {strikerStat ? `${strikerStat.runs} (${strikerStat.balls})` : '0 (0)'}
                      </span>
                    </div>
                  )}
                  {nonStriker && (
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-[#172033] truncate">
                        {nonStriker.fullName}
                      </span>
                      <span className="font-mono font-bold text-xs text-[#718096]">
                        {nonStrikerStat ? `${nonStrikerStat.runs} (${nonStrikerStat.balls})` : '0 (0)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BOWLING */}
              <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] text-[#172033] space-y-2 flex flex-col justify-between">
                <span className="text-[10.5px] font-bold text-[#718096] uppercase tracking-wider block">
                  Current Bowler
                </span>
                {bowler ? (
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-[#172033] truncate">{bowler.fullName}</div>
                    <div className="text-[11px] font-mono text-[#1554B8] font-bold">
                      {bowlerStat
                        ? `${bowlerStat.overs}.${bowlerStat.balls} - ${bowlerStat.runsConceded} - ${bowlerStat.wickets}`
                        : '0.0 - 0 - 0'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#718096]">No bowler selected</div>
                )}
              </div>
            </div>
          ) : null}

          {/* ACTION BUTTONS: Scorecard & Share Match */}
          <div className="pt-1 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (onOpenScorecardModal) onOpenScorecardModal(match);
                else setActiveTab('scorecard');
              }}
              className="py-2.5 px-3 bg-[#1554B8] hover:bg-[#0B3F91] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
            >
              <Trophy className="w-4 h-4 stroke-[2.2]" />
              <span>Full Scorecard</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 px-3 bg-[#EAF2FF] hover:bg-[#dbe7fd] border border-[#DFE7F2] text-[#1554B8] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
              <span>Share Match</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="py-2.5 px-3 bg-[#EAF2FF] hover:bg-[#dbe7fd] border border-[#DFE7F2] text-[#1554B8] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
            >
              <Copy className="w-4 h-4 stroke-[2.2]" />
              <span>Copy Summary</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SCORECARD TAB ================= */}
      {activeTab === 'scorecard' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Innings 1 Card */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-2">
              <span className="font-bold text-xs text-[#172033]">
                1st Innings: {match.innings1?.teamName || match.teamA.name}
              </span>
              <span className="font-mono font-bold text-sm text-[#1554B8]">
                {match.innings1 ? `${match.innings1.totalRuns}/${match.innings1.wickets}` : 'Not Started'}
              </span>
            </div>
            {match.innings1?.batters && Object.values(match.innings1.batters).length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {Object.values(match.innings1.batters).map((b) => (
                  <div key={b.playerId} className="flex justify-between text-[#172033] py-0.5">
                    <span className="truncate">{b.playerName}</span>
                    <span className="font-mono font-bold">{b.runs} ({b.balls})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#718096] py-1">No batting data recorded yet</div>
            )}
          </div>

          {/* Innings 2 Card */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-2">
              <span className="font-bold text-xs text-[#172033]">
                2nd Innings: {match.innings2?.teamName || match.teamB.name}
              </span>
              <span className="font-mono font-bold text-sm text-[#1554B8]">
                {match.innings2 ? `${match.innings2.totalRuns}/${match.innings2.wickets}` : 'Not Started'}
              </span>
            </div>
            {match.innings2?.batters && Object.values(match.innings2.batters).length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {Object.values(match.innings2.batters).map((b) => (
                  <div key={b.playerId} className="flex justify-between text-[#172033] py-0.5">
                    <span className="truncate">{b.playerName}</span>
                    <span className="font-mono font-bold">{b.runs} ({b.balls})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#718096] py-1">No batting data recorded yet</div>
            )}
          </div>
        </div>
      )}

      {/* ================= COMMENTARY TAB ================= */}
      {activeTab === 'commentary' && (
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#DFE7F2] space-y-3 animate-in fade-in duration-150">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#718096]">
            Ball-by-Ball Timeline
          </h3>
          <p className="text-xs text-[#718096]">
            Real deliveries recorded via the Live Scoring Pad will stream dynamically in sequence.
          </p>
        </div>
      )}

      {/* ================= MATCH INFO TAB ================= */}
      {activeTab === 'info' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Match Details */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] space-y-2 text-xs">
            <h3 className="font-bold text-sm text-[#172033] mb-1">Match Details</h3>
            <div className="space-y-1.5 text-[#172033]">
              <div className="flex justify-between border-b border-[#DFE7F2] pb-1">
                <span className="text-[#718096]">Venue</span>
                <span className="font-semibold text-[#172033]">{match.venue}</span>
              </div>
              <div className="flex justify-between border-b border-[#DFE7F2] pb-1">
                <span className="text-[#718096]">Date & Time</span>
                <span className="font-semibold text-[#172033]">
                  {new Date(match.dateTime).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#DFE7F2] pb-1">
                <span className="text-[#718096]">Players per Team</span>
                <span className="font-semibold text-[#172033]">{match.playersPerTeam} Players</span>
              </div>
              <div className="flex justify-between border-b border-[#DFE7F2] pb-1">
                <span className="text-[#718096]">Overs per Innings</span>
                <span className="font-semibold text-[#172033]">{match.oversPerInnings} Overs</span>
              </div>
              {match.toss && (
                <div className="flex justify-between border-b border-[#DFE7F2] pb-1">
                  <span className="text-[#718096]">Toss</span>
                  <span className="font-semibold text-[#1554B8]">
                    {match.toss.winnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name} elected to {match.toss.decision}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Team Squads */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#DFE7F2] space-y-2.5 text-xs">
            <h3 className="font-bold text-sm text-[#172033]">Team Squads</h3>
            <div className="space-y-3">
              <div>
                <span className="font-bold text-xs text-[#1554B8] block mb-1">{match.teamA.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  {team1Squad.map((p) => (
                    <span key={p.id} className="bg-[#F2F6FC] border border-[#DFE7F2] px-2 py-0.5 rounded-lg text-[#172033] text-[11px]">
                      {p.fullName}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-xs text-[#1554B8] block mb-1">{match.teamB.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  {team2Squad.map((p) => (
                    <span key={p.id} className="bg-[#F2F6FC] border border-[#DFE7F2] px-2 py-0.5 rounded-lg text-[#172033] text-[11px]">
                      {p.fullName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE MATCH CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-red-100 text-[#172033]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D94343] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#172033]">
                Delete Scheduled Match?
              </h3>
              <p className="text-xs text-[#718096]">
                क्या आप वाकई इस शेड्यूल किए गए मैच "{match.title}" को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
              </p>
            </div>

            <div className="bg-[#F2F6FC] border border-[#DFE7F2] rounded-2xl p-3 text-xs space-y-1">
              <div className="font-bold text-[#172033]">{match.title}</div>
              <div className="text-[#1554B8] font-semibold flex items-center justify-between">
                <span>{match.teamA.name}</span>
                <span className="text-[#718096] text-[10px]">VS</span>
                <span>{match.teamB.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-4 bg-[#EAF2FF] hover:bg-[#dbe7fd] text-[#1554B8] font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteMatch) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMatch(match);
                    setShowDeleteConfirm(false);
                    onBack();
                  } catch (e) {
                    console.error('Failed to delete match:', e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="py-2.5 px-4 bg-[#D94343] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                {isDeleting ? 'Deleting...' : 'हटाएं (Delete)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAN OF THE MATCH NOMINATION MODAL */}
      {showMotmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-[#DFE7F2] text-[#172033] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#DFE7F2] pb-3 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#1554B8]" />
                  <h3 className="font-display font-black text-base text-[#172033]">
                    Nominate Man of the Match
                  </h3>
                </div>
                <p className="text-xs text-[#718096]">
                  मैन ऑफ द मैच खिलाड़ी चुनें ({match.title})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMotmModal(false)}
                className="p-1 text-[#718096] hover:text-[#172033] rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search & Team Filter */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#718096] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search player name..."
                  value={motmSearchQuery}
                  onChange={(e) => setMotmSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl text-xs font-semibold text-[#172033] focus:outline-none focus:border-[#1554B8]"
                />
              </div>

              <div className="flex gap-1.5 bg-[#EAF2FF] p-1 rounded-xl text-xs font-bold border border-[#DFE7F2]">
                <button
                  type="button"
                  onClick={() => setMotmTeamFilter('all')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    motmTeamFilter === 'all'
                      ? 'bg-[#1554B8] text-white shadow-xs'
                      : 'text-[#718096] hover:text-[#1554B8]'
                  }`}
                >
                  All Players
                </button>
                <button
                  type="button"
                  onClick={() => setMotmTeamFilter('teamA')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer truncate px-1 ${
                    motmTeamFilter === 'teamA'
                      ? 'bg-[#1554B8] text-white shadow-xs'
                      : 'text-[#718096] hover:text-[#1554B8]'
                  }`}
                >
                  {match.teamA.name}
                </button>
                <button
                  type="button"
                  onClick={() => setMotmTeamFilter('teamB')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer truncate px-1 ${
                    motmTeamFilter === 'teamB'
                      ? 'bg-[#1554B8] text-white shadow-xs'
                      : 'text-[#718096] hover:text-[#1554B8]'
                  }`}
                >
                  {match.teamB.name}
                </button>
              </div>
            </div>

            {/* Players List */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-[220px]">
              {/* TOP RECOMMENDED PERFORMERS SECTION */}
              {motmSearchQuery === '' && motmTeamFilter === 'all' && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#1554B8] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#1554B8]" />
                    <span>Top Performers in Match (सिफारिशी खिलाड़ी)</span>
                  </div>
                  {recommendedPerformers.slice(0, 3).map((perf) => {
                    const isSelected = selectedMotmPlayerId === perf.player.id;
                    return (
                      <div
                        key={`top-${perf.player.id}`}
                        onClick={() => setSelectedMotmPlayerId(perf.player.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#EAF2FF] border-[#1554B8] ring-2 ring-[#1554B8]/30'
                            : 'bg-white border-[#DFE7F2] hover:border-[#1554B8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#1554B8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {perf.player.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#172033] flex items-center gap-1 truncate">
                              <span className="truncate">{perf.player.fullName}</span>
                              <Star className="w-3 h-3 text-[#1554B8] fill-[#1554B8] shrink-0" />
                            </div>
                            <div className="text-[10px] text-[#718096] flex items-center gap-1.5 truncate">
                              <span>{perf.teamName}</span>
                              <span>•</span>
                              <span className="font-mono font-semibold text-[#1554B8]">
                                {perf.statSummary}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#1554B8] border-[#1554B8] text-white' : 'border-[#DFE7F2]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ALL SQUAD PLAYERS LIST */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#718096] uppercase tracking-wider pt-1">
                  All Squad Players
                </div>
                {recommendedPerformers
                  .filter((perf) => {
                    if (motmTeamFilter === 'teamA' && perf.teamId !== match.teamA.id) return false;
                    if (motmTeamFilter === 'teamB' && perf.teamId !== match.teamB.id) return false;
                    if (motmSearchQuery && !perf.player.fullName.toLowerCase().includes(motmSearchQuery.toLowerCase())) return false;
                    return true;
                  })
                  .map((perf) => {
                    const isSelected = selectedMotmPlayerId === perf.player.id;
                    return (
                      <div
                        key={perf.player.id}
                        onClick={() => setSelectedMotmPlayerId(perf.player.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#EAF2FF] border-[#1554B8] ring-2 ring-[#1554B8]/30'
                            : 'bg-white border-[#DFE7F2] hover:border-[#1554B8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#F2F6FC] text-[#172033] border border-[#DFE7F2] flex items-center justify-center font-bold text-xs shrink-0">
                            {perf.player.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#172033] truncate">
                              {perf.player.fullName}
                            </div>
                            <div className="text-[10px] text-[#718096] flex items-center gap-1 truncate">
                              <span>{perf.teamName}</span>
                              <span>•</span>
                              <span className="font-mono text-[#718096]">{perf.statSummary}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#1554B8] border-[#1554B8] text-white' : 'border-[#DFE7F2]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DFE7F2] shrink-0">
              <button
                type="button"
                disabled={isSubmittingMotm}
                onClick={() => setShowMotmModal(false)}
                className="py-2.5 px-4 bg-[#EAF2FF] hover:bg-[#dbe7fd] text-[#1554B8] font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="button"
                disabled={!selectedMotmPlayerId || isSubmittingMotm}
                onClick={() => handleNominateMotmSubmit(selectedMotmPlayerId)}
                className="py-2.5 px-4 bg-[#1554B8] hover:bg-[#0B3F91] disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmittingMotm ? 'Saving...' : 'Confirm Nomination (मनोनीत करें)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
