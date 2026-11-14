import React, { useState, useEffect } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { fetchMatchAvailability } from '../services/availabilityService';
import {
  generateBalancedTeams,
  generateRandomTeams,
  getPlayerRating,
} from '../services/teamBuilderService';
import { updateMatch } from '../services/matchService';
import { X, Shuffle, Scale, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';

interface TeamBuilderModalProps {
  match: CricketMatch;
  players: Player[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TeamBuilderModal: React.FC<TeamBuilderModalProps> = ({
  match,
  players,
  onClose,
  onSuccess,
}) => {
  const [teamSize, setTeamSize] = useState<number>(match.playersPerTeam || 7);
  const [customSizeInput, setCustomSizeInput] = useState<string>('');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [reserves, setReserves] = useState<Player[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBalancedGen, setIsBalancedGen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Map of all players
  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Load available players for this match
  useEffect(() => {
    async function loadAvailability() {
      const availList = await fetchMatchAvailability(match.id);
      const availablePlayerIds = new Set(
        availList
          .filter((a) => a.status === 'available')
          .map((a) => a.playerId)
      );

      // If availability was recorded, filter by available; otherwise fallback to all active players
      const eligible =
        availablePlayerIds.size > 0
          ? players.filter((p) => availablePlayerIds.has(p.id) && p.status === 'active')
          : players.filter((p) => p.status === 'active');

      setAvailablePlayers(eligible);

      // Prepopulate if match already has teams
      if (match.teamA.playerIds.length > 0 && match.teamB.playerIds.length > 0) {
        const currentA = match.teamA.playerIds.map((id) => playersMap[id]).filter(Boolean);
        const currentB = match.teamB.playerIds.map((id) => playersMap[id]).filter(Boolean);
        setTeamA(currentA);
        setTeamB(currentB);
        const assignedIds = new Set([...match.teamA.playerIds, ...match.teamB.playerIds]);
        setReserves(eligible.filter((p) => !assignedIds.has(p.id)));
      } else {
        // Run initial balanced generation
        const result = generateBalancedTeams(eligible, teamSize);
        if (result.error) {
          setErrorMsg(result.error);
        } else {
          setTeamA(result.teamA);
          setTeamB(result.teamB);
          setReserves(result.reserves);
          setIsBalancedGen(true);
        }
      }
    }
    loadAvailability();
  }, [match.id, players]);

  // Handle Team Size change
  const handleSizeChange = (newSize: number) => {
    setTeamSize(newSize);
    setErrorMsg(null);
    const result = generateBalancedTeams(availablePlayers, newSize);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setTeamA(result.teamA);
      setTeamB(result.teamB);
      setReserves(result.reserves);
      setIsBalancedGen(true);
    }
  };

  // Generate Balanced
  const handleGenerateBalanced = () => {
    setErrorMsg(null);
    const result = generateBalancedTeams(availablePlayers, teamSize);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setTeamA(result.teamA);
      setTeamB(result.teamB);
      setReserves(result.reserves);
      setIsBalancedGen(true);
    }
  };

  // Generate Random
  const handleGenerateRandom = () => {
    setErrorMsg(null);
    const result = generateRandomTeams(availablePlayers, teamSize);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setTeamA(result.teamA);
      setTeamB(result.teamB);
      setReserves(result.reserves);
      setIsBalancedGen(false);
    }
  };

  // Swap player from Team A to Team B
  const handleMoveToTeamB = (player: Player) => {
    setTeamA((prev) => prev.filter((p) => p.id !== player.id));
    setTeamB((prev) => [...prev, player]);
  };

  // Swap player from Team B to Team A
  const handleMoveToTeamA = (player: Player) => {
    setTeamB((prev) => prev.filter((p) => p.id !== player.id));
    setTeamA((prev) => [...prev, player]);
  };

  // Move to Reserves
  const handleMoveToReserves = (player: Player, from: 'A' | 'B') => {
    if (from === 'A') setTeamA((prev) => prev.filter((p) => p.id !== player.id));
    if (from === 'B') setTeamB((prev) => prev.filter((p) => p.id !== player.id));
    setReserves((prev) => [...prev, player]);
  };

  // Add from Reserves
  const handleAddFromReserves = (player: Player, targetTeam: 'A' | 'B') => {
    setReserves((prev) => prev.filter((p) => p.id !== player.id));
    if (targetTeam === 'A') setTeamA((prev) => [...prev, player]);
    else setTeamB((prev) => [...prev, player]);
  };

  // Clear both squads completely
  const handleClearSquads = () => {
    const all = [...teamA, ...teamB, ...reserves];
    setTeamA([]);
    setTeamB([]);
    setReserves(all);
    setErrorMsg('Squads cleared. You can manually assign players or click Save.');
  };

  // Save confirmed teams to match
  const handleConfirmTeams = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    setIsSaving(true);
    try {
      await updateMatch(match.id, {
        playersPerTeam: teamSize,
        rules: {
          ...match.rules,
          // Ensure max wickets adapts to team size (playersPerTeam - 1)
          maxWickets: teamSize - 1,
        },
        teamA: {
          ...match.teamA,
          playerIds: teamA.map((p) => p.id),
        },
        teamB: {
          ...match.teamB,
          playerIds: teamB.map((p) => p.id),
        },
        reservePlayerIds: reserves.map((p) => p.id),
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error confirming teams:', err);
      setErrorMsg('Failed to save teams.');
    } finally {
      setIsSaving(false);
    }
  };

  // Team balance scores
  const scoreA = teamA.reduce((sum, p) => sum + getPlayerRating(p), 0);
  const scoreB = teamB.reduce((sum, p) => sum + getPlayerRating(p), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#063D2E] border border-emerald-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#002B1B] p-4 border-b border-emerald-900/60 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Team Builder & Balance Generator
            </h2>
            <div className="text-xs text-emerald-200/80 font-mono">
              {match.title} · {availablePlayers.length} Eligible Available Players
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white bg-emerald-950 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-[#002B1B]/70 border-b border-emerald-900/40 space-y-3">
          {/* Team Size Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
              <span className="text-slate-300 font-medium mr-1">Players/Team:</span>
              {[5, 7, 8, 9, 10, 11].map((size) => (
                <button
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                    teamSize === size
                      ? 'bg-[#7CFC00] text-[#002B1B]'
                      : 'bg-emerald-950 text-slate-300 hover:text-white border border-emerald-900'
                  }`}
                >
                  {size}v{size}
                </button>
              ))}
              {/* Custom Size */}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  placeholder="Custom"
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(customSizeInput, 10);
                    if (parsed >= 3 && parsed <= 25) {
                      handleSizeChange(parsed);
                    }
                  }}
                  className="w-16 bg-[#002B1B] text-white border border-emerald-800 rounded-lg px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Generator Mode Buttons */}
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <button
                onClick={handleGenerateBalanced}
                className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 bg-[#16A34A] hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer touch-press min-h-[40px] sm:min-h-0"
              >
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Balanced Generator</span>
              </button>
              <button
                onClick={handleGenerateRandom}
                className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 bg-emerald-950 hover:bg-emerald-900 text-slate-200 border border-emerald-800 font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer touch-press min-h-[40px] sm:min-h-0"
              >
                <Shuffle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Random Shuffle</span>
              </button>
            </div>
          </div>

          {/* Validation Notice or Generation Indicator */}
          {errorMsg ? (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono">
              <span className="truncate">
                Mode: <strong className="text-white">{isBalancedGen ? 'Stat-Weighted Balanced' : 'Random Selection'}</strong>
              </span>
              <span className="text-[11px] sm:text-xs">
                Rating Balance: Team A (<strong>{scoreA}</strong>) vs Team B (<strong>{scoreB}</strong>)
              </span>
            </div>
          )}
        </div>

        {/* Main Team Display: Team A & Team B split */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
          {/* TEAM A */}
          <div className="bg-[#002B1B] rounded-2xl border border-emerald-900/60 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7CFC00]" />
                <h3 className="font-bold text-sm text-white">
                  {match.teamA.name} ({teamA.length}/{teamSize})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-300">
                Score: {scoreA}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 max-h-64 overflow-y-auto pr-1">
              {teamA.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-[#063D2E] p-2 rounded-xl border border-emerald-900/40 flex items-center justify-between text-xs hover:border-emerald-700/50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-400 text-[10px] w-4">
                      {idx + 1}.
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">
                        {p.fullName}
                      </div>
                      <div className="text-[10px] text-emerald-200/80 capitalize">
                        {p.playingRole.replace(/_/g, ' ')} · Rat: {getPlayerRating(p)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveToTeamB(p)}
                      title="Move to Team B"
                      className="p-1 text-slate-300 hover:text-white bg-[#002B1B] rounded-lg cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveToReserves(p, 'A')}
                      title="Bench to Reserves"
                      className="p-1 text-red-400 hover:text-red-300 bg-[#002B1B] rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM B */}
          <div className="bg-[#002B1B] rounded-2xl border border-emerald-900/60 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {match.teamB.name} ({teamB.length}/{teamSize})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-300">
                Score: {scoreB}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 max-h-64 overflow-y-auto pr-1">
              {teamB.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-[#063D2E] p-2 rounded-xl border border-emerald-900/40 flex items-center justify-between text-xs hover:border-emerald-700/50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-400 text-[10px] w-4">
                      {idx + 1}.
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">
                        {p.fullName}
                      </div>
                      <div className="text-[10px] text-emerald-200/80 capitalize">
                        {p.playingRole.replace(/_/g, ' ')} · Rat: {getPlayerRating(p)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveToTeamA(p)}
                      title="Move to Team A"
                      className="p-1 text-slate-300 hover:text-white bg-[#002B1B] rounded-lg cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveToReserves(p, 'B')}
                      title="Bench to Reserves"
                      className="p-1 text-red-400 hover:text-red-300 bg-[#002B1B] rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESERVES SECTION */}
        {reserves.length > 0 && (
          <div className="px-4 py-2.5 bg-[#002B1B]/80 border-t border-emerald-950 text-xs">
            <div className="font-semibold text-emerald-300 mb-1.5">
              Available Reserves ({reserves.length}):
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {reserves.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#063D2E] px-2.5 py-1 rounded-lg border border-emerald-900 text-slate-200 flex items-center gap-2"
                >
                  <span>{p.fullName}</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      onClick={() => handleAddFromReserves(p, 'A')}
                      className="hover:text-[#7CFC00]"
                      title="Add to Team A"
                    >
                      +A
                    </button>
                    <button
                      onClick={() => handleAddFromReserves(p, 'B')}
                      className="hover:text-emerald-400"
                      title="Add to Team B"
                    >
                      +B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="p-3.5 sm:p-4 bg-[#002B1B] border-t border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleClearSquads}
            className="px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>Clear Squad (स्क्वाड साफ़ करें)</span>
          </button>

          <div className="flex flex-col-reverse sm:flex-row items-center gap-2">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              onClick={handleConfirmTeams}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#7CFC00] hover:bg-lime-400 text-[#002B1B] font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer touch-press shadow-sm"
            >
              <Check className="w-4 h-4" />
              Save Squad Data (स्क्वाड सेव करें)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
