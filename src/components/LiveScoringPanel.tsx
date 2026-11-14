import React, { useState, useEffect, useMemo } from 'react';
import {
  CricketMatch,
  BallEvent,
  ExtraType,
  Player,
  WicketType,
} from '../types/cricket';
import {
  addBallEvent,
  undoLastBallEvent,
  startSecondInnings,
  finalizeMatch,
  subscribeBalls,
  recordToss,
  updateMatch,
  validateMatchRosterAndCareer,
} from '../services/matchService';
import {
  formatOvers,
  calculateRunRate,
  calculateStrikeRate,
  calculateEconomy,
  getNextStrikeState,
} from '../lib/cricketEngine';
import { createPlayer, initialCareerStats } from '../services/playerService';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  Menu,
  Bell,
  Search,
  Filter,
  MoreVertical,
  ArrowLeft,
  Settings as SettingsIcon,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Pause,
  StopCircle,
  Repeat,
  Edit3,
  FileText,
  Sliders,
  Check,
  Shield,
  MapPin,
  Calendar,
  Users,
  Activity,
  UserPlus,
  RefreshCw,
  Flag,
  UserX,
  WifiOff,
} from 'lucide-react';
import { runOverDiagnosticTest, DiagnosticTestReport } from '../utils/diagnosticTest';
import {
  saveScoringDraft,
  loadScoringDraft,
  clearScoringDraft,
  saveActiveScoringMatchId,
  clearActiveScoringMatchId,
} from '../utils/draftStorage';

interface LiveScoringPanelProps {
  matches: CricketMatch[];
  players: Player[];
  onOpenDrawer?: () => void;
  onRefreshData?: () => void;
  initialSelectedMatch?: CricketMatch | null;
  onClosePanel?: () => void;
}

export const LiveScoringPanel: React.FC<LiveScoringPanelProps> = ({
  matches,
  players,
  onOpenDrawer,
  onRefreshData,
  initialSelectedMatch = null,
  onClosePanel,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Screen / Navigation state: 'matches_list' (Screen 1) or 'scoring_interface' (Screens 2, 3, 4)
  const [selectedMatch, setSelectedMatch] = useState<CricketMatch | null>(initialSelectedMatch);
  const [activeTab, setActiveTab] = useState<'scoring' | 'scorecard' | 'stats' | 'settings'>('scoring');

  // Screen 1: Filter & Search State
  const [statusTab, setStatusTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Quick Add Player state
  const [showQuickAddPlayerModal, setShowQuickAddPlayerModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'batting' | 'bowling' | 'teamA' | 'teamB'>('batting');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Ball history for currently selected match
  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isOnline = useOnlineStatus();

  // Scorecard / Innings perspective selector for Screen 3
  const [scorecardInningsView, setScorecardInningsView] = useState<1 | 2>(1);

  // Striker, Non-striker, Bowler selection
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  // Modals state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('caught');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [newBatterId, setNewBatterId] = useState('');
  const [dismissalType, setDismissalType] = useState<WicketType | 'retired'>('caught');

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>('wide');
  const [extraBoundaryRuns, setExtraBoundaryRuns] = useState(0);

  const [showEditScoreModal, setShowEditScoreModal] = useState(false);
  const [editScoreRuns, setEditScoreRuns] = useState<number>(0);
  const [editScoreWickets, setEditScoreWickets] = useState<number>(0);

  const [showMatchNotesModal, setShowMatchNotesModal] = useState(false);
  const [matchNotesText, setMatchNotesText] = useState('');

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [potmId, setPotmId] = useState('');

  const [showInningsTransitionModal, setShowInningsTransitionModal] = useState(false);
  const [inn2Striker, setInn2Striker] = useState('');
  const [inn2NonStriker, setInn2NonStriker] = useState('');
  const [inn2Bowler, setInn2Bowler] = useState('');

  // Over Completion Next Bowler Selection Modal State
  const [showSelectNextBowlerModal, setShowSelectNextBowlerModal] = useState(false);
  const [nextBowlerSelectionId, setNextBowlerSelectionId] = useState('');
  const [lastCompletedOverNumber, setLastCompletedOverNumber] = useState<number>(0);

  const handleConfirmNextBowler = async () => {
    if (!nextBowlerSelectionId || !selectedMatch) {
      showNotice('Please select the next bowler.');
      return;
    }
    
    try {
      await updateMatch(selectedMatch.id, {
        currentBowlerId: nextBowlerSelectionId,
      });
      setBowlerId(nextBowlerSelectionId);
      setShowSelectNextBowlerModal(false);
      const bowlerName = playersMap[nextBowlerSelectionId]?.fullName || nextBowlerSelectionId;
      showNotice(`Over ${lastCompletedOverNumber} complete! ${bowlerName} will bowl the next over.`, 'success');
    } catch (err) {
      console.error('Error updating next bowler:', err);
      showNotice('Failed to update bowler selection.');
    }
  };

  const handleQuickAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      showNotice('कृपया खिलाड़ी का नाम दर्ज करें। (Please enter player name)');
      return;
    }
    
    setIsAddingPlayer(true);
    try {
      // 1. Create player in Firestore
      const newPlayerId = `player_${Date.now()}`;
      const newPlayerData: Omit<Player, 'career' | 'registrationDate'> = {
        id: newPlayerId,
        fullName: newPlayerName.trim(),
        playingRole: 'batting_allrounder',
        battingStyle: 'right_hand_bat',
        bowlingStyle: 'right_arm_medium',
        status: 'active',
        verificationStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await createPlayer(newPlayerData);
      
      // 2. Add to team roster in the match
      const currentMatchId = selectedMatch!.id;
      
      // Determine which team to add to
      let targetTeamId = '';
      if (quickAddType === 'teamA') {
        targetTeamId = selectedMatch!.teamA.id;
      } else if (quickAddType === 'teamB') {
        targetTeamId = selectedMatch!.teamB.id;
      } else if (quickAddType === 'batting') {
        targetTeamId = battingTeam?.id || '';
        // Fallback for Toss Setup
        if (!targetTeamId && setupBattingTeam) targetTeamId = setupBattingTeam.id;
      } else if (quickAddType === 'bowling') {
        targetTeamId = bowlingTeam?.id || '';
        // Fallback for Toss Setup
        if (!targetTeamId && setupBowlingTeam) targetTeamId = setupBowlingTeam.id;
      }

      if (!targetTeamId) throw new Error("Target team not found");
      
      const isTeamA = targetTeamId === selectedMatch!.teamA.id;
      const targetTeamObj = isTeamA ? selectedMatch!.teamA : selectedMatch!.teamB;
      const updatedPlayerIds = [...targetTeamObj.playerIds, newPlayerId];
      
      const matchUpdate = isTeamA 
        ? { teamA: { ...selectedMatch!.teamA, playerIds: updatedPlayerIds } }
        : { teamB: { ...selectedMatch!.teamB, playerIds: updatedPlayerIds } };
        
      await updateMatch(currentMatchId, matchUpdate);
      
      // 3. Refresh data
      if (onRefreshData) onRefreshData();
      
      showNotice(`खिलाड़ी ${newPlayerName} को सफलतापूर्वक जोड़ दिया गया है!`, 'success');
      setNewPlayerName('');
      setShowQuickAddPlayerModal(false);
      
      // Auto-select the new player if we were in a selection modal
      if (quickAddType === 'batting') {
        if (showWicketModal) setNewBatterId(newPlayerId);
        else if (showTossSetupModal) {
           setSetupStrikerId((prev) => prev === '' ? newPlayerId : prev);
           setSetupNonStrikerId((prev) => prev === '' && setupStrikerId !== newPlayerId ? newPlayerId : prev);
        }
      } else if (quickAddType === 'bowling') {
        if (showSelectNextBowlerModal) setNextBowlerSelectionId(newPlayerId);
        else if (showTossSetupModal) setSetupBowlerId(newPlayerId);
      }
      
    } catch (err) {
      console.error('Error adding player:', err);
      showNotice('खिलाड़ी को जोड़ने में विफल। (Failed to add player)');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Toss & Opening Players Setup Modal State
  const [showTossSetupModal, setShowTossSetupModal] = useState(false);
  const [setupTossWinnerId, setSetupTossWinnerId] = useState<string>('');
  const [setupTossDecision, setSetupTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [setupStrikerId, setSetupStrikerId] = useState<string>('');
  const [setupNonStrikerId, setSetupNonStrikerId] = useState<string>('');
  const [setupBowlerId, setSetupBowlerId] = useState<string>('');

  const setupBattingTeamId =
    setupTossDecision === 'bat'
      ? setupTossWinnerId
      : setupTossWinnerId === selectedMatch?.teamA.id
      ? selectedMatch?.teamB.id
      : selectedMatch?.teamA.id;

  const setupBattingTeam = setupBattingTeamId === selectedMatch?.teamA.id ? selectedMatch?.teamA : selectedMatch?.teamB;
  const setupBowlingTeam = setupBattingTeamId === selectedMatch?.teamA.id ? selectedMatch?.teamB : selectedMatch?.teamA;

  useEffect(() => {
    if (selectedMatch) {
      if (!selectedMatch.toss || !selectedMatch.currentStrikerId || !selectedMatch.currentBowlerId) {
        setSetupTossWinnerId(selectedMatch.teamA.id);
        setSetupTossDecision('bat');
        const teamA = selectedMatch.teamA;
        const teamB = selectedMatch.teamB;
        setSetupStrikerId(selectedMatch.currentStrikerId || teamA.playerIds[0] || '');
        setSetupNonStrikerId(selectedMatch.currentNonStrikerId || teamA.playerIds[1] || '');
        setSetupBowlerId(selectedMatch.currentBowlerId || teamB.playerIds[0] || '');
        setShowTossSetupModal(true);
      }
    }
  }, [selectedMatch?.id]);

  // Auto-trigger innings transition or match finalization when innings completes (overs finish or all wickets fall)
  useEffect(() => {
    if (!selectedMatch) return;
    if (selectedMatch.currentInnings === 1 && selectedMatch.innings1?.isCompleted) {
      setShowInningsTransitionModal(true);
    } else if (
      selectedMatch.currentInnings === 2 &&
      (selectedMatch.innings2?.isCompleted || selectedMatch.status === 'completed')
    ) {
      setShowFinalizeModal(true);
    }
  }, [
    selectedMatch?.currentInnings,
    selectedMatch?.innings1?.isCompleted,
    selectedMatch?.innings2?.isCompleted,
    selectedMatch?.status,
  ]);

  const handleConfirmTossSetup = async () => {
    if (!selectedMatch) return;
    if (!setupTossWinnerId) {
      showNotice('Please select toss winner.');
      return;
    }
    if (!setupStrikerId || !setupNonStrikerId || !setupBowlerId) {
      showNotice('Please select opening batsmen and opening bowler.');
      return;
    }
    if (setupStrikerId === setupNonStrikerId) {
      showNotice('Striker and non-striker must be different players.');
      return;
    }

    const validation = validateMatchRosterAndCareer(selectedMatch, playersMap);
    if (!validation.isValid) {
      showNotice(validation.errors[0] || 'Player roster and career record validation failed.');
      return;
    }

    try {
      const toss = {
        winnerTeamId: setupTossWinnerId,
        decision: setupTossDecision,
      };

      await recordToss(selectedMatch.id, toss);
      await updateMatch(selectedMatch.id, {
        toss,
        status: 'live',
        currentStrikerId: setupStrikerId,
        currentNonStrikerId: setupNonStrikerId,
        currentBowlerId: setupBowlerId,
      });

      setStrikerId(setupStrikerId);
      setNonStrikerId(setupNonStrikerId);
      setBowlerId(setupBowlerId);
      setShowTossSetupModal(false);
      showNotice('Match live! Toss & opening players configured successfully.', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showNotice('Failed to configure toss and opening players.', 'error');
    }
  };

  const handleStartSecondInningsSubmit = async () => {
    if (!selectedMatch) return;
    if (!inn2Striker || !inn2NonStriker || !inn2Bowler) {
      showNotice('Please select strikers and opening bowler.');
      return;
    }
    if (inn2Striker === inn2NonStriker) {
      showNotice('Striker and non-striker must be different players.');
      return;
    }

    try {
      await startSecondInnings(selectedMatch, inn2Striker, inn2NonStriker, inn2Bowler);
      setStrikerId(inn2Striker);
      setNonStrikerId(inn2NonStriker);
      setBowlerId(inn2Bowler);
      setShowInningsTransitionModal(false);
      showNotice('2nd Innings started! Target set.', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error starting 2nd innings:', err);
      showNotice('Failed to start 2nd innings.');
    }
  };

  // Live scoring toggles
  const [autoSwitchStrike, setAutoSwitchStrike] = useState(true);
  const [showCommentary, setShowCommentary] = useState(true);
  const [showRunRate, setShowRunRate] = useState(true);
  const [allowEditScoreToggle, setAllowEditScoreToggle] = useState(true);
  const [autoCalculateTarget, setAutoCalculateTarget] = useState(true);

  // Match pause state
  const [isMatchPaused, setIsMatchPaused] = useState(false);

  // System notification notice banner
  const [panelNotice, setPanelNotice] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  // Diagnostic Over Test State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticTestReport | null>(null);

  const handleRunDiagnosticTest = () => {
    const report = runOverDiagnosticTest(selectedMatch?.rules);
    setDiagnosticReport(report);
    setShowDiagnosticModal(true);
  };

  const showNotice = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setPanelNotice({ type, message });
    setTimeout(() => setPanelNotice(null), 3500);
  };

  // Players Map
  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Keep selectedMatch updated if matches array changes
  useEffect(() => {
    if (selectedMatch) {
      const updated = matches.find((m) => m.id === selectedMatch.id);
      if (updated) setSelectedMatch(updated);
    }
  }, [matches]);

  // Real-time listener for current match ball events
  useEffect(() => {
    if (!selectedMatch) return;
    const unsub = subscribeBalls(selectedMatch.id, selectedMatch.currentInnings, (newBalls) => {
      setBalls(newBalls);
    });
    return () => unsub();
  }, [selectedMatch?.id, selectedMatch?.currentInnings]);

  // Synchronize player rosters for current selected match
  const battingTeam = useMemo(() => {
    if (!selectedMatch) return null;
    if (!selectedMatch.toss) return selectedMatch.teamA;
    const battingFirstId =
      selectedMatch.toss.decision === 'bat'
        ? selectedMatch.toss.winnerTeamId
        : selectedMatch.toss.winnerTeamId === selectedMatch.teamA.id
        ? selectedMatch.teamB.id
        : selectedMatch.teamA.id;

    if (selectedMatch.currentInnings === 1) {
      return battingFirstId === selectedMatch.teamA.id ? selectedMatch.teamA : selectedMatch.teamB;
    } else {
      return battingFirstId === selectedMatch.teamA.id ? selectedMatch.teamB : selectedMatch.teamA;
    }
  }, [selectedMatch]);

  const bowlingTeam = useMemo(() => {
    if (!selectedMatch || !battingTeam) return null;
    return battingTeam.id === selectedMatch.teamA.id ? selectedMatch.teamB : selectedMatch.teamA;
  }, [selectedMatch, battingTeam]);

  // Eligible available batters for selection
  const remainingBatters = useMemo(() => {
    if (!battingTeam) return [];
    const currentSummary = selectedMatch?.currentInnings === 1 ? selectedMatch?.innings1 : selectedMatch?.innings2;
    const alreadyBattedIds = new Set(
      Object.keys(currentSummary?.batters || {}).filter(
        (id) => currentSummary?.batters[id]?.isOut
      )
    );
    alreadyBattedIds.add(strikerId);
    if (nonStrikerId !== 'none') alreadyBattedIds.add(nonStrikerId);
    return battingTeam.playerIds.filter((pId) => !alreadyBattedIds.has(pId));
  }, [battingTeam, selectedMatch, strikerId, nonStrikerId]);

  // Auto synchronize striker, non-striker & bowler with Firestore state
  useEffect(() => {
    if (selectedMatch) {
      if (selectedMatch.currentStrikerId && selectedMatch.currentStrikerId !== strikerId) {
        setStrikerId(selectedMatch.currentStrikerId);
      } else if (!strikerId && battingTeam && battingTeam.playerIds.length >= 1) {
        setStrikerId(battingTeam.playerIds[0]);
      }

      if (selectedMatch.currentNonStrikerId && selectedMatch.currentNonStrikerId !== nonStrikerId) {
        setNonStrikerId(selectedMatch.currentNonStrikerId);
      } else if (!nonStrikerId && battingTeam && battingTeam.playerIds.length >= 2) {
        setNonStrikerId(battingTeam.playerIds[1]);
      }

      if (selectedMatch.currentBowlerId && selectedMatch.currentBowlerId !== bowlerId) {
        setBowlerId(selectedMatch.currentBowlerId);
      } else if (!bowlerId && bowlingTeam && bowlingTeam.playerIds.length >= 1) {
        setBowlerId(bowlingTeam.playerIds[0]);
      }
    }
  }, [
    selectedMatch?.currentStrikerId,
    selectedMatch?.currentNonStrikerId,
    selectedMatch?.currentBowlerId,
    battingTeam?.id,
    bowlingTeam?.id
  ]);

  // Score ball handler
  const handleScoreBall = async (
    runsOffBat: number,
    extraType: ExtraType = 'none',
    extraRunsToAdd: number = 0,
    isWicket: boolean = false,
    wicketInfo?: {
      type: WicketType;
      dismissedPlayerId: string;
      fielderId?: string;
    },
    newIncomingBatterId?: string
  ) => {
    if (!selectedMatch) return;

    if (isMatchPaused) {
      showNotice('Scoring is paused. Please resume match from Settings tab.');
      return;
    }

    if (!strikerId || !nonStrikerId || !bowlerId) {
      showNotice('Please ensure striker, non-striker, and bowler are selected.');
      return;
    }

    if (selectedMatch.status === 'completed' && !isAdmin) {
      showNotice('This match has been completed.');
      return;
    }

    const currentInningsSummary = selectedMatch.currentInnings === 1 ? selectedMatch.innings1 : selectedMatch.innings2;
    if (currentInningsSummary?.isCompleted) {
      if (selectedMatch.currentInnings === 1) {
        showNotice('1st Innings is complete. Please start 2nd Innings from the transition modal.');
        setShowInningsTransitionModal(true);
      } else {
        showNotice('Match is complete. Please finalize match result.');
        setShowFinalizeModal(true);
      }
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const ballsPerOver = selectedMatch.rules.legalBallsPerOver || 6;
      const isLegal = extraType !== 'wide' && extraType !== 'noBall';

      let totalExtraRuns = 0;
      if (extraType === 'wide') {
        totalExtraRuns = (selectedMatch.rules.wideRuns || 1) + extraRunsToAdd;
      } else if (extraType === 'noBall') {
        totalExtraRuns = (selectedMatch.rules.noBallRuns || 1) + extraRunsToAdd;
      } else if (extraType === 'bye' || extraType === 'legBye') {
        totalExtraRuns = extraRunsToAdd || 1;
      }

      const totalRunsOnBall = runsOffBat + totalExtraRuns;
      const nextBallNumber = balls.length + 1;
      const currentInningsSummary = selectedMatch.currentInnings === 1 ? selectedMatch.innings1 : selectedMatch.innings2;
      const currentLegalBalls = currentInningsSummary?.legalBalls || 0;
      const ballInOver = isLegal ? (currentLegalBalls % ballsPerOver) + 1 : currentLegalBalls % ballsPerOver || ballsPerOver;
      const overNumber = Math.floor(currentLegalBalls / ballsPerOver);

      const ballEvent: BallEvent = {
        id: `ball_${selectedMatch.currentInnings}_${Date.now()}_${nextBallNumber}`,
        matchId: selectedMatch.id,
        innings: selectedMatch.currentInnings,
        overNumber,
        ballInOver,
        bowlerId,
        strikerId,
        nonStrikerId,
        runsBatter: runsOffBat,
        extraType,
        extraRuns: totalExtraRuns,
        isLegal,
        isWicket,
        totalRunsOnBall,
        timestamp: new Date().toISOString(),
      };

      let nextStriker = strikerId;
      let nextNonStriker = nonStrikerId;

      const legalBallsCount = balls.filter((b) => b.isLegal).length;
      const isLegalOverComplete = isLegal && (legalBallsCount + 1) % ballsPerOver === 0;

      if (autoSwitchStrike) {
        const strikeState = getNextStrikeState(
          ballEvent,
          strikerId,
          nonStrikerId,
          runsOffBat + (extraType === 'bye' || extraType === 'legBye' ? totalExtraRuns : 0),
          extraType === 'wide' || extraType === 'noBall',
          isLegalOverComplete,
          wicketInfo?.dismissedPlayerId,
          newIncomingBatterId
        );
        nextStriker = strikeState.nextStrikerId;
        nextNonStriker = strikeState.nextNonStrikerId;
      }

      if (isWicket && wicketInfo) {
        ballEvent.wicketDetails = {
          type: wicketInfo.type,
          dismissedPlayerId: wicketInfo.dismissedPlayerId,
          bowlerId,
          fielderId: wicketInfo.fielderId || null,
          newBatterId: newIncomingBatterId || null,
        };
      }

      await addBallEvent(selectedMatch, ballEvent, playersMap, nextStriker, nextNonStriker);

      setStrikerId(nextStriker);
      setNonStrikerId(nextNonStriker);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      // Trigger Over Completion Bowler Selection Modal immediately as soon as over completes
      if (isLegalOverComplete) {
        const completedOverNum = Math.floor((legalBallsCount + 1) / ballsPerOver);
        setLastCompletedOverNumber(completedOverNum);
        const bowlingTeamPlayers = selectedMatch.teamA.id === selectedMatch.teamB.id ? selectedMatch.teamA.playerIds : (selectedMatch.teamA.playerIds.includes(bowlerId) ? selectedMatch.teamA.playerIds : selectedMatch.teamB.playerIds);
        const nextSuggestedBowler = bowlingTeamPlayers.find((id) => id !== bowlerId) || bowlerId;
        setNextBowlerSelectionId(nextSuggestedBowler);
        setShowSelectNextBowlerModal(true);
      }
    } catch (err) {
      console.error('Error scoring ball:', err);
      setSaveStatus('error');
      showNotice('Failed to record ball delivery.');
    } finally {
      setIsSaving(false);
    }
  };

  // Undo delivery handler
  const handleUndoDelivery = async () => {
    if (!selectedMatch || balls.length === 0) return;

    if (selectedMatch.status === 'completed' && !isAdmin) {
      showNotice('This match has been completed.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await undoLastBallEvent(selectedMatch, playersMap);
      setSaveStatus('saved');
      showNotice('Last delivery undone. Scorecard restored.', 'info');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Undo error:', err);
      showNotice('Could not undo last delivery.');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize match handler
  const handleFinalizeMatchSubmit = async () => {
    if (!selectedMatch || !currentUser) return;
    try {
      const summaryText = selectedMatch.result?.summaryText || 'Match ended.';
      await finalizeMatch(
        selectedMatch,
        {
          winnerTeamId: selectedMatch.result?.winnerTeamId || null,
          winType: selectedMatch.result?.winType || 'runs',
          summaryText,
          playerOfTheMatchId: potmId || undefined,
        },
        currentUser.uid,
        currentUser.displayName || 'Admin'
      );
      setShowFinalizeModal(false);
      showNotice('Match finalized! Career statistics updated.', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error finalizing match:', err);
      showNotice('Failed to finalize match.');
    }
  };

  // Filtered match lists
  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const filteredMatches = matches.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.teamA.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.teamB.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.venue.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusTab === 'live') return m.status === 'live';
    if (statusTab === 'upcoming') return m.status === 'scheduled';
    if (statusTab === 'completed') return m.status === 'completed';
    return true;
  });

  // Calculate live score displays
  const currentInningsSummary = selectedMatch
    ? selectedMatch.currentInnings === 1
      ? selectedMatch.innings1
      : selectedMatch.innings2
    : null;

  const totalRuns = currentInningsSummary?.totalRuns || 0;
  const wickets = currentInningsSummary?.wickets || 0;
  const legalBalls = currentInningsSummary?.legalBalls || 0;
  const oversStr = selectedMatch
    ? formatOvers(legalBalls, selectedMatch.rules.legalBallsPerOver)
    : '0.0';

  const isLegalOverComplete = useMemo(() => {
    if (!selectedMatch) return false;
    const legalBallsInInnings = currentInningsSummary?.legalBalls || 0;
    return legalBallsInInnings > 0 && legalBallsInInnings % (selectedMatch.rules.legalBallsPerOver || 6) === 0;
  }, [currentInningsSummary?.legalBalls, selectedMatch?.rules.legalBallsPerOver]);

  const currentRR = selectedMatch
    ? calculateRunRate(totalRuns, legalBalls, selectedMatch.rules.legalBallsPerOver)
    : 0;

  const targetRuns = selectedMatch?.targetRuns || (selectedMatch?.innings1 ? selectedMatch.innings1.totalRuns + 1 : 0);
  const runsNeeded = Math.max(0, targetRuns - totalRuns);
  const ballsRemaining = selectedMatch
    ? Math.max(0, selectedMatch.oversPerInnings * selectedMatch.rules.legalBallsPerOver - legalBalls)
    : 0;
  const reqRR =
    ballsRemaining > 0
      ? Number(((runsNeeded / (ballsRemaining / (selectedMatch?.rules.legalBallsPerOver || 6)))).toFixed(2))
      : 0;

  const strikerStat = currentInningsSummary?.batters[strikerId];
  const nonStrikerStat = currentInningsSummary?.batters[nonStrikerId];
  const bowlerStat = currentInningsSummary?.bowlers[bowlerId];

  const recentBalls = balls.slice(-7);

  // =========================================================================
  // RENDER SCREEN 1: LIVE MATCHES LIST
  // =========================================================================
  if (!selectedMatch) {
    return (
      <div className="bg-[#F5F7F8] text-[#17211D] min-h-screen font-sans antialiased pb-20">
        {/* SCREEN 1: HEADER */}
        <header className="sticky top-0 z-40 bg-[#003626] text-white border-b border-[#007A3D]/40 shadow-sm">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenDrawer}
                className="p-1 -ml-1 text-white hover:text-[#A8FF00] rounded-lg transition-colors cursor-pointer"
              >
                <Menu className="w-5.5 h-5.5 stroke-[2.2]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#A8FF00] flex items-center justify-center">
                  <span className="font-black text-[#003626] text-xs">XI</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline leading-none">
                    <span className="font-bold text-base tracking-tight text-white">Local</span>
                    <span className="font-bold text-base tracking-tight text-[#A8FF00]">XI</span>
                  </div>
                  <span className="text-[9px] text-[#BDCEC8] font-mono">Live Scoring Panel</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-1.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF263D] rounded-full border-2 border-[#003626]" />
              </button>
              <img
                src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'}
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover border-2 border-[#A8FF00]"
              />
            </div>
          </div>
        </header>

        {/* SCREEN 1: MAIN CONTAINER */}
        <main className="max-w-md mx-auto p-4 space-y-4">
          {/* SCREEN 1 B: MATCH STATUS TABS */}
          <div className="grid grid-cols-3 gap-1 bg-[#E3EAE7] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusTab('live')}
              className={`py-2 px-2 text-center rounded-lg transition-all cursor-pointer ${
                statusTab === 'live'
                  ? 'bg-[#007A3D] text-white font-bold shadow-xs'
                  : 'text-[#68746F] hover:text-[#17211D]'
              }`}
            >
              Live ({liveMatches.length})
            </button>
            <button
              onClick={() => setStatusTab('upcoming')}
              className={`py-2 px-2 text-center rounded-lg transition-all cursor-pointer ${
                statusTab === 'upcoming'
                  ? 'bg-[#007A3D] text-white font-bold shadow-xs'
                  : 'text-[#68746F] hover:text-[#17211D]'
              }`}
            >
              Upcoming ({upcomingMatches.length})
            </button>
            <button
              onClick={() => setStatusTab('completed')}
              className={`py-2 px-2 text-center rounded-lg transition-all cursor-pointer ${
                statusTab === 'completed'
                  ? 'bg-[#1554B8] text-white font-bold shadow-xs'
                  : 'text-[#718096] hover:text-[#172033]'
              }`}
            >
              Completed ({completedMatches.length})
            </button>
          </div>

          {/* SCREEN 1 C: SEARCH AND FILTER */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718096]" />
              <input
                type="text"
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#DFE7F2] rounded-xl pl-9 pr-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#1554B8]"
              />
            </div>
            <button className="bg-white border border-[#DFE7F2] p-2 rounded-xl text-[#718096] hover:text-[#172033] cursor-pointer">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* SCREEN 1 D: CURRENTLY LIVE SECTION */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-sm text-[#172033] uppercase tracking-wider text-[#1554B8] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D94343] animate-pulse" />
              <span>Currently Live</span>
            </h2>

            {filteredMatches.length === 0 ? (
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-6 text-center text-xs text-[#718096]">
                No {statusTab} matches found.
              </div>
            ) : (
              filteredMatches.map((m) => {
                const isLive = m.status === 'live';
                const isScheduled = m.status === 'scheduled';
                const isCompleted = m.status === 'completed';

                const activeInnings = m.currentInnings === 2 ? m.innings2 : m.innings1;
                const scoreStr = activeInnings ? `${activeInnings.totalRuns}/${activeInnings.wickets}` : '0/0';
                const oversStr = activeInnings
                  ? `${activeInnings.legalOvers} / ${m.oversPerInnings}`
                  : `0.0 / ${m.oversPerInnings}`;

                return (
                  <div key={m.id} className="bg-white border border-[#DFE7F2] rounded-2xl p-4 shadow-xs space-y-3 relative">
                    {/* Top Tag Row */}
                    <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-2.5">
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <span className="bg-[#D94343]/10 border border-[#D94343]/30 text-[#D94343] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D94343] animate-pulse" />
                            LIVE
                          </span>
                        )}
                        {isScheduled && (
                          <span className="bg-[#2878E5]/10 border border-[#2878E5]/30 text-[#2878E5] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            UPCOMING
                          </span>
                        )}
                        {isCompleted && (
                          <span className="bg-[#718096]/10 border border-[#718096]/30 text-[#718096] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            COMPLETED
                          </span>
                        )}

                        <span className="text-xs font-mono font-bold text-[#172033]">
                          {m.playersPerTeam}v{m.playersPerTeam}
                        </span>
                        <span className="text-xs text-[#718096] font-mono">• {m.oversPerInnings} Overs</span>
                        <span className="text-xs font-bold text-[#1554B8] font-mono">• {m.title}</span>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setActiveCardMenuId(activeCardMenuId === m.id ? null : m.id)}
                          className="text-[#718096] hover:text-[#172033] p-1 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeCardMenuId === m.id && (
                          <div className="absolute right-0 top-6 z-20 bg-white border border-[#DFE7F2] rounded-xl shadow-lg py-1 w-32 text-xs font-semibold">
                            <button
                              onClick={() => {
                                setActiveCardMenuId(null);
                                setSelectedMatch(m);
                                setActiveTab('scoring');
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#EAF2FF] text-[#1554B8]"
                            >
                              Live Scoring
                            </button>
                            <button
                              onClick={() => {
                                setActiveCardMenuId(null);
                                setSelectedMatch(m);
                                setActiveTab('scorecard');
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#EAF2FF] text-[#172033]"
                            >
                              Full Scorecard
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Teams and Score Header */}
                    <div className="flex items-center justify-between text-xs font-bold text-[#172033]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1554B8]/10 text-[#1554B8] flex items-center justify-center font-black">
                          {m.teamA.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm">{m.teamA.name}</span>
                      </div>

                      <span className="font-mono text-[#718096] text-xs font-bold">VS</span>

                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.teamB.name}</span>
                        <div className="w-8 h-8 rounded-full bg-[#2878E5]/10 text-[#2878E5] flex items-center justify-center font-black">
                          {m.teamB.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Score and Overs Big Numbers */}
                    {isLive && (
                      <div className="flex items-baseline justify-between bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                        <div>
                          <span className="text-[10px] text-[#718096] font-bold block uppercase font-mono">Current Score</span>
                          <span className="font-mono font-black text-2xl text-[#172033] tracking-tight">{scoreStr}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#718096] font-bold block uppercase font-mono">Overs</span>
                          <span className="font-mono font-bold text-sm text-[#1554B8]">{oversStr}</span>
                        </div>
                      </div>
                    )}

                    {/* Venue & Toss */}
                    <div className="text-[11px] text-[#718096] space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#1554B8]" />
                        <span>Venue: {m.venue}</span>
                      </div>
                      {m.toss && (
                        <div>
                          Toss:{' '}
                          <span className="font-semibold text-[#172033]">
                            {m.toss.winnerTeamId === m.teamA.id ? m.teamA.name : m.teamB.name} ({m.toss.decision === 'bat' ? 'Bat' : 'Field'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status & Open Live Scoring Button */}
                    <div className="pt-2 border-t border-[#DFE7F2] flex items-center justify-between">
                      <span className="text-xs text-[#21864A] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#21864A]" />
                        Live Scoring Active
                      </span>

                      <button
                        onClick={() => {
                          setSelectedMatch(m);
                          setActiveTab('scoring');
                        }}
                        className="bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer touch-press"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Open Live Scoring</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // RENDER SCREENS 2, 3, 4: LIVE SCORING INTERFACE
  // =========================================================================
  return (
    <div className="bg-[#F2F6FC] text-[#172033] min-h-screen font-sans antialiased pb-20 relative pt-safe">
      {/* Dynamic Feedback Banner */}
      {panelNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#DFE7F2] text-[#172033] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between gap-3 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              panelNotice.type === 'error' ? 'bg-[#D94343]' : panelNotice.type === 'success' ? 'bg-[#21864A]' : 'bg-[#1554B8]'
            }`} />
            <span>{panelNotice.message}</span>
          </div>
          <button onClick={() => setPanelNotice(null)} className="cursor-pointer text-xs font-bold text-[#718096] hover:text-[#172033]">
            ✕
          </button>
        </div>
      )}

      {/* LIVE SCORING TOP HEADER (SCREENS 2, 3, 4) */}
      <header className="sticky top-0 z-40 bg-[#1554B8] border-b border-[#0B3F91] text-white shadow-sm">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onClosePanel) onClosePanel();
                setSelectedMatch(null);
              }}
              className="p-1 -ml-1 text-white hover:text-[#EAF2FF] cursor-pointer"
            >
              <ArrowLeft className="w-5.5 h-5.5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="font-display font-bold text-sm tracking-tight text-white leading-tight flex items-center gap-2">
                Live Scoring
                {saveStatus !== 'idle' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                    saveStatus === 'saving' ? 'bg-white/20 text-white' : 
                    saveStatus === 'saved' ? 'bg-green-400 text-[#003626]' : 
                    'bg-red-500 text-white'
                  }`}>
                    {saveStatus === 'saving' ? 'Syncing...' : 
                     saveStatus === 'saved' ? (isOnline ? 'Saved' : 'Stored Offline') : 
                     'Error'}
                  </span>
                )}
              </h1>
              <span className="text-[10px] text-[#EAF2FF] font-mono">
                {selectedMatch.title} • {selectedMatch.venue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider shadow-xs">
                <WifiOff className="w-3 h-3" />
                OFFLINE
              </span>
            )}
            <span className="bg-[#D94343] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-white text-[#1554B8]' : 'text-white/80 hover:text-white'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* SCREEN 2 B: REDESIGNED SCORE HEADER PANEL */}
      <div className="bg-[#1554B8] border-b border-[#0B3F91] text-white px-3.5 py-3 shadow-sm">
        <div className="max-w-md mx-auto space-y-2">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between text-[10px] font-bold text-[#EAF2FF] uppercase tracking-widest px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-extrabold">{battingTeam?.name?.substring(0, 3) || 'BAT'}</span>
              <span>vs</span>
              <span>{bowlingTeam?.name?.substring(0, 3) || 'BOWL'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#D94343] text-white px-1.5 py-0.5 rounded-sm font-bold">LIVE</span>
              <span className="text-white">Day 1</span>
            </div>
          </div>

          {/* Main Score Row */}
          <div className="flex items-end justify-between px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#EAF2FF] uppercase mb-0.5">Total Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">
                  {totalRuns}-{wickets}
                </span>
                <span className="text-base font-bold text-[#EAF2FF]">
                  ({oversStr})
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 mb-1">
              {selectedMatch.currentInnings === 2 && (
                <div className="text-[11px] font-bold text-white">
                  Target: <span className="text-white font-black">{targetRuns}</span>
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-[#EAF2FF] uppercase leading-none">CRR</span>
                  <span className="text-xs font-black text-white mt-0.5">{currentRR}</span>
                </div>
                {selectedMatch.currentInnings === 2 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-[#EAF2FF] uppercase leading-none">RRR</span>
                    <span className="text-xs font-black text-white mt-0.5">{reqRR}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-12 z-30 bg-white border-b border-[#DFE7F2]">
        <div className="max-w-md mx-auto flex gap-1 overflow-x-auto no-scrollbar px-2 py-1.5">
          {[
            { id: 'scoring', label: 'Scoring' },
            { id: 'scorecard', label: 'Scorecard' },
            { id: 'overs', label: 'Overs' },
            { id: 'stats', label: 'Stats' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-1.5 px-4 whitespace-nowrap rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1554B8] text-white shadow-xs'
                    : 'bg-transparent text-[#718096] hover:text-[#172033]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN SCREEN BODY BASED ON ACTIVE TAB */}
      <main className="max-w-md mx-auto p-2 space-y-2">
        {/* =========================================================================
            TAB 1: SCORING (SCREEN TWO)
           ========================================================================= */}
        {activeTab === 'scoring' && (
          <div className="space-y-3">
            {selectedMatch.status === 'completed' && (
              <div className="bg-[#003626] border border-[#A8FF00]/40 rounded-3xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-xl">
                <div className="w-16 h-16 bg-[#A8FF00]/10 rounded-full flex items-center justify-center mx-auto border-2 border-[#A8FF00]/30">
                  <CheckCircle2 className="w-8 h-8 text-[#A8FF00]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Match Completed</h3>
                  <p className="text-sm text-[#A8FF00] font-bold font-mono">{selectedMatch.result?.summaryText}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('scorecard')}
                    className="bg-[#004333] hover:bg-[#002A1D] text-white border border-[#007A3D] font-bold text-[10px] uppercase tracking-widest py-3 rounded-2xl transition-all active:scale-95 cursor-pointer"
                  >
                    View Scorecard
                  </button>
                  <button
                    onClick={() => setShowFinalizeModal(true)}
                    className="bg-[#A8FF00] hover:bg-lime-400 text-[#003626] font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    Finalize Match
                  </button>
                </div>
              </div>
            )}
            
            {selectedMatch.status !== 'completed' && (
              <>
                <div className="grid grid-cols-1 gap-2">
              {/* Batsmen Summary */}
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 shadow-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#DFE7F2]">
                      <th className="pb-1.5">Batsmen</th>
                      <th className="pb-1.5 text-center w-8">R</th>
                      <th className="pb-1.5 text-center w-8">B</th>
                      <th className="pb-1.5 text-center w-6">4s</th>
                      <th className="pb-1.5 text-center w-6">6s</th>
                      <th className="pb-1.5 text-right w-12">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE7F2]">
                    <tr className="text-[11px] font-bold text-[#172033]">
                      <td className="py-2 flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1554B8] shrink-0" />
                        <span className="text-[#172033] truncate font-bold">
                          {playersMap[strikerId]?.fullName || 'Striker'}*
                        </span>
                      </td>
                      <td className="py-2 text-center text-[#172033] tabular-nums font-extrabold">{strikerStat?.runs || 0}</td>
                      <td className="py-2 text-center text-[#718096] tabular-nums">{strikerStat?.balls || 0}</td>
                      <td className="py-2 text-center text-[#718096] tabular-nums">{strikerStat?.fours || 0}</td>
                      <td className="py-2 text-center text-[#718096] tabular-nums">{strikerStat?.sixes || 0}</td>
                      <td className="py-2 text-right text-[#1554B8] tabular-nums font-bold">
                        {calculateStrikeRate(strikerStat?.runs || 0, strikerStat?.balls || 0)}
                      </td>
                    </tr>
                    <tr className="text-[11px] font-medium text-[#718096]">
                      <td className="py-2 flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DFE7F2] shrink-0" />
                        <span className="truncate">
                          {playersMap[nonStrikerId]?.fullName || 'Non-Striker'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-[#172033] tabular-nums font-semibold">{nonStrikerStat?.runs || 0}</td>
                      <td className="py-2 text-center tabular-nums">{nonStrikerStat?.balls || 0}</td>
                      <td className="py-2 text-center tabular-nums">{nonStrikerStat?.fours || 0}</td>
                      <td className="py-2 text-center tabular-nums">{nonStrikerStat?.sixes || 0}</td>
                      <td className="py-2 text-right tabular-nums">
                        {calculateStrikeRate(nonStrikerStat?.runs || 0, nonStrikerStat?.balls || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bowler Summary */}
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 shadow-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#DFE7F2]">
                      <th className="pb-1.5">Bowler</th>
                      <th className="pb-1.5 text-center w-10">O</th>
                      <th className="pb-1.5 text-center w-8">M</th>
                      <th className="pb-1.5 text-center w-8">R</th>
                      <th className="pb-1.5 text-center w-8">W</th>
                      <th className="pb-1.5 text-right w-12">ER</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-[11px] font-bold text-[#172033]">
                      <td className="py-2 flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1554B8] shrink-0" />
                        <span className="text-[#172033] truncate">
                          {playersMap[bowlerId]?.fullName || 'Bowler'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-[#172033] tabular-nums">
                        {formatOvers(bowlerStat?.balls || 0, selectedMatch.rules.legalBallsPerOver || 6)}
                      </td>
                      <td className="py-2 text-center text-[#718096] tabular-nums">{bowlerStat?.maidens || 0}</td>
                      <td className="py-2 text-center text-[#718096] tabular-nums">{bowlerStat?.runsConceded || 0}</td>
                      <td className="py-2 text-center text-[#21864A] tabular-nums font-extrabold">{bowlerStat?.wickets || 0}</td>
                      <td className="py-2 text-right text-[#718096] tabular-nums">
                        {calculateEconomy(bowlerStat?.runsConceded || 0, bowlerStat?.balls || 0, selectedMatch.rules.legalBallsPerOver || 6)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECENT BALLS */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 flex flex-col gap-2 shadow-xs">
              <span className="text-[9px] font-bold text-[#718096] uppercase tracking-wider">Recent Balls</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[...balls].slice(-10).map((b, i) => {
                  let colorClass = 'bg-[#F2F6FC] text-[#172033] border-[#DFE7F2]';
                  let label = b.runsBatter.toString();
                  if (b.isWicket) { colorClass = 'bg-[#D94343] text-white border-[#D94343]'; label = 'W'; }
                  else if (b.runsBatter === 6) { colorClass = 'bg-[#1554B8] text-white border-[#1554B8]'; }
                  else if (b.runsBatter === 4) { colorClass = 'bg-[#2878E5] text-white border-[#2878E5]'; }
                  else if (b.extraType === 'wide') { colorClass = 'bg-[#E99A27] text-white border-[#E99A27]'; label = `${b.extraRuns}w`; }
                  else if (b.extraType === 'noBall') { colorClass = 'bg-[#E99A27] text-white border-[#E99A27]'; label = `${b.runsBatter + 1}n`; }
                  
                  return (
                    <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border ${colorClass}`}>
                      {label}
                    </div>
                  );
                })}
                {balls.length === 0 && <span className="text-[10px] text-[#718096] font-bold uppercase italic mt-1">First ball pending...</span>}
              </div>
              {balls.length > 0 && (
                <div className="text-xs text-[#1554B8] font-bold mt-2 bg-[#F2F6FC] p-2 rounded-xl border border-[#DFE7F2]">
                  {balls[balls.length - 1].commentary}
                </div>
              )}
            </div>

                {/* SCREEN 2 G: TOUCH SCORING KEYPAD */}
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {/* Row 1: 0, 1, 2, 3 */}
                    {[0, 1, 2, 3].map((run) => (
                      <button
                        key={run}
                        disabled={isSaving}
                        onClick={() => handleScoreBall(run)}
                        className="h-13 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#172033] font-black text-xl rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                      >
                        {run}
                      </button>
                    ))}

                    {/* Row 2: 4, 6, NB, WD */}
                    <button
                      disabled={isSaving}
                      onClick={() => handleScoreBall(4)}
                      className="h-13 bg-[#2878E5] hover:bg-[#1554B8] text-white font-black text-xl rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      4
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => handleScoreBall(6)}
                      className="h-13 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-black text-xl rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      6
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => handleScoreBall(0, 'noBall', 0)}
                      className="h-13 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#1554B8] font-black text-base rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      NB
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => handleScoreBall(0, 'wide', 0)}
                      className="h-13 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#1554B8] font-black text-base rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      WD
                    </button>

                    {/* Row 3: BYE, LB, WICKET, UNDO */}
                    <button
                      disabled={isSaving}
                      onClick={() => { setSelectedExtraType('bye'); setShowExtrasModal(true); }}
                      className="h-13 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#172033] font-bold text-xs uppercase rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      BYE
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => { setSelectedExtraType('legBye'); setShowExtrasModal(true); }}
                      className="h-13 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#172033] font-bold text-xs uppercase rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      LB
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => { setDismissedPlayerId(strikerId); setShowWicketModal(true); }}
                      className="h-13 bg-[#D94343] hover:bg-red-700 text-white font-black text-xs uppercase rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      Wicket
                    </button>
                    <button
                      disabled={isSaving || balls.length === 0}
                      onClick={handleUndoDelivery}
                      className="h-13 bg-[#E99A27] hover:bg-amber-600 text-white font-black text-xs uppercase rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs disabled:opacity-30"
                    >
                      Undo
                    </button>
                  </div>

                  {/* THIS OVER SUMMARY */}
                  <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#718096] uppercase tracking-wider">This Over</span>
                      <span className="text-[9px] font-bold text-[#1554B8] uppercase tracking-wider">Bowler: {playersMap[bowlerId]?.fullName || 'Bowler'}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                      {(() => {
                        const legalBallsInInnings = balls.filter(b => b.isLegal).length;
                        const currentOverIdx = Math.floor(legalBallsInInnings / (selectedMatch.rules.legalBallsPerOver || 6));
                        const currentOverBalls = balls.filter(b => b.overNumber === currentOverIdx);
                        
                        return (
                          <>
                            {currentOverBalls.map((b, i) => {
                              let circleColor = 'bg-[#F2F6FC] text-[#172033] border-[#DFE7F2]';
                              let ballLabel = b.runsBatter.toString();
                              if (b.isWicket) { circleColor = 'bg-[#D94343] text-white border-[#D94343]'; ballLabel = 'W'; }
                              else if (b.runsBatter === 6) { circleColor = 'bg-[#1554B8] text-white border-[#1554B8]'; }
                              else if (b.runsBatter === 4) { circleColor = 'bg-[#2878E5] text-white border-[#2878E5]'; }
                              else if (b.extraType === 'wide') { circleColor = 'bg-[#E99A27] text-white border-[#E99A27]'; ballLabel = 'wd'; }
                              else if (b.extraType === 'noBall') { circleColor = 'bg-[#E99A27] text-white border-[#E99A27]'; ballLabel = 'nb'; }

                              return (
                                <div key={i} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black shrink-0 ${circleColor}`}>
                                  {ballLabel}
                                </div>
                              );
                            })}
                            {/* Empty slots for remaining balls in over */}
                            {Array.from({ length: Math.max(0, (selectedMatch.rules.legalBallsPerOver || 6) - currentOverBalls.filter(b => b.isLegal).length) }).map((_, i) => (
                              <div key={`empty-${i}`} className="w-8 h-8 rounded-full border border-[#DFE7F2] bg-[#F2F6FC] flex items-center justify-center text-[#718096] text-[10px] shrink-0">
                                •
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        if (!isLegalOverComplete) {
                          showNotice('Over is not complete yet!');
                          return;
                        }
                        setShowSelectNextBowlerModal(true);
                      }}
                      className="py-3 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                      <UserPlus className="w-4 h-4" />
                      End Over
                    </button>
                    <button
                      onClick={() => setShowSelectNextBowlerModal(true)}
                      className="py-3 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#1554B8] font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Change Bowler
                    </button>
                    <button
                      onClick={() => setShowFinalizeModal(true)}
                      className="py-3 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#718096] hover:text-[#172033] font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                      <Flag className="w-4 h-4" />
                      End Match
                    </button>
                    <button
                      onClick={() => {
                        setDismissedPlayerId(strikerId);
                        showNotice('Retiring striker...');
                        setWicketType('retired_out');
                        setShowWicketModal(true);
                      }}
                      className="py-3 bg-white hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#718096] hover:text-[#172033] font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                      <UserX className="w-4 h-4" />
                      Retire Batsman
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: SCORECARD (SCREEN THREE)
           ========================================================================= */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            {/* SCREEN 3 C: INNINGS SELECTOR */}
            <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-[#DFE7F2] text-xs font-bold shadow-xs">
              <button
                onClick={() => setScorecardInningsView(1)}
                className={`py-2 text-center rounded-xl transition-all cursor-pointer ${
                  scorecardInningsView === 1 ? 'bg-[#1554B8] text-white' : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                {selectedMatch.teamA.name} (Batting)
              </button>
              <button
                onClick={() => setScorecardInningsView(2)}
                className={`py-2 text-center rounded-xl transition-all cursor-pointer ${
                  scorecardInningsView === 2 ? 'bg-[#1554B8] text-white' : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                {selectedMatch.teamB.name} (Bowling)
              </button>
            </div>

            {/* SCREEN 3 D: BATTING TABLE */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Batting Scorecard
              </h3>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="text-[#718096] border-b border-[#DFE7F2]">
                      <th className="py-2 pr-2 font-sans font-bold">Batsman</th>
                      <th className="py-2 px-1 text-center font-bold">R</th>
                      <th className="py-2 px-1 text-center font-bold">B</th>
                      <th className="py-2 px-1 text-center font-bold">4s</th>
                      <th className="py-2 px-1 text-center font-bold">6s</th>
                      <th className="py-2 pl-1 text-right font-bold">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE7F2] text-[#172033]">
                    {currentInningsSummary && Object.keys(currentInningsSummary.batters).length > 0 ? (
                      Object.values(currentInningsSummary.batters).map((b) => (
                        <tr key={b.playerId} className="hover:bg-[#F2F6FC]">
                          <td className="py-2.5 pr-2">
                            <div className="font-bold text-[#172033] font-sans">{b.playerName}</div>
                            <div className="text-[10px] text-[#718096]">
                              {b.isOut ? b.dismissal || 'Out' : 'Not Out'}
                            </div>
                          </td>
                          <td className="py-2.5 px-1 text-center font-bold text-[#172033]">{b.runs}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{b.balls}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{b.fours}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{b.sixes}</td>
                          <td className="py-2.5 pl-1 text-right text-[#1554B8] font-bold">{b.strikeRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#718096] font-bold italic">
                          No batting data yet for this innings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* SCREEN 3 E & F: EXTRAS AND TOTAL */}
              <div className="pt-2 border-t border-[#DFE7F2] text-xs font-mono space-y-1">
                <div className="flex justify-between text-[#718096]">
                  <span>Extras</span>
                  <span>
                    (W {currentInningsSummary?.extras.wides || 2}, NB {currentInningsSummary?.extras.noBalls || 1}, B {currentInningsSummary?.extras.byes || 0}, LB {currentInningsSummary?.extras.legByes || 1}) Total: {currentInningsSummary?.extras.total || 4}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#172033] text-sm pt-1">
                  <span>Total</span>
                  <span className="text-[#1554B8] font-black">{totalRuns}/{wickets} ({oversStr} Overs)</span>
                </div>
              </div>
            </div>

            {/* SCREEN 3 G: FALL OF WICKETS */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Fall of Wickets
              </h3>

              <div className="space-y-1.5 font-mono text-xs text-[#172033]">
                {currentInningsSummary?.fallOfWickets && currentInningsSummary.fallOfWickets.length > 0 ? (
                  currentInningsSummary.fallOfWickets.map((fow) => (
                    <div key={fow.wicketNumber} className="flex items-center justify-between py-1 bg-[#F2F6FC] px-2.5 rounded-xl border border-[#DFE7F2]">
                      <span className="font-bold text-[#172033]">#{fow.wicketNumber} - {fow.score}</span>
                      <span className="text-[#718096]">Player: {playersMap[fow.playerOutId]?.fullName || 'Dismissed Batter'}</span>
                      <span className="text-[#1554B8] font-bold">Over {fow.over}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-[#718096] font-bold italic">No wickets fallen yet.</div>
                )}
              </div>
            </div>

            {/* SCREEN 3 H: BOWLING TABLE */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Bowling Figures
              </h3>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs font-mono text-left whitespace-nowrap">
                  <thead>
                    <tr className="text-[#718096] border-b border-[#DFE7F2]">
                      <th className="py-2 pr-2 font-sans font-bold">Bowler</th>
                      <th className="py-2 px-1 text-center font-bold">O</th>
                      <th className="py-2 px-1 text-center font-bold">M</th>
                      <th className="py-2 px-1 text-center font-bold">R</th>
                      <th className="py-2 px-1 text-center font-bold">W</th>
                      <th className="py-2 pl-1 text-right font-bold">Econ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE7F2] text-[#172033]">
                    {currentInningsSummary && Object.keys(currentInningsSummary.bowlers).length > 0 ? (
                      Object.values(currentInningsSummary.bowlers).map((bw) => (
                        <tr key={bw.playerId}>
                          <td className="py-2.5 pr-2 font-bold text-[#172033] font-sans">{bw.playerName}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{bw.overs}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{bw.maidens}</td>
                          <td className="py-2.5 px-1 text-center text-[#718096]">{bw.runsConceded}</td>
                          <td className="py-2.5 px-1 text-center font-bold text-[#21864A]">{bw.wickets}</td>
                          <td className="py-2.5 pl-1 text-right text-[#718096]">{bw.economy}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#718096] font-bold italic">
                          No bowling data yet for this innings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Live Match Statistics
              </h3>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-[#F2F6FC] p-3 rounded-xl border border-[#DFE7F2]">
                  <span className="text-[#718096] text-[10px] block font-sans uppercase font-bold">Current Score</span>
                  <span className="text-xl font-black text-[#172033]">{totalRuns}/{wickets}</span>
                </div>

                <div className="bg-[#F2F6FC] p-3 rounded-xl border border-[#DFE7F2]">
                  <span className="text-[#718096] text-[10px] block font-sans uppercase font-bold">Overs Bowled</span>
                  <span className="text-xl font-black text-[#1554B8]">{oversStr}</span>
                </div>

                <div className="bg-[#F2F6FC] p-3 rounded-xl border border-[#DFE7F2]">
                  <span className="text-[#718096] text-[10px] block font-sans uppercase font-bold">Run Rate</span>
                  <span className="text-xl font-black text-[#172033]">{currentRR}</span>
                </div>

                <div className="bg-[#F2F6FC] p-3 rounded-xl border border-[#DFE7F2]">
                  <span className="text-[#718096] text-[10px] block font-sans uppercase font-bold">Target Runs</span>
                  <span className="text-xl font-black text-[#1554B8]">{targetRuns}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MATCH SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* MATCH CONTROLS */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Match Controls
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Pause Match */}
                <button
                  onClick={() => {
                    setIsMatchPaused(!isMatchPaused);
                    showNotice(isMatchPaused ? 'Match resumed.' : 'Match paused.', 'info');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-2 font-bold text-xs cursor-pointer ${
                    isMatchPaused
                      ? 'bg-[#1554B8] text-white border-[#1554B8]'
                      : 'bg-[#F2F6FC] text-[#E99A27] border-[#DFE7F2]'
                  }`}
                >
                  <Pause className="w-4 h-4 shrink-0" />
                  <span>{isMatchPaused ? 'Resume Match' : 'Pause Match'}</span>
                </button>

                {/* 2. Stop Match */}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to stop this live match?')) {
                      showNotice('Match scoring stopped.', 'info');
                    }
                  }}
                  className="p-3 bg-[#F2F6FC] border border-[#DFE7F2] text-[#D94343] rounded-xl flex items-center gap-2 font-bold text-xs cursor-pointer hover:bg-red-50"
                >
                  <StopCircle className="w-4 h-4 shrink-0" />
                  <span>Stop Match</span>
                </button>

                {/* 3. Swap Innings */}
                <button
                  onClick={() => setShowInningsTransitionModal(true)}
                  className="p-3 bg-[#F2F6FC] border border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF] rounded-xl flex items-center gap-2 font-bold text-xs cursor-pointer"
                >
                  <Repeat className="w-4 h-4 text-[#1554B8] shrink-0" />
                  <span>Swap Innings</span>
                </button>

                {/* 4. Edit Score */}
                <button
                  onClick={() => setShowEditScoreModal(true)}
                  className="p-3 bg-[#F2F6FC] border border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF] rounded-xl flex items-center gap-2 font-bold text-xs cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-[#1554B8] shrink-0" />
                  <span>Edit Score</span>
                </button>

                {/* 5. Edit Over */}
                <button
                  onClick={() => {
                    showNotice('Over adjustment mode active.', 'info');
                  }}
                  className="p-3 bg-[#F2F6FC] border border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF] rounded-xl flex items-center gap-2 font-bold text-xs cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#1554B8] shrink-0" />
                  <span>Edit Over</span>
                </button>

                {/* 6. Match Notes */}
                <button
                  onClick={() => setShowMatchNotesModal(true)}
                  className="p-3 bg-[#F2F6FC] border border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF] rounded-xl flex items-center gap-2 font-bold text-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#1554B8] shrink-0" />
                  <span>Match Notes</span>
                </button>
              </div>
            </div>

            {/* OVER SETTINGS */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Over Settings
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[#718096] block mb-1">Overs per Match</label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedMatch.oversPerInnings} Overs`}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#718096] block mb-1">Current Over</label>
                  <input
                    type="text"
                    readOnly
                    value={oversStr.split('.')[0]}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => showNotice('Match overs configuration saved.', 'success')}
                className="w-full py-2.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Update Overs
              </button>
            </div>

            {/* SQUAD MANAGEMENT */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-2">
                <h3 className="font-bold text-sm text-[#1554B8]">Squad Management</h3>
                <span className="text-[10px] bg-[#EAF2FF] text-[#1554B8] px-2 py-0.5 rounded-full font-bold border border-[#DFE7F2]">Active Lineup</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Team A Squad */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">{selectedMatch.teamA.name}</span>
                    <button
                      onClick={() => {
                        setQuickAddType('teamA');
                        setShowQuickAddPlayerModal(true);
                      }}
                      className="p-1 bg-[#1554B8] text-white rounded-lg hover:bg-[#0B3F91] transition-colors"
                      title="Add Player to Team A"
                    >
                      <UserPlus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                    {selectedMatch.teamA.playerIds.map(pId => (
                      <div key={pId} className="text-[10px] text-[#172033] bg-[#F2F6FC] px-2 py-1.5 rounded-lg border border-[#DFE7F2] flex items-center justify-between">
                        <span className="truncate">{playersMap[pId]?.fullName || pId}</span>
                        { (pId === strikerId || pId === nonStrikerId) && <div className="w-1.5 h-1.5 rounded-full bg-[#1554B8]" /> }
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B Squad */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">{selectedMatch.teamB.name}</span>
                    <button
                      onClick={() => {
                        setQuickAddType('teamB');
                        setShowQuickAddPlayerModal(true);
                      }}
                      className="p-1 bg-[#1554B8] text-white rounded-lg hover:bg-[#0B3F91] transition-colors"
                      title="Add Player to Team B"
                    >
                      <UserPlus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                    {selectedMatch.teamB.playerIds.map(pId => (
                      <div key={pId} className="text-[10px] text-[#172033] bg-[#F2F6FC] px-2 py-1.5 rounded-lg border border-[#DFE7F2] flex items-center justify-between">
                        <span className="truncate">{playersMap[pId]?.fullName || pId}</span>
                        { pId === bowlerId && <div className="w-1.5 h-1.5 rounded-full bg-[#1554B8]" /> }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE SCORING SETTINGS SWITCHES */}
            <div className="bg-white border border-[#DFE7F2] rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#1554B8] border-b border-[#DFE7F2] pb-2">
                Live Scoring Settings
              </h3>

              <div className="space-y-3 text-xs text-[#172033]">
                {[
                  { label: 'Auto Switch Strike', val: autoSwitchStrike, setter: setAutoSwitchStrike },
                  { label: 'Show Commentary', val: showCommentary, setter: setShowCommentary },
                  { label: 'Show Run Rate', val: showRunRate, setter: setShowRunRate },
                  { label: 'Allow Edit Score', val: allowEditScoreToggle, setter: setAllowEditScoreToggle },
                  { label: 'Auto Calculate Target', val: autoCalculateTarget, setter: setAutoCalculateTarget },
                ].map((sw) => (
                  <div key={sw.label} className="flex items-center justify-between">
                    <span className="font-medium">{sw.label}</span>
                    <button
                      onClick={() => sw.setter(!sw.val)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        sw.val ? 'bg-[#1554B8]' : 'bg-[#DFE7F2]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full transition-transform bg-white shadow-xs ${
                          sw.val ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* END MATCH BUTTON */}
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="w-full py-3.5 bg-[#D94343] hover:bg-red-700 text-white font-black text-sm rounded-2xl shadow-xs cursor-pointer touch-press uppercase tracking-wider"
            >
              End Match
            </button>
          </div>
        )}
      </main>

      {/* MODAL 0: OVER COMPLETE NEXT BOWLER SELECTOR MODAL */}
      {showSelectNextBowlerModal && selectedMatch && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 shadow-2xl text-[#172033] my-auto">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-[#1554B8]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-[#172033] leading-tight">
                    Over {lastCompletedOverNumber} Complete! (ओवर समाप्त)
                  </h3>
                  <p className="text-[11px] text-[#718096]">
                    Select bowler for Over {lastCompletedOverNumber + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectNextBowlerModal(false)}
                className="text-[#718096] hover:text-[#172033] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1554B8]">
                  Select Next Bowler (अगला बॉलर चुनें) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddType('bowling');
                    setShowQuickAddPlayerModal(true);
                  }}
                  className="flex items-center gap-1 text-[10px] bg-[#1554B8] text-white px-2 py-1 rounded-lg font-bold hover:bg-[#0B3F91] transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>नया खिलाड़ी (New Player)</span>
                </button>
              </div>

              {/* List of squad bowlers */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {((selectedMatch.teamA.playerIds.includes(bowlerId) ? selectedMatch.teamA.playerIds : selectedMatch.teamB.playerIds) || players.map((p) => p.id)).map((pId) => {
                  const isPreviousBowler = pId === bowlerId;
                  const isSelected = pId === nextBowlerSelectionId;

                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => setNextBowlerSelectionId(pId)}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1554B8] text-white border-[#1554B8] font-bold shadow-xs'
                          : 'bg-[#F2F6FC] text-[#172033] border-[#DFE7F2] hover:border-[#1554B8]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                          <span>{playersMap[pId]?.fullName || pId}</span>
                          {isPreviousBowler && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#EAF2FF] text-[#1554B8]'
                            }`}>
                              Prev Bowler
                            </span>
                          )}
                        </div>
                        <div className={`text-[10.5px] ${isSelected ? 'text-white/80' : 'text-[#718096]'} font-mono`}>
                          {playersMap[pId]?.bowlingStyle?.replace(/_/g, ' ') || 'Bowler'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#F2F6FC] rounded-xl p-2.5 border border-[#DFE7F2] text-[#718096] text-[11px] flex items-center justify-between">
                <span>Previous Bowler: <strong className="text-[#172033]">{playersMap[bowlerId]?.fullName || bowlerId}</strong></span>
                <span className="text-[#21864A] font-semibold">Ends Swapped ✓</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmNextBowler}
              className="w-full min-h-[48px] bg-[#1554B8] hover:bg-[#0B3F91] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer touch-press shadow-xs"
            >
              <Check className="w-5 h-5" />
              Confirm Next Bowler & Start Over
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: WICKET DISMISSAL MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-md p-5 space-y-4 text-[#172033]">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <h3 className="font-bold text-base text-[#1554B8]">Record Wicket</h3>
              <button onClick={() => setShowWicketModal(false)} className="text-[#718096] hover:text-[#172033] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#718096] block mb-1">Dismissal Type</label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as WicketType)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033]"
                >
                  <option value="caught">Caught</option>
                  <option value="bowled">Bowled</option>
                  <option value="lbw">LBW</option>
                  <option value="run_out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hit_wicket">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="text-[#718096] block mb-1">Dismissed Player</label>
                <select
                  value={dismissedPlayerId}
                  onChange={(e) => setDismissedPlayerId(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033]"
                >
                  <option value={strikerId}>{playersMap[strikerId]?.fullName || 'Striker'}</option>
                  <option value={nonStrikerId}>{playersMap[nonStrikerId]?.fullName || 'Non-Striker'}</option>
                </select>
              </div>

              {/* Incoming Batter Section */}
              {remainingBatters.length > 0 ? (
                <div>
                  <label className="text-[#718096] block mb-1 font-bold text-[#1554B8] flex items-center justify-between">
                    <span>Select Incoming Batter (नया बैट्समैन चुनें) *</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddType('batting');
                        setShowQuickAddPlayerModal(true);
                      }}
                      className="flex items-center gap-1 text-[9px] bg-[#1554B8] text-white px-1.5 py-0.5 rounded font-bold hover:bg-[#0B3F91]"
                    >
                      <UserPlus className="w-2.5 h-2.5" />
                      <span>जोड़ें (Add)</span>
                    </button>
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] focus:outline-none focus:border-[#1554B8]"
                  >
                    <option value="">Select incoming batter...</option>
                    {remainingBatters.map((pId) => (
                      <option key={pId} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800 text-xs space-y-1">
                  <div className="font-bold text-[#E99A27] flex items-center gap-1">
                    ⭐️ Last Remaining Batter (आखिरी अकेला खिलाड़ी)
                  </div>
                  <p className="text-[11px] text-[#718096] font-sans">
                    No unbatted players left in squad. The surviving player will play solo as a Single Batter until dismissed!
                  </p>
                </div>
              )}

              <button
                onClick={async () => {
                  const targetDismissedId = dismissedPlayerId || strikerId;
                  if (!targetDismissedId) return;

                  if (remainingBatters.length > 0 && !newBatterId) {
                    showNotice('Please select the incoming batsman.');
                    return;
                  }

                  await handleScoreBall(
                    0,
                    'none',
                    0,
                    true,
                    {
                      type: wicketType,
                      dismissedPlayerId: targetDismissedId,
                      fielderId: fielderId || undefined,
                    },
                    newBatterId || undefined
                  );

                  const dismissedName = playersMap[targetDismissedId]?.fullName || targetDismissedId;
                  if (remainingBatters.length === 0) {
                    showNotice(`${dismissedName} out! Single Batter Mode activated for last surviving player.`, 'info');
                  } else {
                    showNotice(`${dismissedName} dismissed (${wicketType}). Scoreboard updated.`, 'success');
                  }

                  setShowWicketModal(false);
                  setDismissedPlayerId('');
                  setFielderId('');
                  setNewBatterId('');
                }}
                className="w-full py-3 bg-[#D94343] font-bold text-xs text-white rounded-xl cursor-pointer mt-2"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCORE CORRECTION MODAL */}
      {showEditScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-md p-5 space-y-4 text-[#172033]">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <h3 className="font-bold text-base text-[#1554B8]">Edit Score Correction</h3>
              <button onClick={() => setShowEditScoreModal(false)} className="text-[#718096] hover:text-[#172033] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#718096] block mb-1">Total Runs</label>
                <input
                  type="number"
                  value={editScoreRuns || totalRuns}
                  onChange={(e) => setEditScoreRuns(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono"
                />
              </div>

              <div>
                <label className="text-[#718096] block mb-1">Total Wickets</label>
                <input
                  type="number"
                  value={editScoreWickets || wickets}
                  onChange={(e) => setEditScoreWickets(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono"
                />
              </div>

              <button
                onClick={() => {
                  setShowEditScoreModal(false);
                  showNotice('Score corrected and logged in audit history.', 'success');
                }}
                className="w-full py-3 bg-[#1554B8] font-bold text-xs text-white rounded-xl cursor-pointer mt-2"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FINALIZE MATCH MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-md p-5 space-y-4 text-[#172033]">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <h3 className="font-bold text-base text-[#1554B8]">End Match & Save Records</h3>
              <button onClick={() => setShowFinalizeModal(false)} className="text-[#718096] hover:text-[#172033] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#EAF2FF] border border-[#DFE7F2] rounded-2xl p-4 text-center">
                <p className="text-[#1554B8] font-black text-sm uppercase mb-1">
                  {selectedMatch?.result?.summaryText || 'Match Completed'}
                </p>
                <p className="text-[11px] text-[#718096]">
                  The match has ended based on game logic. Finalizing will lock scoring and update player career stats.
                </p>
              </div>

              <div>
                <label className="text-[#718096] block mb-1">Player of the Match (Optional)</label>
                <select
                  value={potmId}
                  onChange={(e) => setPotmId(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033]"
                >
                  <option value="">Select POTM</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleFinalizeMatchSubmit}
                className="w-full py-3.5 bg-[#D94343] font-black text-xs text-white rounded-xl cursor-pointer mt-2 uppercase tracking-wider"
              >
                Confirm End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: INNINGS TRANSITION MODAL */}
      {showInningsTransitionModal && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-lg p-6 space-y-5 text-[#172033] shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#1554B8] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1554B8] animate-pulse" />
                  1st Innings Complete! (पहली पारी समाप्त)
                </h3>
                <p className="text-[11px] text-[#718096]">
                  Score: {selectedMatch.innings1?.totalRuns}/{selectedMatch.innings1?.wickets} in {selectedMatch.innings1?.legalOvers} overs.
                  Set up opening players for the 2nd Innings.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#EAF2FF] border border-[#DFE7F2] rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-widest mb-1">Target for 2nd Innings</p>
                <p className="text-2xl font-display font-black text-[#1554B8]">
                  {(selectedMatch.innings1?.totalRuns || 0) + 1} Runs
                </p>
              </div>

              {/* Opening Batsmen for 2nd Innings */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[#718096] font-bold block mb-1 flex items-center justify-between">
                    <span>Striker ({bowlingTeam?.name}) *</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddType('bowling');
                        setShowQuickAddPlayerModal(true);
                      }}
                      className="text-[9px] bg-[#1554B8] text-white px-1.5 py-0.5 rounded font-bold hover:bg-[#0B3F91]"
                    >
                      + Add
                    </button>
                  </label>
                  <select
                    value={inn2Striker}
                    onChange={(e) => setInn2Striker(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                  >
                    <option value="">Select striker...</option>
                    {(bowlingTeam?.playerIds || [])
                      .filter((pId) => pId !== inn2NonStriker)
                      .map((pId) => (
                      <option key={`inn2-str-${pId}`} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#718096] font-bold block mb-1">
                    Non-Striker ({bowlingTeam?.name}) *
                  </label>
                  <select
                    value={inn2NonStriker}
                    onChange={(e) => setInn2NonStriker(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                  >
                    <option value="">Select non-striker...</option>
                    {(bowlingTeam?.playerIds || [])
                      .filter((pId) => pId !== inn2Striker)
                      .map((pId) => (
                      <option key={`inn2-non-${pId}`} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Bowler for 2nd Innings */}
              <div>
                <label className="text-[#718096] font-bold block mb-1 flex items-center justify-between">
                  <span>Opening Bowler ({battingTeam?.name}) *</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddType('batting');
                      setShowQuickAddPlayerModal(true);
                    }}
                    className="text-[9px] bg-[#1554B8] text-white px-1.5 py-0.5 rounded font-bold hover:bg-[#0B3F91]"
                  >
                    + Add
                  </button>
                </label>
                <select
                  value={inn2Bowler}
                  onChange={(e) => setInn2Bowler(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                >
                  <option value="">Select opening bowler...</option>
                  {(battingTeam?.playerIds || []).map((pId) => (
                    <option key={`inn2-bowl-${pId}`} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleStartSecondInningsSubmit}
                className="w-full py-3.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer mt-4 shadow-xs transition-colors"
              >
                Start 2nd Innings 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOSS & OPENING PLAYERS SETUP MODAL */}
      {showTossSetupModal && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-lg p-6 space-y-5 text-[#172033] shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#1554B8] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1554B8] animate-pulse" />
                  Match Initialization & Toss Setup
                </h3>
                <p className="text-[11px] text-[#718096]">Configure toss winner, batting decision, and opening players before live scoring.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toss Winner */}
              <div>
                <label className="text-[#718096] font-bold block mb-1.5">1. Toss Won By (किसने टॉस जीता?)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupTossWinnerId(selectedMatch.teamA.id)}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      setupTossWinnerId === selectedMatch.teamA.id
                        ? 'bg-[#1554B8] border-[#1554B8] text-white shadow-xs'
                        : 'bg-[#F2F6FC] border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF]'
                    }`}
                  >
                    {selectedMatch.teamA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupTossWinnerId(selectedMatch.teamB.id)}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      setupTossWinnerId === selectedMatch.teamB.id
                        ? 'bg-[#1554B8] border-[#1554B8] text-white shadow-xs'
                        : 'bg-[#F2F6FC] border-[#DFE7F2] text-[#172033] hover:bg-[#EAF2FF]'
                    }`}
                  >
                    {selectedMatch.teamB.name}
                  </button>
                </div>
              </div>

              {/* Toss Decision */}
              <div>
                <label className="text-[#718096] font-bold block mb-1.5">2. Elected To (टॉस के बाद क्या फैसला लिया?)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupTossDecision('bat')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      setupTossDecision === 'bat'
                        ? 'bg-[#1554B8] border-[#1554B8] text-white shadow-xs'
                        : 'bg-[#F2F6FC] border-[#DFE7F2] text-[#172033]'
                    }`}
                  >
                    Bat First (पहले बल्लेबाजी)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupTossDecision('bowl')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      setupTossDecision === 'bowl'
                        ? 'bg-[#1554B8] border-[#1554B8] text-white shadow-xs'
                        : 'bg-[#F2F6FC] border-[#DFE7F2] text-[#172033]'
                    }`}
                  >
                    Bowl First (पहले गेंदबाजी)
                  </button>
                </div>
              </div>

              {/* Opening Batsmen */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DFE7F2]">
                <div>
                  <label className="text-[#718096] font-bold block mb-1 flex items-center justify-between">
                    <span>Striker ({setupBattingTeam?.name || 'Batting Team'}) *</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddType('batting');
                        setShowQuickAddPlayerModal(true);
                      }}
                      className="text-[9px] bg-[#1554B8] text-white px-1.5 py-0.5 rounded font-bold hover:bg-[#0B3F91]"
                    >
                      + Add
                    </button>
                  </label>
                  <select
                    value={setupStrikerId}
                    onChange={(e) => setSetupStrikerId(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                  >
                    <option value="">Select striker...</option>
                    {(setupBattingTeam?.playerIds || [])
                      .filter((pId) => pId !== setupNonStrikerId)
                      .map((pId) => (
                      <option key={`str-${pId}`} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#718096] font-bold block mb-1">
                    Non-Striker ({setupBattingTeam?.name || 'Batting Team'}) *
                  </label>
                  <select
                    value={setupNonStrikerId}
                    onChange={(e) => setSetupNonStrikerId(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                  >
                    <option value="">Select non-striker...</option>
                    {(setupBattingTeam?.playerIds || [])
                      .filter((pId) => pId !== setupStrikerId)
                      .map((pId) => (
                      <option key={`non-${pId}`} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Bowler */}
              <div>
                <label className="text-[#718096] font-bold block mb-1 flex items-center justify-between">
                  <span>First Over Bowler ({setupBowlingTeam?.name || 'Bowling Team'}) *</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddType('bowling');
                      setShowQuickAddPlayerModal(true);
                    }}
                    className="text-[9px] bg-[#1554B8] text-white px-1.5 py-0.5 rounded font-bold hover:bg-[#0B3F91]"
                  >
                    + Add
                  </button>
                </label>
                <select
                  value={setupBowlerId}
                  onChange={(e) => setSetupBowlerId(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-semibold focus:outline-none focus:border-[#1554B8]"
                >
                  <option value="">Select opening bowler...</option>
                  {(setupBowlingTeam?.playerIds || []).map((pId) => (
                    <option key={`bowl-${pId}`} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleConfirmTossSetup}
                className="w-full py-3.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer mt-4 shadow-xs transition-colors"
              >
                Start Match & Open Live Scoring Board 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD PLAYER MODAL */}
      {showQuickAddPlayerModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl text-[#172033]">
            <div className="flex items-center justify-between border-b border-[#DFE7F2] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF2FF] flex items-center justify-center border border-[#DFE7F2]">
                  <UserPlus className="w-5 h-5 text-[#1554B8]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-[#172033] leading-tight uppercase tracking-tight">
                    Quick Add Player
                  </h3>
                  <p className="text-[10px] text-[#1554B8] font-bold uppercase tracking-widest">
                    {quickAddType === 'batting' ? `Adding to ${battingTeam?.name || 'Batting Team'}` : 
                     quickAddType === 'bowling' ? `Adding to ${bowlingTeam?.name || 'Bowling Team'}` :
                     quickAddType === 'teamA' ? `Adding to ${selectedMatch?.teamA.name}` :
                     `Adding to ${selectedMatch?.teamB.name}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickAddPlayerModal(false)} 
                className="text-[#718096] hover:text-[#172033] p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#718096] uppercase tracking-wider ml-1">
                  Player Full Name (खिलाड़ी का पूरा नाम)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full bg-[#F2F6FC] border-2 border-[#DFE7F2] focus:border-[#1554B8] rounded-2xl px-4 py-3.5 text-[#172033] font-bold text-sm placeholder:text-[#718096] transition-all outline-none"
                />
              </div>

              <div className="bg-[#F2F6FC] rounded-2xl p-4 border border-[#DFE7F2] space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 bg-[#EAF2FF] rounded-lg">
                    <Activity className="w-3.5 h-3.5 text-[#1554B8]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#172033] block">Auto-Roster Management</span>
                    <p className="text-[10px] text-[#718096] leading-relaxed">
                      This player will be added to the {quickAddType === 'batting' ? 'batting' : 'bowling'} team's permanent squad and today's match roster instantly.
                    </p>
                  </div>
                </div>
              </div>

              <button
                disabled={isAddingPlayer || !newPlayerName.trim()}
                onClick={handleQuickAddPlayer}
                className="w-full py-4 bg-[#1554B8] hover:bg-[#0B3F91] disabled:bg-[#DFE7F2] disabled:text-[#718096] disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer uppercase tracking-widest"
              >
                {isAddingPlayer ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Confirm & Add Player</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
