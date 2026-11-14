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
  subscribeSingleMatch,
  recordToss,
  updateMatch,
} from '../services/matchService';
import { createPlayer } from '../services/playerService';
import {
  formatOvers,
  calculateRunRate,
  calculateStrikeRate,
  calculateEconomy,
  getNextStrikeState,
  buildInningsSummary,
} from '../lib/cricketEngine';
import { useAuth } from '../context/AuthContext';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  ChevronDown,
  Activity,
  Check,
  UserPlus,
  UserCheck,
  PlusCircle,
  Target,
  ArrowLeft,
  Settings,
  UserMinus,
  RefreshCw,
  Flag,
  PieChart,
  ListOrdered,
  BarChart2,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { runOverDiagnosticTest, DiagnosticTestReport } from '../utils/diagnosticTest';
import {
  saveScoringDraft,
  loadScoringDraft,
  clearScoringDraft,
  saveActiveScoringMatchId,
  clearActiveScoringMatchId,
} from '../utils/draftStorage';

interface ScoringPadProps {
  match: CricketMatch;
  players: Player[];
  onClose: () => void;
  onRefreshMatch?: () => void;
}

export const ScoringPad: React.FC<ScoringPadProps> = ({
  match: initialMatch,
  players: initialPlayers,
  onClose,
}) => {
  const { currentUser } = useAuth();

  // Live match subscription
  const [liveMatch, setLiveMatch] = useState<CricketMatch>(initialMatch);
  useEffect(() => {
    const unsub = subscribeSingleMatch(initialMatch.id, (data) => {
      if (data) setLiveMatch(data);
    });
    return () => unsub();
  }, [initialMatch.id]);

  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isOnline = useOnlineStatus();

  // Toss State
  const [tossWinner, setTossWinner] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.tossWinner || initialMatch.teamA.id;
  });
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.tossDecision || 'bat';
  });

  // Striker, Non-striker, Bowler selection
  const [strikerId, setStrikerId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.strikerId || initialMatch.currentStrikerId || '';
  });
  const [nonStrikerId, setNonStrikerId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.nonStrikerId ?? initialMatch.currentNonStrikerId ?? '';
  });
  const [bowlerId, setBowlerId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.bowlerId || initialMatch.currentBowlerId || '';
  });

  // Opening Match Setup Modal State (Toss, Opener Batter, Opener Bowler, Overs)
  const [showOpeningSetupModal, setShowOpeningSetupModal] = useState<boolean>(() => {
    return !initialMatch.toss || (initialMatch.currentInnings === 1 && !initialMatch.currentStrikerId);
  });
  const [matchOversSetup, setMatchOversSetup] = useState<number>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.matchOversSetup || initialMatch.oversPerInnings || 10;
  });

  // Over Completion Next Bowler Selection Modal State
  const [showSelectNextBowlerModal, setShowSelectNextBowlerModal] = useState(false);
  const [nextBowlerSelectionId, setNextBowlerSelectionId] = useState('');
  const [lastCompletedOverNumber, setLastCompletedOverNumber] = useState<number>(0);

  // Quick Add Player Modal State (Mid-match player addition)
  const [showQuickAddPlayerModal, setShowQuickAddPlayerModal] = useState(false);
  const [quickPlayerName, setQuickPlayerName] = useState('');
  const [quickPlayerRole, setQuickPlayerRole] = useState<'top_order_batter' | 'pace_bowler' | 'spin_bowler' | 'batting_allrounder'>('top_order_batter');
  const [quickPlayerTeamId, setQuickPlayerTeamId] = useState<string>('');
  const [quickPlayerJersey, setQuickPlayerJersey] = useState('');
  const [isAddingQuickPlayer, setIsAddingQuickPlayer] = useState(false);

  // Modals for complex scoring
  const [showWicketModal, setShowWicketModal] = useState<boolean>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return Boolean(draft?.showWicketModal ?? draft?.dismissedPlayerId);
  });
  const [wicketType, setWicketType] = useState<WicketType>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return (draft?.wicketType as WicketType) || 'caught';
  });
  const [dismissedPlayerId, setDismissedPlayerId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.dismissedPlayerId || '';
  });
  const [fielderId, setFielderId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.fielderId || '';
  });
  const [newBatterId, setNewBatterId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.newBatterId || '';
  });

  // Extras modal
  const [showExtrasModal, setShowExtrasModal] = useState<boolean>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return Boolean(draft?.showExtrasModal ?? draft?.selectedExtraType);
  });
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return (draft?.selectedExtraType as ExtraType) || 'wide';
  });
  const [extraBoundaryRuns, setExtraBoundaryRuns] = useState<number>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.extraBoundaryRuns || 0;
  });

  // Match finalization modal
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return Boolean(draft?.showFinalizeModal);
  });
  const [potmId, setPotmId] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.potmId || '';
  });

  // Inning transition modal
  const [showInningsTransitionModal, setShowInningsTransitionModal] = useState<boolean>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return Boolean(draft?.showInningsTransitionModal ?? (draft?.inn2Striker || draft?.inn2Bowler));
  });
  const [inn2Striker, setInn2Striker] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.inn2Striker || '';
  });
  const [inn2NonStriker, setInn2NonStriker] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.inn2NonStriker || '';
  });
  const [inn2Bowler, setInn2Bowler] = useState<string>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return draft?.inn2Bowler || '';
  });
  const [padNotice, setPadNotice] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'scoring' | 'scorecard' | 'overs' | 'stats' | 'settings'>(() => {
    const draft = loadScoringDraft(initialMatch.id);
    return (draft?.activeTab as any) || 'scoring';
  });

  // Diagnostic Over Test State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticTestReport | null>(null);

  const handleRunDiagnosticTest = () => {
    const report = runOverDiagnosticTest(liveMatch.rules);
    setDiagnosticReport(report);
    setShowDiagnosticModal(true);
  };

  const showNotice = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setPadNotice({ type, message });
    setTimeout(() => setPadNotice(null), 3500);
  };

  useEffect(() => {
    saveActiveScoringMatchId(liveMatch.id);
  }, [liveMatch.id]);

  // Auto-save scoring draft to localStorage every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveScoringDraft(liveMatch.id, {
        strikerId,
        nonStrikerId,
        bowlerId,
        tossWinner,
        tossDecision,
        showWicketModal,
        dismissedPlayerId,
        wicketType,
        fielderId,
        newBatterId,
        showExtrasModal,
        selectedExtraType,
        extraBoundaryRuns,
        showInningsTransitionModal,
        inn2Striker,
        inn2NonStriker,
        inn2Bowler,
        showFinalizeModal,
        potmId,
        matchOversSetup,
        activeTab,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [
    liveMatch.id,
    strikerId,
    nonStrikerId,
    bowlerId,
    tossWinner,
    tossDecision,
    showWicketModal,
    dismissedPlayerId,
    wicketType,
    fielderId,
    newBatterId,
    showExtrasModal,
    selectedExtraType,
    extraBoundaryRuns,
    showInningsTransitionModal,
    inn2Striker,
    inn2NonStriker,
    inn2Bowler,
    showFinalizeModal,
    potmId,
    matchOversSetup,
    activeTab,
  ]);

  // Map of players for quick lookup
  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    initialPlayers.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [initialPlayers]);

  // Real-time listener for current innings balls
  useEffect(() => {
    const unsub = subscribeBalls(liveMatch.id, liveMatch.currentInnings, (newBalls) => {
      setBalls(newBalls);
    });
    return () => unsub();
  }, [liveMatch.id, liveMatch.currentInnings]);

  // Identify batting and bowling teams
  const battingTeam = useMemo(() => {
    if (!liveMatch.toss) return liveMatch.teamA;
    const battingFirstId =
      liveMatch.toss.decision === 'bat'
        ? liveMatch.toss.winnerTeamId
        : liveMatch.toss.winnerTeamId === liveMatch.teamA.id
        ? liveMatch.teamB.id
        : liveMatch.teamA.id;

    if (liveMatch.currentInnings === 1) {
      return battingFirstId === liveMatch.teamA.id ? liveMatch.teamA : liveMatch.teamB;
    } else {
      return battingFirstId === liveMatch.teamA.id ? liveMatch.teamB : liveMatch.teamA;
    }
  }, [liveMatch]);

  const bowlingTeam = useMemo(() => {
    return battingTeam.id === liveMatch.teamA.id ? liveMatch.teamB : liveMatch.teamA;
  }, [battingTeam, liveMatch]);

  // DYNAMIC REAL-TIME INNINGS SUMMARY COMPUTATION FROM BALLS
  const currentInningsSummary = useMemo(() => {
    if (balls.length > 0) {
      return buildInningsSummary(
        balls,
        battingTeam.id,
        battingTeam.name,
        playersMap,
        liveMatch.rules,
        liveMatch.oversPerInnings,
        liveMatch.currentInnings === 2 ? liveMatch.targetRuns : undefined
      );
    }
    return liveMatch.currentInnings === 1 ? liveMatch.innings1 : liveMatch.innings2;
  }, [balls, battingTeam, playersMap, liveMatch]);

  // Default initial batsman and bowler on load
  useEffect(() => {
    if (!strikerId && battingTeam.playerIds.length >= 1) {
      setStrikerId(battingTeam.playerIds[0]);
    }
    if (!nonStrikerId && nonStrikerId !== 'none' && battingTeam.playerIds.length >= 2) {
      setNonStrikerId(battingTeam.playerIds[1]);
    }
    if (!bowlerId && bowlingTeam.playerIds.length >= 1) {
      setBowlerId(bowlingTeam.playerIds[0]);
    }
  }, [battingTeam, bowlingTeam, strikerId, nonStrikerId, bowlerId]);

  // Eligible available batters for selection
  const remainingBatters = useMemo(() => {
    const alreadyBattedIds = new Set(
      Object.keys(currentInningsSummary?.batters || {}).filter(
        (id) => currentInningsSummary?.batters[id]?.isOut
      )
    );
    alreadyBattedIds.add(strikerId);
    if (nonStrikerId !== 'none') alreadyBattedIds.add(nonStrikerId);
    return battingTeam.playerIds.filter((pId) => !alreadyBattedIds.has(pId));
  }, [battingTeam, currentInningsSummary, strikerId, nonStrikerId]);

  // Mid-Match Quick Add Player Handler
  const handleQuickAddPlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlayerName.trim()) {
      showNotice('Please enter player name.');
      return;
    }
    const targetTeamId = quickPlayerTeamId || battingTeam.id;

    setIsAddingQuickPlayer(true);
    try {
      const newId = `player_quick_${Date.now()}`;
      const jerseyNum = parseInt(quickPlayerJersey, 10) || Math.floor(Math.random() * 90) + 10;
      const teamName = targetTeamId === liveMatch.teamA.id ? liveMatch.teamA.name : liveMatch.teamB.name;

      const newPlayer: Omit<Player, 'career' | 'registrationDate'> = {
        id: newId,
        fullName: quickPlayerName.trim(),
        playingRole: quickPlayerRole,
        battingStyle: 'right_hand_bat',
        bowlingStyle: 'right_arm_spin',
        jerseyNumber: jerseyNum,
        teamName,
        verificationStatus: 'verified',
        status: 'active',
      };

      await createPlayer(newPlayer);

      // Add new player ID to team roster in match
      if (targetTeamId === liveMatch.teamA.id) {
        const updatedPlayerIds = [...liveMatch.teamA.playerIds, newId];
        await updateMatch(liveMatch.id, {
          teamA: { ...liveMatch.teamA, playerIds: updatedPlayerIds },
        });
      } else {
        const updatedPlayerIds = [...liveMatch.teamB.playerIds, newId];
        await updateMatch(liveMatch.id, {
          teamB: { ...liveMatch.teamB, playerIds: updatedPlayerIds },
        });
      }

      showNotice(`Player "${quickPlayerName.trim()}" added to ${teamName}!`, 'success');

      // Auto-select as non-striker or bowler if currently empty or requested
      if (targetTeamId === battingTeam.id) {
        if (!nonStrikerId || nonStrikerId === 'none') {
          setNonStrikerId(newId);
        }
      } else {
        if (!bowlerId) {
          setBowlerId(newId);
        }
      }

      setShowQuickAddPlayerModal(false);
      setQuickPlayerName('');
      setQuickPlayerJersey('');
    } catch (err) {
      console.error('Quick add player error:', err);
      showNotice('Could not add player to match.', 'error');
    } finally {
      setIsAddingQuickPlayer(false);
    }
  };

  // Confirm Next Bowler Handler after Over Completion
  const handleConfirmNextBowler = () => {
    if (!nextBowlerSelectionId) {
      showNotice('Please select the next bowler.');
      return;
    }
    setBowlerId(nextBowlerSelectionId);
    setShowSelectNextBowlerModal(false);
    const bowlerName = playersMap[nextBowlerSelectionId]?.fullName || nextBowlerSelectionId;
    showNotice(`Over ${lastCompletedOverNumber} complete! ${bowlerName} will bowl the next over.`, 'success');
  };

  // Record delivery helper
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
    if (!strikerId) {
      showNotice('Please select striker before scoring.');
      return;
    }
    if (nonStrikerId !== 'none' && !nonStrikerId) {
      showNotice('Please select non-striker or enable Single Batter mode.');
      return;
    }
    if (!bowlerId) {
      showNotice('Please select bowler before scoring.');
      return;
    }

    if (liveMatch.status === 'completed') {
      showNotice('This match has been finalized.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const ballsPerOver = liveMatch.rules.legalBallsPerOver || 6;
      const isLegal = extraType !== 'wide' && extraType !== 'noBall';

      let totalExtraRuns = 0;
      if (extraType === 'wide') {
        totalExtraRuns = (liveMatch.rules.wideRuns || 1) + extraRunsToAdd;
      } else if (extraType === 'noBall') {
        totalExtraRuns = (liveMatch.rules.noBallRuns || 1) + extraRunsToAdd;
      } else if (extraType === 'bye' || extraType === 'legBye') {
        totalExtraRuns = extraRunsToAdd || 1;
      }

      const totalRunsOnBall = runsOffBat + totalExtraRuns;
      const nextBallNumber = balls.length + 1;
      const currentLegalBalls = currentInningsSummary?.legalBalls || 0;
      const ballInOver = isLegal ? (currentLegalBalls % ballsPerOver) + 1 : currentLegalBalls % ballsPerOver || ballsPerOver;
      const overNumber = Math.floor(currentLegalBalls / ballsPerOver);

      const ballEvent: BallEvent = {
        id: `ball_${liveMatch.currentInnings}_${Date.now()}_${nextBallNumber}`,
        matchId: liveMatch.id,
        innings: liveMatch.currentInnings,
        overNumber,
        ballInOver,
        bowlerId,
        strikerId,
        nonStrikerId: nonStrikerId === 'none' ? 'none' : nonStrikerId,
        runsBatter: runsOffBat,
        extraType,
        extraRuns: totalExtraRuns,
        isLegal,
        isWicket,
        totalRunsOnBall,
        timestamp: new Date().toISOString(),
      };

      const legalBallsCount = balls.filter((b) => b.isLegal).length;
      const isLegalOverComplete = isLegal && (legalBallsCount + 1) % ballsPerOver === 0;

      const runsCompletedByRunning =
        runsOffBat + (extraType === 'bye' || extraType === 'legBye' ? totalExtraRuns : extraRunsToAdd);

      const { nextStrikerId, nextNonStrikerId } = getNextStrikeState(
        ballEvent,
        strikerId,
        nonStrikerId,
        runsCompletedByRunning,
        extraType === 'wide' || extraType === 'noBall',
        isLegalOverComplete,
        wicketInfo?.dismissedPlayerId,
        newIncomingBatterId
      );

      if (isWicket && wicketInfo) {
        ballEvent.wicketDetails = {
          type: wicketInfo.type,
          dismissedPlayerId: wicketInfo.dismissedPlayerId,
          bowlerId,
          fielderId: wicketInfo.fielderId || null,
          newBatterId: newIncomingBatterId || null,
        };
      }

      await addBallEvent(liveMatch, ballEvent, playersMap, nextStrikerId, nextNonStrikerId);

      setStrikerId(nextStrikerId);
      setNonStrikerId(nextNonStrikerId);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      // Trigger Over Completion Bowler Selection Modal immediately as soon as over completes
      if (isLegalOverComplete) {
        const completedOverNum = Math.floor((legalBallsCount + 1) / ballsPerOver);
        setLastCompletedOverNumber(completedOverNum);
        const nextSuggestedBowler = bowlingTeam.playerIds.find((id) => id !== bowlerId) || bowlerId;
        setNextBowlerSelectionId(nextSuggestedBowler);
        setShowSelectNextBowlerModal(true);
      }
    } catch (err) {
      console.error('Error scoring ball:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Undo last ball
  const handleUndo = async () => {
    if (balls.length === 0) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await undoLastBallEvent(liveMatch, playersMap);
      setSaveStatus('saved');
      showNotice('Last delivery was undone. Scoreboard updated.', 'info');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Undo error:', err);
      showNotice('Could not undo delivery.', 'error');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Record Toss & Opening Selection Setup
  const handleSaveOpeningSetup = async () => {
    try {
      const numOvers = matchOversSetup > 0 ? matchOversSetup : liveMatch.oversPerInnings;
      await recordToss(liveMatch.id, {
        winnerTeamId: tossWinner,
        decision: tossDecision,
      });

      const updates: Partial<CricketMatch> = {
        oversPerInnings: numOvers,
        currentStrikerId: strikerId || undefined,
        currentNonStrikerId: nonStrikerId === 'none' ? 'none' : nonStrikerId || undefined,
        currentBowlerId: bowlerId || undefined,
        rules: {
          ...liveMatch.rules,
          maxWickets: Math.max(1, (liveMatch.playersPerTeam || 11) - 1),
        },
      };

      await updateMatch(liveMatch.id, updates);
      setShowOpeningSetupModal(false);
      showNotice('ओपनिंग बैट्समैन, बॉलर एवं ओवर सेटअप सेव हो गया! (Opening setup saved)', 'success');
    } catch (err) {
      console.error('Opening setup save error:', err);
      showNotice('Could not save opening setup.', 'error');
    }
  };

  // Wicket Submit Handler
  const handleWicketSubmit = async () => {
    const targetDismissedId = dismissedPlayerId || strikerId;
    if (!targetDismissedId) {
      showNotice('Please select which player was dismissed.');
      return;
    }

    const currentWickets = (currentInningsSummary?.wickets || 0) + 1;
    const totalTeamBatters = battingTeam.playerIds.length;
    const isAllOut = currentWickets >= totalTeamBatters;

    // Require selecting an incoming batter only if unbatted players are available
    if (!isAllOut && remainingBatters.length > 0 && !newBatterId) {
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
    if (remainingBatters.length === 0 && !isAllOut) {
      showNotice(`${dismissedName} out! Single Batter Mode activated for last surviving player.`, 'info');
    } else {
      showNotice(`${dismissedName} dismissed (${wicketType}). Scoreboard updated.`, 'success');
    }

    setShowWicketModal(false);
    setDismissedPlayerId('');
    setFielderId('');
    setNewBatterId('');
  };

  // Extras Submit Handler
  const handleExtrasSubmit = async () => {
    await handleScoreBall(
      selectedExtraType === 'noBall' ? extraBoundaryRuns : 0,
      selectedExtraType,
      selectedExtraType === 'wide' ? extraBoundaryRuns : 0
    );
    setShowExtrasModal(false);
    setExtraBoundaryRuns(0);
  };

  // Transition to 2nd Innings
  const handleStartInnings2 = async () => {
    if (!inn2Striker || (!inn2NonStriker && inn2NonStriker !== 'none') || !inn2Bowler) {
      showNotice('Please select opening batsmen and opening bowler for 2nd innings.');
      return;
    }

    try {
      await startSecondInnings(liveMatch, inn2Striker, inn2NonStriker, inn2Bowler);
      setStrikerId(inn2Striker);
      setNonStrikerId(inn2NonStriker);
      setBowlerId(inn2Bowler);
      setShowInningsTransitionModal(false);
      showNotice('Second innings started!', 'success');
    } catch (err) {
      console.error('Error starting second innings:', err);
      showNotice('Could not start second innings.', 'error');
    }
  };

  // Finalize Match Result
  const handleFinalize = async () => {
    if (!currentUser) return;
    try {
      if (liveMatch.result) {
        await finalizeMatch(
          liveMatch,
          {
            ...liveMatch.result,
            playerOfTheMatchId: potmId || undefined,
          },
          currentUser.uid,
          currentUser.displayName || 'Admin'
        );
        clearScoringDraft(liveMatch.id);
        clearActiveScoringMatchId();
        setShowFinalizeModal(false);
        showNotice('Match finalized! Career player stats updated.', 'success');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      console.error('Error finalizing match:', err);
      showNotice('Could not finalize match result.', 'error');
    }
  };

  const handleClose = () => {
    clearActiveScoringMatchId();
    onClose();
  };

  // Calculations for real-time display
  const totalRuns = currentInningsSummary?.totalRuns || 0;
  const wickets = currentInningsSummary?.wickets || 0;
  const legalBalls = currentInningsSummary?.legalBalls || 0;
  const oversStr = formatOvers(legalBalls, liveMatch.rules.legalBallsPerOver);
  const currentRR = calculateRunRate(totalRuns, legalBalls, liveMatch.rules.legalBallsPerOver);

  const remainingBallsInMatch = Math.max(0, (liveMatch.oversPerInnings * liveMatch.rules.legalBallsPerOver) - legalBalls);
  const runsNeeded = liveMatch.targetRuns ? Math.max(0, liveMatch.targetRuns - totalRuns) : null;
  const requiredRunRate = runsNeeded !== null && remainingBallsInMatch > 0
    ? ((runsNeeded / remainingBallsInMatch) * liveMatch.rules.legalBallsPerOver).toFixed(2)
    : '-';

  const getTeamInitials = (name: string) => {
    if (!name) return 'XI';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  };

  const currentOverBalls = useMemo(() => {
    if (balls.length === 0) return [];
    const lastBall = balls[balls.length - 1];
    const currentOverNum = lastBall ? lastBall.overNumber : 0;
    return balls.filter((b) => b.overNumber === currentOverNum && b.innings === liveMatch.currentInnings);
  }, [balls, liveMatch.currentInnings]);

  const strikerStat = currentInningsSummary?.batters[strikerId];
  const nonStrikerStat = nonStrikerId !== 'none' ? currentInningsSummary?.batters[nonStrikerId] : null;
  const bowlerStat = currentInningsSummary?.bowlers[bowlerId];

  // Recent 8 balls
  const recentBalls = balls.slice(-8);

  return (
    <div className="fixed inset-0 z-50 bg-[#031B33] text-white flex flex-col overflow-y-auto font-sans pt-safe select-none">
      {/* ================= TOP HEADER ================= */}
      <div className="sticky top-0 z-30 bg-[#051E3C] border-b border-[#0C325E] px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shadow-md">
        <button
          onClick={handleClose}
          aria-label="Close Scoring Pad"
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 text-center truncate px-2">
          <h2 className="font-sans font-bold text-sm sm:text-base tracking-tight leading-tight truncate text-white flex items-center justify-center gap-2">
            Live Scoring
            {saveStatus !== 'idle' && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${
                saveStatus === 'saving' ? 'bg-white/20 text-white' : 
                saveStatus === 'saved' ? 'bg-green-400 text-[#003626]' : 
                'bg-red-500 text-white'
              }`}>
                {saveStatus === 'saving' ? 'Syncing...' : 
                 saveStatus === 'saved' ? (isOnline ? 'Saved' : 'Stored Offline') : 
                 'Error'}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-[#70A5D8] font-mono leading-tight mt-0.5 truncate">
            {liveMatch.title} • Innings {liveMatch.currentInnings}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold shadow-xs">
              <WifiOff className="w-3 h-3" />
              OFFLINE
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF2A4B] text-white font-mono text-[10px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            LIVE
          </span>

          <button
            onClick={() => setShowOpeningSetupModal(true)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
            title="Settings & Opening Setup"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Notification Banner */}
      {padNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#DFE7F2] text-[#172033] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between gap-3 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              padNotice.type === 'error' ? 'bg-[#D94343]' : padNotice.type === 'success' ? 'bg-[#21864A]' : 'bg-[#1554B8]'
            }`} />
            <span>{padNotice.message}</span>
          </div>
          <button
            onClick={() => setPadNotice(null)}
            className="text-xs text-[#718096] hover:text-[#172033] cursor-pointer px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto w-full p-3 sm:p-4 space-y-3.5 flex-1 pb-24">
        {/* TOSS INITIALIZATION MODAL WHEN MATCH TRANSITIONS TO LIVE */}
        {!liveMatch.toss && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-[#07264A] border border-[#154476] rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-[#154476] pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#1B80E4]" />
                  <h3 className="font-display font-bold text-lg text-white">
                    Match Toss & Setup (टॉस इनिशियलाइजेशन)
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[#70A5D8]">
                यह मैच अभी 'Scheduled' से 'Live' हो रहा है। कृपया टॉस का परिणाम दर्ज करें ताकि स्कोरिंग शुरू हो सके।
              </p>

              <div className="space-y-3 text-xs">
                <div className="bg-[#0A315C] p-3 rounded-2xl border border-[#184B82] space-y-1.5">
                  <label className="text-white font-bold block">Toss Winner (टॉस किसने जीता?)</label>
                  <select
                    value={tossWinner}
                    onChange={(e) => setTossWinner(e.target.value)}
                    className="w-full bg-[#07264A] border border-[#154476] rounded-xl px-3 py-2 text-white font-bold text-sm"
                  >
                    <option value={liveMatch.teamA.id}>{liveMatch.teamA.name}</option>
                    <option value={liveMatch.teamB.id}>{liveMatch.teamB.name}</option>
                  </select>
                </div>

                <div className="bg-[#0A315C] p-3 rounded-2xl border border-[#184B82] space-y-1.5">
                  <label className="text-white font-bold block">Decision (टॉस जीतकर क्या किया?)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTossDecision('bat')}
                      className={`py-2.5 text-xs font-bold rounded-xl border cursor-pointer ${
                        tossDecision === 'bat'
                          ? 'bg-[#1B80E4] text-white border-[#1B80E4]'
                          : 'bg-[#07264A] text-[#70A5D8] border-[#154476]'
                      }`}
                    >
                      Bat First (पहले बैटिंग)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossDecision('bowl')}
                      className={`py-2.5 text-xs font-bold rounded-xl border cursor-pointer ${
                        tossDecision === 'bowl'
                          ? 'bg-[#1B80E4] text-white border-[#1B80E4]'
                          : 'bg-[#07264A] text-[#70A5D8] border-[#154476]'
                      }`}
                    >
                      Bowl First (पहले बॉलिंग)
                    </button>
                  </div>
                </div>

                <div className="bg-[#0A315C] p-3 rounded-2xl border border-[#184B82] space-y-2">
                  <label className="text-white font-bold block">Opening Batters & Bowler</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-[#70A5D8] block mb-1">Striker:</span>
                      <select
                        value={strikerId}
                        onChange={(e) => setStrikerId(e.target.value)}
                        className="w-full bg-[#07264A] border border-[#154476] rounded-xl px-2 py-1.5 text-white font-bold text-xs"
                      >
                        {battingTeam.playerIds.map((pId) => (
                          <option key={pId} value={pId}>
                            {playersMap[pId]?.fullName || pId}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#70A5D8] block mb-1">Bowler:</span>
                      <select
                        value={bowlerId}
                        onChange={(e) => setBowlerId(e.target.value)}
                        className="w-full bg-[#07264A] border border-[#154476] rounded-xl px-2 py-1.5 text-white font-bold text-xs"
                      >
                        {bowlingTeam.playerIds.map((pId) => (
                          <option key={pId} value={pId}>
                            {playersMap[pId]?.fullName || pId}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveOpeningSetup}
                  className="w-full py-3 bg-[#1B80E4] hover:bg-[#156DC4] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Check className="w-5 h-5" />
                  <span>Confirm Toss & Start Live Match (टॉस सेव करें)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {liveMatch.toss && (
          <>
            {/* ================= TEAM PILLS HEADER BAR ================= */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 bg-[#052044] border border-[#0D386B] rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-sm">
                <span className="w-7 h-7 rounded-full bg-[#0084FF] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                  {getTeamInitials(liveMatch.teamA.name)}
                </span>
                <span className="font-bold text-xs text-white truncate">{liveMatch.teamA.name}</span>
              </div>

              <div className="px-3 py-1 bg-[#0A2D58] border border-[#0D386B] text-[#8CA3BF] text-xs font-black rounded-full font-mono shrink-0">
                VS
              </div>

              <div className="flex-1 bg-[#052044] border border-[#0D386B] rounded-2xl px-3 py-2 flex items-center justify-end gap-2.5 shadow-sm text-right">
                <span className="font-bold text-xs text-white truncate">{liveMatch.teamB.name}</span>
                <span className="w-7 h-7 rounded-full bg-[#FFD600] text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                  {getTeamInitials(liveMatch.teamB.name)}
                </span>
              </div>
            </div>

            {/* ================= MAIN REAL-TIME SCOREBOARD CARD ================= */}
            <div className="bg-[#052044] rounded-2xl p-4 text-white border border-[#0D386B] shadow-lg space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-[#8CA3BF] font-mono font-bold uppercase tracking-wider block">
                    TOTAL SCORE
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-black text-3xl sm:text-4xl text-[#80FF00] tracking-tight tabular-nums">
                      {totalRuns}-{wickets}
                    </span>
                    <span className="font-mono text-lg text-white font-bold tabular-nums">
                      ({oversStr})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#8CA3BF] font-mono uppercase font-semibold block">
                    Innings {liveMatch.currentInnings}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[120px] block">
                    {battingTeam.name}
                  </span>
                </div>
              </div>

              {/* STATS METRICS ROW */}
              <div className="grid grid-cols-3 gap-2 border-t border-[#0D386B] pt-3 text-center font-mono">
                <div className="border-r border-[#0D386B] pr-2">
                  <span className="text-[10px] text-[#8CA3BF] uppercase font-bold block">CRR</span>
                  <span className="text-base font-black text-white leading-tight">{currentRR}</span>
                </div>

                <div className="border-r border-[#0D386B] px-2">
                  <span className="text-[10px] text-[#8CA3BF] uppercase font-bold block">TARGET</span>
                  <span className="text-base font-black text-white leading-tight">
                    {liveMatch.targetRuns || '-'}
                  </span>
                </div>

                <div className="pl-2">
                  <span className="text-[10px] text-[#8CA3BF] uppercase font-bold block">REQ. RR</span>
                  <span className="text-base font-black text-white leading-tight">
                    {requiredRunRate}
                  </span>
                </div>
              </div>
            </div>

            {/* ================= PILL NAVIGATION TABS ================= */}
            <div className="bg-[#052044] border border-[#0D386B] rounded-2xl p-1 grid grid-cols-5 gap-1 text-xs font-bold text-center">
              {[
                { id: 'scoring' as const, label: 'Scoring' },
                { id: 'scorecard' as const, label: 'Scorecard' },
                { id: 'overs' as const, label: 'Overs' },
                { id: 'stats' as const, label: 'Stats' },
                { id: 'settings' as const, label: 'Settings' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 rounded-xl transition-all cursor-pointer truncate ${
                      isActive
                        ? 'bg-[#0084FF] text-white font-extrabold shadow-md'
                        : 'text-[#8CA3BF] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ================= TAB 1: SCORING ================= */}
            {activeTab === 'scoring' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* BATSMEN & BOWLER STATUS TABLES */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* BATSMEN TABLE CARD */}
                  <div className="bg-[#052044] rounded-2xl p-2.5 border border-[#0D386B] space-y-2 text-xs shadow-md">
                    <div className="grid grid-cols-6 text-[10px] text-[#8CA3BF] font-bold uppercase tracking-wider border-b border-[#0D386B] pb-1.5 font-mono">
                      <span className="col-span-2 text-left text-[#8CA3BF]">BATSMEN</span>
                      <span className="text-center">R</span>
                      <span className="text-center">B</span>
                      <span className="text-center">4S</span>
                      <span className="text-center">6S</span>
                      <span className="text-right">SR</span>
                    </div>

                    {/* Striker Row */}
                    <div className="grid grid-cols-6 items-center py-1 text-xs font-mono border-b border-[#0D386B]/50">
                      <div className="col-span-2 flex items-center gap-1 min-w-0 pr-1">
                        <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0" />
                        <select
                          value={strikerId}
                          onChange={(e) => setStrikerId(e.target.value)}
                          className="bg-transparent text-white font-bold text-xs truncate focus:outline-none cursor-pointer w-full"
                        >
                          {battingTeam.playerIds.map((pId) => (
                            <option key={pId} value={pId} className="bg-[#052044] text-white">
                              {playersMap[pId]?.fullName || pId}*
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-center font-bold text-white">{strikerStat?.runs || 0}</span>
                      <span className="text-center text-slate-200">{strikerStat?.balls || 0}</span>
                      <span className="text-center text-slate-200">{strikerStat?.fours || 0}</span>
                      <span className="text-center text-slate-200">{strikerStat?.sixes || 0}</span>
                      <span className="text-right font-bold text-[#FFD600]">
                        {calculateStrikeRate(strikerStat?.runs || 0, strikerStat?.balls || 0)}
                      </span>
                    </div>

                    {/* Non-Striker Row */}
                    <div className="grid grid-cols-6 items-center py-1 text-xs font-mono">
                      <div className="col-span-2 flex items-center gap-1 min-w-0 pr-1">
                        <span className="w-2 h-2 rounded-full bg-[#8CA3BF] shrink-0" />
                        {nonStrikerId === 'none' ? (
                          <span className="text-[#FF9800] font-bold text-[11px] truncate">Solo</span>
                        ) : (
                          <select
                            value={nonStrikerId}
                            onChange={(e) => setNonStrikerId(e.target.value)}
                            className="bg-transparent text-white font-semibold text-xs truncate focus:outline-none cursor-pointer w-full"
                          >
                            <option value="none" className="bg-[#052044] text-[#FF9800]">
                              -- Solo --
                            </option>
                            {battingTeam.playerIds.map((pId) => (
                              <option key={pId} value={pId} className="bg-[#052044] text-white">
                                {playersMap[pId]?.fullName || pId}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <span className="text-center font-bold text-white">
                        {nonStrikerId !== 'none' ? nonStrikerStat?.runs || 0 : '-'}
                      </span>
                      <span className="text-center text-slate-200">
                        {nonStrikerId !== 'none' ? nonStrikerStat?.balls || 0 : '-'}
                      </span>
                      <span className="text-center text-slate-200">
                        {nonStrikerId !== 'none' ? nonStrikerStat?.fours || 0 : '-'}
                      </span>
                      <span className="text-center text-slate-200">
                        {nonStrikerId !== 'none' ? nonStrikerStat?.sixes || 0 : '-'}
                      </span>
                      <span className="text-right text-white">
                        {nonStrikerId !== 'none'
                          ? calculateStrikeRate(nonStrikerStat?.runs || 0, nonStrikerStat?.balls || 0)
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* BOWLER TABLE CARD */}
                  <div className="bg-[#052044] rounded-2xl p-2.5 border border-[#0D386B] space-y-2 text-xs shadow-md">
                    <div className="grid grid-cols-6 text-[10px] text-[#8CA3BF] font-bold uppercase tracking-wider border-b border-[#0D386B] pb-1.5 font-mono">
                      <span className="col-span-2 text-left text-[#8CA3BF]">BOWLER</span>
                      <span className="text-center">O</span>
                      <span className="text-center">M</span>
                      <span className="text-center">R</span>
                      <span className="text-center">W</span>
                      <span className="text-right">ER</span>
                    </div>

                    <div className="grid grid-cols-6 items-center py-1 text-xs font-mono">
                      <div className="col-span-2 flex items-center gap-1 min-w-0 pr-1">
                        <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0" />
                        <select
                          value={bowlerId}
                          onChange={(e) => setBowlerId(e.target.value)}
                          className="bg-transparent text-white font-bold text-xs truncate focus:outline-none cursor-pointer w-full"
                        >
                          {bowlingTeam.playerIds.map((pId) => (
                            <option key={pId} value={pId} className="bg-[#052044] text-white">
                              {playersMap[pId]?.fullName || pId}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-center text-slate-200">
                        {formatOvers(bowlerStat?.balls || 0, liveMatch.rules.legalBallsPerOver)}
                      </span>
                      <span className="text-center text-slate-200">{bowlerStat?.maidens || 0}</span>
                      <span className="text-center text-slate-200">{bowlerStat?.runsConceded || 0}</span>
                      <span className="text-center font-bold text-[#00FF66]">{bowlerStat?.wickets || 0}</span>
                      <span className="text-right text-white">
                        {calculateEconomy(bowlerStat?.runsConceded || 0, bowlerStat?.balls || 0, liveMatch.rules.legalBallsPerOver)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RECENT BALLS & THIS OVER CARDS */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* RECENT BALLS CARD */}
                  <div className="bg-[#052044] rounded-2xl p-2.5 border border-[#0D386B] space-y-2 shadow-md">
                    <div className="text-[10px] text-[#8CA3BF] font-bold uppercase tracking-wider font-mono">
                      RECENT BALLS
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {recentBalls.length === 0 ? (
                        <span className="text-xs text-[#8CA3BF] italic">No balls</span>
                      ) : (
                        recentBalls.map((b) => {
                          let label = `${b.runsBatter}`;
                          let bgClass = 'bg-[#0A3970] border-[#145296] text-white';

                          if (b.isWicket) {
                            label = 'W';
                            bgClass = 'bg-[#FF2A4B] border-red-400 text-white font-black';
                          } else if (b.extraType === 'wide') {
                            label = b.extraRuns > 1 ? `${b.extraRuns}Wd` : 'Wd';
                            bgClass = 'bg-[#FF9100] border-amber-400 text-white font-bold';
                          } else if (b.extraType === 'noBall') {
                            label = b.runsBatter > 0 ? `${b.runsBatter}Nb` : 'Nb';
                            bgClass = 'bg-[#FF9100] border-amber-400 text-white font-bold';
                          } else if (b.runsBatter === 4) {
                            label = '4';
                            bgClass = 'bg-[#00E676] text-[#003B19] font-black border-emerald-400';
                          } else if (b.runsBatter === 6) {
                            label = '6';
                            bgClass = 'bg-[#C6FF00] text-[#2C3B00] font-black border-lime-400';
                          } else if (b.runsBatter === 0 && b.extraType === 'none') {
                            label = '0';
                          }

                          return (
                            <div
                              key={b.id}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 shadow-2xs ${bgClass}`}
                            >
                              {label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* THIS OVER CARD */}
                  <div className="bg-[#052044] rounded-2xl p-2.5 border border-[#0D386B] space-y-2 shadow-md">
                    <div className="flex items-center justify-between text-[10px] text-[#8CA3BF] font-bold uppercase tracking-wider font-mono">
                      <span>THIS OVER</span>
                      <span className="text-[#00FF66] font-bold">
                        {playersMap[bowlerId]?.fullName?.slice(0, 1).toUpperCase() || 'P'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {currentOverBalls.length === 0 ? (
                        <span className="text-xs text-[#8CA3BF] italic">Start of over</span>
                      ) : (
                        currentOverBalls.map((b) => {
                          let label = `${b.runsBatter}`;
                          let bgClass = 'bg-[#0A3970] border-[#145296] text-white';

                          if (b.isWicket) {
                            label = 'W';
                            bgClass = 'bg-[#FF2A4B] border-red-400 text-white font-black';
                          } else if (b.extraType === 'wide') {
                            label = b.extraRuns > 1 ? `${b.extraRuns}Wd` : 'Wd';
                            bgClass = 'bg-[#FF9100] border-amber-400 text-white font-bold';
                          } else if (b.extraType === 'noBall') {
                            label = b.runsBatter > 0 ? `${b.runsBatter}Nb` : 'Nb';
                            bgClass = 'bg-[#FF9100] border-amber-400 text-white font-bold';
                          } else if (b.runsBatter === 4) {
                            label = '4';
                            bgClass = 'bg-[#00E676] text-[#003B19] font-black border-emerald-400';
                          } else if (b.runsBatter === 6) {
                            label = '6';
                            bgClass = 'bg-[#C6FF00] text-[#2C3B00] font-black border-lime-400';
                          } else if (b.runsBatter === 0 && b.extraType === 'none') {
                            label = '0';
                          }

                          return (
                            <div
                              key={b.id}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 shadow-2xs ${bgClass}`}
                            >
                              {label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* INNINGS END NOTICE BUTTONS */}
                {currentInningsSummary?.isCompleted && (
                  <div className="bg-[#052044] border border-[#0D386B] rounded-2xl p-4 text-center space-y-2 shadow-lg">
                    <div className="font-display font-bold text-base text-[#FFD600]">
                      {currentInningsSummary.completedReason || 'Innings Ended'}
                    </div>
                    {liveMatch.currentInnings === 1 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#EAF2FF]">
                          Target for {bowlingTeam.name} is{' '}
                          <strong className="text-[#00FF66] text-sm">{totalRuns + 1}</strong> runs in{' '}
                          {liveMatch.oversPerInnings} overs.
                        </p>
                        <button
                          onClick={() => setShowInningsTransitionModal(true)}
                          className="px-5 py-2.5 bg-[#0084FF] text-white font-bold text-xs rounded-xl cursor-pointer shadow-md hover:bg-[#0070D6]"
                        >
                          Start 2nd Innings
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[#EAF2FF]">
                          {liveMatch.result?.summaryText || 'Match has concluded!'}
                        </p>
                        <button
                          onClick={() => setShowFinalizeModal(true)}
                          className="px-5 py-2.5 bg-[#00FF66] text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-md hover:bg-emerald-400"
                        >
                          Finalize Match & Save Career Records
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SCORING KEYPAD GRID ================= */}
                {!currentInningsSummary?.isCompleted && (
                  <div className="space-y-2 pt-1">
                    {/* KEYPAD GRID (4 columns x 3 rows) */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Row 1: 0, 1, 2, 3 */}
                      {[0, 1, 2, 3].map((run) => (
                        <button
                          key={run}
                          disabled={isSaving}
                          onClick={() => handleScoreBall(run)}
                          className="h-14 bg-[#0B488C] hover:bg-[#0D52A0] border border-[#185BAA] text-white font-mono font-extrabold text-2xl rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                        >
                          {run}
                        </button>
                      ))}

                      {/* Row 2: 4, 6, NB, WD */}
                      <button
                        disabled={isSaving}
                        onClick={() => handleScoreBall(4)}
                        className="h-14 bg-[#00E676] hover:bg-[#00FF84] text-[#003B19] font-mono font-black text-2xl rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        4
                      </button>

                      <button
                        disabled={isSaving}
                        onClick={() => handleScoreBall(6)}
                        className="h-14 bg-[#C6FF00] hover:bg-[#D4FF33] text-[#2C3B00] font-mono font-black text-2xl rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        6
                      </button>

                      <button
                        disabled={isSaving}
                        onClick={() => handleScoreBall(0, 'noBall', 0)}
                        className="h-14 bg-[#0B488C] hover:bg-[#0D52A0] border border-[#185BAA] text-white font-mono font-bold text-base rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        NB
                      </button>

                      <button
                        disabled={isSaving}
                        onClick={() => handleScoreBall(0, 'wide', 0)}
                        className="h-14 bg-[#0B488C] hover:bg-[#0D52A0] border border-[#185BAA] text-white font-mono font-bold text-base rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        WD
                      </button>

                      {/* Row 3: BYE, LB, WICKET, UNDO */}
                      <button
                        disabled={isSaving}
                        onClick={() => {
                          setSelectedExtraType('bye');
                          setShowExtrasModal(true);
                        }}
                        className="h-14 bg-[#0B488C] hover:bg-[#0D52A0] border border-[#185BAA] text-white font-mono font-bold text-base rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        BYE
                      </button>

                      <button
                        disabled={isSaving}
                        onClick={() => {
                          setSelectedExtraType('legBye');
                          setShowExtrasModal(true);
                        }}
                        className="h-14 bg-[#0B488C] hover:bg-[#0D52A0] border border-[#185BAA] text-white font-mono font-bold text-base rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        LB
                      </button>

                      <button
                        disabled={isSaving}
                        onClick={() => {
                          setDismissedPlayerId(strikerId);
                          setShowWicketModal(true);
                        }}
                        className="h-14 bg-[#FF2A4B] hover:bg-[#FF4260] text-white font-mono font-black text-sm rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md uppercase tracking-wider"
                      >
                        WICKET
                      </button>

                      <button
                        disabled={balls.length === 0 || isSaving}
                        onClick={handleUndo}
                        className="h-14 bg-[#FF9100] hover:bg-[#FFA526] text-white font-mono font-black text-sm rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md uppercase tracking-wider disabled:opacity-40"
                      >
                        UNDO
                      </button>
                    </div>

                    {/* ================= ACTION BUTTONS GRID (2x2 Grid) ================= */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* END OVER */}
                      <button
                        onClick={() => {
                          if (nonStrikerId !== 'none') {
                            const temp = strikerId;
                            setStrikerId(nonStrikerId);
                            setNonStrikerId(temp);
                          }
                          setLastCompletedOverNumber(Math.floor(legalBalls / liveMatch.rules.legalBallsPerOver));
                          setNextBowlerSelectionId(bowlingTeam.playerIds.find((p) => p !== bowlerId) || '');
                          setShowSelectNextBowlerModal(true);
                        }}
                        className="h-12 bg-[#08356A] hover:bg-[#0A3D7B] border border-[#10488A] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <UserPlus className="w-4 h-4 text-white" />
                        <span>END OVER</span>
                      </button>

                      {/* CHANGE BOWLER */}
                      <button
                        onClick={() => {
                          setNextBowlerSelectionId(bowlingTeam.playerIds.find((p) => p !== bowlerId) || '');
                          setShowSelectNextBowlerModal(true);
                        }}
                        className="h-12 bg-[#08356A] hover:bg-[#0A3D7B] border border-[#10488A] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4 text-white" />
                        <span>CHANGE BOWLER</span>
                      </button>

                      {/* END MATCH */}
                      <button
                        onClick={() => setShowFinalizeModal(true)}
                        className="h-12 bg-[#08356A] hover:bg-[#0A3D7B] border border-[#10488A] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <Flag className="w-4 h-4 text-white" />
                        <span>END MATCH</span>
                      </button>

                      {/* RETIRE BATSMAN */}
                      <button
                        onClick={() => {
                          setDismissedPlayerId(strikerId);
                          setWicketType('retired_hurt');
                          setShowWicketModal(true);
                        }}
                        className="h-12 bg-[#08356A] hover:bg-[#0A3D7B] border border-[#10488A] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <UserMinus className="w-4 h-4 text-white" />
                        <span>RETIRE BATSMAN</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 2: SCORECARD ================= */}
            {activeTab === 'scorecard' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* 1st Innings Card */}
                <div className="bg-[#07264A] rounded-2xl p-4 border border-[#154476] space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-[#154476] pb-2">
                    <span className="font-bold text-sm text-white">
                      1st Innings: {liveMatch.innings1?.teamName || liveMatch.teamA.name}
                    </span>
                    <span className="font-mono font-black text-base text-[#00E676]">
                      {liveMatch.innings1 ? `${liveMatch.innings1.totalRuns}/${liveMatch.innings1.wickets}` : '0/0'}
                    </span>
                  </div>

                  {liveMatch.innings1?.batters && Object.values(liveMatch.innings1.batters).length > 0 ? (
                    <div className="space-y-1.5 text-xs font-mono">
                      {Object.values(liveMatch.innings1.batters).map((b) => (
                        <div key={b.playerId} className="flex items-center justify-between py-1 border-b border-[#154476]/30">
                          <span className="text-white truncate font-sans">{b.playerName}</span>
                          <span className="text-[#70A5D8] font-bold">{b.runs} ({b.balls})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#70A5D8] italic">No batting data recorded yet</div>
                  )}
                </div>

                {/* 2nd Innings Card */}
                <div className="bg-[#07264A] rounded-2xl p-4 border border-[#154476] space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-[#154476] pb-2">
                    <span className="font-bold text-sm text-white">
                      2nd Innings: {liveMatch.innings2?.teamName || liveMatch.teamB.name}
                    </span>
                    <span className="font-mono font-black text-base text-[#00E676]">
                      {liveMatch.innings2 ? `${liveMatch.innings2.totalRuns}/${liveMatch.innings2.wickets}` : 'Not Started'}
                    </span>
                  </div>

                  {liveMatch.innings2?.batters && Object.values(liveMatch.innings2.batters).length > 0 ? (
                    <div className="space-y-1.5 text-xs font-mono">
                      {Object.values(liveMatch.innings2.batters).map((b) => (
                        <div key={b.playerId} className="flex items-center justify-between py-1 border-b border-[#154476]/30">
                          <span className="text-white truncate font-sans">{b.playerName}</span>
                          <span className="text-[#70A5D8] font-bold">{b.runs} ({b.balls})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#70A5D8] italic">No batting data recorded yet</div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 3: OVERS ================= */}
            {activeTab === 'overs' && (
              <div className="bg-[#07264A] rounded-2xl p-4 border border-[#154476] space-y-3 shadow-md animate-in fade-in duration-150 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#70A5D8]">
                  Over-by-Over Timeline
                </h3>
                {balls.length === 0 ? (
                  <p className="text-xs text-[#70A5D8] italic">No deliveries recorded in this match yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Array.from(new Set(balls.map((b) => b.overNumber))).map((ovNum) => {
                      const ovBalls = balls.filter((b) => b.overNumber === ovNum);
                      const ovRuns = ovBalls.reduce((acc, curr) => acc + (curr.runsBatter + curr.extraRuns), 0);
                      return (
                        <div key={ovNum} className="bg-[#0A315C] border border-[#184B82] p-2.5 rounded-xl space-y-1.5">
                          <div className="flex justify-between font-mono font-bold text-xs">
                            <span className="text-[#00E676]">Over {ovNum + 1}</span>
                            <span className="text-white">{ovRuns} Runs</span>
                          </div>
                          <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {ovBalls.map((b) => (
                              <span key={b.id} className="px-2 py-0.5 bg-[#07264A] text-white font-mono text-[11px] rounded border border-[#154476]">
                                {b.isWicket ? 'W' : b.runsBatter + b.extraRuns}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 4: STATS ================= */}
            {activeTab === 'stats' && (
              <div className="bg-[#07264A] rounded-2xl p-4 border border-[#154476] space-y-3 shadow-md animate-in fade-in duration-150 text-xs text-white">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#70A5D8]">
                  Match Statistics Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="bg-[#0A315C] p-3 rounded-xl border border-[#184B82]">
                    <span className="text-[10px] text-[#70A5D8] uppercase block">Total Deliveries</span>
                    <span className="text-lg font-black text-white">{balls.length}</span>
                  </div>
                  <div className="bg-[#0A315C] p-3 rounded-xl border border-[#184B82]">
                    <span className="text-[10px] text-[#70A5D8] uppercase block">Current Run Rate</span>
                    <span className="text-lg font-black text-[#00E676]">{currentRR}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 5: SETTINGS ================= */}
            {activeTab === 'settings' && (
              <div className="bg-[#07264A] rounded-2xl p-4 border border-[#154476] space-y-3 shadow-md animate-in fade-in duration-150 text-xs text-white">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#70A5D8]">
                  Match & Scoring Settings
                </h3>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowOpeningSetupModal(true)}
                    className="w-full py-2.5 px-3 bg-[#1B80E4] hover:bg-[#156DC4] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Open Match Setup & Toss Modal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickPlayerTeamId(battingTeam.id);
                      setShowQuickAddPlayerModal(true);
                    }}
                    className="w-full py-2.5 px-3 bg-[#0A315C] border border-[#184B82] hover:bg-[#124278] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <UserPlus className="w-4 h-4 text-[#00E676]" />
                    <span>Add Player Mid-Match</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunDiagnosticTest}
                    className="w-full py-2.5 px-3 bg-[#0A315C] border border-[#184B82] hover:bg-[#124278] text-[#C6FF00] font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Activity className="w-4 h-4 text-[#C6FF00]" />
                    <span>Run Over Diagnostic Test</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* OVER COMPLETE NEXT BOWLER SELECTOR MODAL */}
      {showSelectNextBowlerModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-[#063D2E] border-2 border-[#7CFC00] rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 shadow-2xl text-white my-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#7CFC00]/10 border border-[#7CFC00]/40 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-[#7CFC00]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-white leading-tight">
                    Over {lastCompletedOverNumber} Complete! (ओवर समाप्त)
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Select bowler for Over {lastCompletedOverNumber + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectNextBowlerModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#7CFC00]">
                  Select Next Bowler (अगला बॉलर चुनें) *
                </label>
                <span className="text-[10.5px] font-mono text-emerald-200">
                  {bowlingTeam.name}
                </span>
              </div>

              {/* List of squad bowlers with statistics */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {bowlingTeam.playerIds.map((pId) => {
                  const isPreviousBowler = pId === bowlerId;
                  const isSelected = pId === nextBowlerSelectionId;
                  const bowStat = currentInningsSummary?.bowlers[pId];
                  const bowOvers = formatOvers(bowStat?.balls || 0, liveMatch.rules.legalBallsPerOver);

                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => setNextBowlerSelectionId(pId)}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7CFC00] text-[#002B1B] border-[#7CFC00] font-bold shadow-md scale-[1.01]'
                          : 'bg-[#002B1B] text-slate-200 border-emerald-800/80 hover:border-emerald-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                          <span>{playersMap[pId]?.fullName || pId}</span>
                          {isPreviousBowler && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-[#002B1B] text-[#7CFC00]' : 'bg-emerald-950 text-emerald-300'
                            }`}>
                              Prev Bowler
                            </span>
                          )}
                        </div>
                        <div className={`text-[10.5px] ${isSelected ? 'text-[#002B1B]/80' : 'text-slate-400'} font-mono`}>
                          {playersMap[pId]?.bowlingStyle?.replace(/_/g, ' ') || 'Bowler'}
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px] shrink-0">
                        <div>{bowOvers} ov · {bowStat?.runsConceded || 0}r</div>
                        <div className={isSelected ? 'text-[#002B1B] font-extrabold' : 'text-[#7CFC00] font-bold'}>
                          {bowStat?.wickets || 0} wkts
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#002B1B] rounded-xl p-2.5 border border-emerald-900 text-emerald-200 text-[11px] flex items-center justify-between">
                <span>Previous Bowler: <strong>{playersMap[bowlerId]?.fullName || bowlerId}</strong></span>
                <span className="text-[#7CFC00] font-semibold">Ends Swapped ✓</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmNextBowler}
              className="w-full min-h-[48px] bg-[#7CFC00] hover:bg-lime-400 text-[#002B1B] font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer touch-press shadow-lg"
            >
              <Check className="w-5 h-5 text-[#002B1B]" />
              Confirm Next Bowler & Start Over
            </button>
          </div>
        </div>
      )}

      {/* MID-MATCH QUICK ADD PLAYER MODAL */}
      {showQuickAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <form
            onSubmit={handleQuickAddPlayerSubmit}
            className="bg-[#063D2E] border border-emerald-600 rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 shadow-2xl text-white my-auto"
          >
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#7CFC00]" />
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Add Player Mid-Match
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddPlayerModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-emerald-200 block mb-1 font-semibold">Player Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={quickPlayerName}
                  onChange={(e) => setQuickPlayerName(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7CFC00]"
                />
              </div>

              <div>
                <label className="text-emerald-200 block mb-1 font-semibold">Add to Team *</label>
                <select
                  value={quickPlayerTeamId}
                  onChange={(e) => setQuickPlayerTeamId(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value={liveMatch.teamA.id}>{liveMatch.teamA.name}</option>
                  <option value={liveMatch.teamB.id}>{liveMatch.teamB.name}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-emerald-200 block mb-1 font-semibold">Role</label>
                  <select
                    value={quickPlayerRole}
                    onChange={(e) => setQuickPlayerRole(e.target.value as any)}
                    className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="top_order_batter">Batter</option>
                    <option value="pace_bowler">Bowler</option>
                    <option value="batting_allrounder">All-rounder</option>
                  </select>
                </div>

                <div>
                  <label className="text-emerald-200 block mb-1 font-semibold">Jersey #</label>
                  <input
                    type="number"
                    placeholder="18"
                    value={quickPlayerJersey}
                    onChange={(e) => setQuickPlayerJersey(e.target.value)}
                    className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickAddPlayerModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-300 bg-emerald-950 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingQuickPlayer}
                className="flex-1 py-2.5 text-xs font-bold bg-[#7CFC00] text-[#002B1B] rounded-xl cursor-pointer touch-press"
              >
                {isAddingQuickPlayer ? 'Adding...' : 'Add Player to Match'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OPENING MATCH SETUP & TOSS MODAL */}
      {showOpeningSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-[#063D2E] border border-emerald-600 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#7CFC00]" />
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Match Opening & Toss Setup (ओपनिंग सेटअप)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOpeningSetupModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 1. OVERS CONFIGURATION */}
              <div className="bg-[#002B1B] p-3 rounded-2xl border border-emerald-800/80 space-y-2">
                <label className="text-emerald-200 font-bold block">1. Match Overs (मैच के ओवर चुनें)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 5, 8, 10, 12, 15, 20, 25].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setMatchOversSetup(o)}
                      className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs cursor-pointer transition-all ${
                        matchOversSetup === o
                          ? 'bg-[#7CFC00] text-[#002B1B]'
                          : 'bg-[#063D2E] text-slate-300 border border-emerald-800 hover:text-white'
                      }`}
                    >
                      {o} Overs
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-300 text-[11px]">Custom Overs:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={matchOversSetup}
                    onChange={(e) => setMatchOversSetup(parseInt(e.target.value, 10) || 1)}
                    className="w-20 bg-[#063D2E] border border-emerald-700 rounded-lg px-2 py-1 text-white font-mono font-bold text-xs"
                  />
                  <span className="text-emerald-300 font-mono text-[11px]">({matchOversSetup} Overs Total)</span>
                </div>
              </div>

              {/* 2. TOSS SELECTION */}
              <div className="bg-[#002B1B] p-3 rounded-2xl border border-emerald-800/80 space-y-2">
                <label className="text-emerald-200 font-bold block">2. Toss Result (टॉस विजेता एवं फ़ैसला)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-300 block mb-1">Toss Winner:</span>
                    <select
                      value={tossWinner}
                      onChange={(e) => setTossWinner(e.target.value)}
                      className="w-full bg-[#063D2E] border border-emerald-800 rounded-xl px-2.5 py-1.5 text-white font-semibold text-xs"
                    >
                      <option value={liveMatch.teamA.id}>{liveMatch.teamA.name}</option>
                      <option value={liveMatch.teamB.id}>{liveMatch.teamB.name}</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-300 block mb-1">Decision:</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setTossDecision('bat')}
                        className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                          tossDecision === 'bat'
                            ? 'bg-[#7CFC00] text-[#002B1B] border-[#7CFC00]'
                            : 'bg-[#063D2E] text-slate-300 border-emerald-800'
                        }`}
                      >
                        Bat
                      </button>
                      <button
                        type="button"
                        onClick={() => setTossDecision('bowl')}
                        className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                          tossDecision === 'bowl'
                            ? 'bg-[#7CFC00] text-[#002B1B] border-[#7CFC00]'
                            : 'bg-[#063D2E] text-slate-300 border-emerald-800'
                        }`}
                      >
                        Bowl
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. OPENING BATTERS SELECTION */}
              <div className="bg-[#002B1B] p-3 rounded-2xl border border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-emerald-200 font-bold block">
                    3. Opening Batters ({battingTeam.name})
                  </label>
                  <span className="text-[10.5px] text-[#7CFC00] font-semibold">ओपनिंग जोड़ी चुनें</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Striker (सबसे पहले खेलेगा) *
                    </label>
                    <select
                      value={strikerId}
                      onChange={(e) => setStrikerId(e.target.value)}
                      className="w-full bg-[#063D2E] border border-emerald-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs"
                    >
                      {battingTeam.playerIds.map((pId) => (
                        <option key={pId} value={pId}>
                          {playersMap[pId]?.fullName || pId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Non-Striker (दूसरा बैट्समैन)
                    </label>
                    <select
                      value={nonStrikerId}
                      onChange={(e) => setNonStrikerId(e.target.value)}
                      className="w-full bg-[#063D2E] border border-emerald-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs"
                    >
                      <option value="none" className="text-amber-300">-- Solo Batter (Single Mode) --</option>
                      {battingTeam.playerIds.map((pId) => (
                        <option key={pId} value={pId}>
                          {playersMap[pId]?.fullName || pId}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. OPENING BOWLER SELECTION */}
              <div className="bg-[#002B1B] p-3 rounded-2xl border border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-emerald-200 font-bold block">
                    4. Opening Bowler ({bowlingTeam.name})
                  </label>
                  <span className="text-[10.5px] text-[#7CFC00] font-semibold">पहला ओवर कौन फेंकेगा</span>
                </div>

                <select
                  value={bowlerId}
                  onChange={(e) => setBowlerId(e.target.value)}
                  className="w-full bg-[#063D2E] border border-emerald-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs"
                >
                  {bowlingTeam.playerIds.map((pId) => (
                    <option key={pId} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveOpeningSetup}
                className="w-full py-3 bg-[#7CFC00] hover:bg-lime-400 text-[#002B1B] font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99]"
              >
                <Check className="w-5 h-5 text-[#002B1B]" />
                <span>Start Live Match (लाइव स्कोरिंग शुरू करें)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div className="bg-[#063D2E] border border-emerald-800 rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto my-auto sm:my-0">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <h3 className="font-display font-bold text-base sm:text-lg text-white">Record Dismissal (विकेट आउट)</h3>
              <button
                onClick={() => setShowWicketModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Dismissal Type */}
              <div>
                <label className="text-emerald-200 block mb-1">Dismissal Type</label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as WicketType)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="caught">Caught</option>
                  <option value="bowled">Bowled</option>
                  <option value="lbw">LBW</option>
                  <option value="run_out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hit_wicket">Hit Wicket</option>
                  <option value="retired_hurt">Retired Hurt</option>
                  <option value="retired_out">Retired Out</option>
                </select>
              </div>

              {/* Player Dismissed */}
              <div>
                <label className="text-emerald-200 block mb-1">Player Dismissed</label>
                <select
                  value={dismissedPlayerId}
                  onChange={(e) => setDismissedPlayerId(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value={strikerId}>
                    {playersMap[strikerId]?.fullName || 'Striker'} (Striker)
                  </option>
                  {nonStrikerId !== 'none' && (
                    <option value={nonStrikerId}>
                      {playersMap[nonStrikerId]?.fullName || 'Non-Striker'} (Non-Striker)
                    </option>
                  )}
                </select>
              </div>

              {/* Fielder involved */}
              {(wicketType === 'caught' || wicketType === 'run_out' || wicketType === 'stumped') && (
                <div>
                  <label className="text-emerald-200 block mb-1">Fielder Involved</label>
                  <select
                    value={fielderId}
                    onChange={(e) => setFielderId(e.target.value)}
                    className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm"
                  >
                    <option value="">None / Bowler</option>
                    {bowlingTeam.playerIds.map((pId) => (
                      <option key={pId} value={pId}>
                        {playersMap[pId]?.fullName || pId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Incoming Batter Section */}
              {remainingBatters.length > 0 ? (
                <div>
                  <label className="text-emerald-200 block mb-1 font-bold text-[#7CFC00]">
                    Select Incoming Batter (नया बैट्समैन चुनें) *
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7CFC00]"
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
                <div className="bg-amber-950/90 border border-amber-600/90 rounded-2xl p-3 text-amber-200 text-xs space-y-1">
                  <div className="font-bold text-[#7CFC00] flex items-center gap-1">
                    ⭐️ Last Remaining Batter (आखिरी अकेला खिलाड़ी)
                  </div>
                  <p className="text-[11px] text-slate-200 font-sans">
                    No unbatted players left in squad. The surviving player will play solo as a Single Batter until dismissed!
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleWicketSubmit}
              className="w-full min-h-[48px] bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center cursor-pointer touch-press"
            >
              Confirm Wicket
            </button>
          </div>
        </div>
      )}

      {/* EXTRAS MODAL */}
      {showExtrasModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div className="bg-[#063D2E] border border-emerald-800 rounded-3xl w-full max-w-sm p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto my-auto sm:my-0">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <h3 className="font-display font-bold text-base text-white capitalize">
                {selectedExtraType} Delivery
              </h3>
              <button
                onClick={() => setShowExtrasModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                {selectedExtraType === 'wide' && 'Wide delivery penalty (default 1) + any additional runs:'}
                {selectedExtraType === 'noBall' && 'No-ball delivery penalty (default 1) + runs off bat:'}
                {(selectedExtraType === 'bye' || selectedExtraType === 'legBye') && 'Runs taken by batters:'}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 4].map((r) => (
                  <button
                    key={r}
                    onClick={() => setExtraBoundaryRuns(r)}
                    className={`min-h-[44px] rounded-xl font-mono font-bold text-sm border cursor-pointer ${
                      extraBoundaryRuns === r
                        ? 'bg-[#7CFC00] text-[#002B1B] border-[#7CFC00]'
                        : 'bg-[#002B1B] text-white border-emerald-800'
                    }`}
                  >
                    +{r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleExtrasSubmit}
              className="w-full min-h-[44px] bg-[#7CFC00] text-[#002B1B] font-bold rounded-xl flex items-center justify-center cursor-pointer touch-press"
            >
              Add {selectedExtraType} Delivery
            </button>
          </div>
        </div>
      )}

      {/* INNINGS 2 TRANSITION MODAL */}
      {showInningsTransitionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div className="bg-[#063D2E] border border-emerald-800 rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="font-display font-bold text-base sm:text-lg text-white">Start 2nd Innings</h3>
            <p className="text-xs text-slate-300">
              Select opening batters for {bowlingTeam.name} and the opening bowler from {battingTeam.name}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-emerald-200 block mb-1">Striker (Opening Batter 1)</label>
                <select
                  value={inn2Striker}
                  onChange={(e) => setInn2Striker(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Select striker...</option>
                  {bowlingTeam.playerIds.map((pId) => (
                    <option key={pId} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-emerald-200 block mb-1">Non-Striker (Opening Batter 2)</label>
                <select
                  value={inn2NonStriker}
                  onChange={(e) => setInn2NonStriker(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="none">-- Solo Batter Mode --</option>
                  {bowlingTeam.playerIds.map((pId) => (
                    <option key={pId} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-emerald-200 block mb-1">Opening Bowler</label>
                <select
                  value={inn2Bowler}
                  onChange={(e) => setInn2Bowler(e.target.value)}
                  className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Select opening bowler...</option>
                  {battingTeam.playerIds.map((pId) => (
                    <option key={pId} value={pId}>
                      {playersMap[pId]?.fullName || pId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowInningsTransitionModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-300 bg-emerald-950 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleStartInnings2}
                className="flex-1 py-2 text-xs font-bold bg-[#7CFC00] text-[#002B1B] rounded-xl"
              >
                Begin 2nd Innings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINALIZE MATCH & POTM MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div className="bg-[#063D2E] border border-emerald-800 rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#7CFC00]" />
              <h3 className="font-display font-bold text-lg text-white">Finalize Match Result</h3>
            </div>

            <div className="bg-[#002B1B] rounded-xl p-3 border border-emerald-950 text-xs space-y-1">
              <div className="font-semibold text-white">Official Result:</div>
              <div className="text-[#7CFC00] font-bold text-sm">
                {liveMatch.result?.summaryText || 'Calculating result...'}
              </div>
            </div>

            <div>
              <label className="text-xs text-emerald-200 block mb-1">Player of the Match (Optional)</label>
              <select
                value={potmId}
                onChange={(e) => setPotmId(e.target.value)}
                className="w-full bg-[#002B1B] border border-emerald-800 rounded-xl px-3 py-2 text-white text-sm"
              >
                <option value="">Select Player of the Match...</option>
                {[...liveMatch.teamA.playerIds, ...liveMatch.teamB.playerIds].map((pId) => (
                  <option key={pId} value={pId}>
                    {playersMap[pId]?.fullName || pId} (
                    {liveMatch.teamA.playerIds.includes(pId) ? liveMatch.teamA.name : liveMatch.teamB.name})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              Finalizing will lock official results, record individual player performance statistics, and update all players' career records permanently.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-300 bg-emerald-950 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="flex-1 py-2 text-xs font-bold bg-[#7CFC00] text-[#002B1B] rounded-xl touch-press"
              >
                Lock & Save Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC OVER TEST MODAL */}
      {showDiagnosticModal && diagnosticReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-[#063D2E] border border-emerald-600 rounded-3xl w-full max-w-lg p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto my-auto text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#7CFC00]" />
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  Over Simulation Diagnostic Suite
                </h3>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Summary Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold space-y-1 ${
                diagnosticReport.overallPassed
                  ? 'bg-emerald-950/90 border-emerald-500 text-[#7CFC00]'
                  : 'bg-red-950/90 border-red-500 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm uppercase tracking-wider font-mono">
                  {diagnosticReport.overallPassed ? 'ALL TESTS PASSED ✓' : 'TESTS FAILED ✕'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-900 border border-[#7CFC00] text-white font-mono text-xs">
                  {diagnosticReport.passedSteps}/{diagnosticReport.totalSteps} Assertions Verified
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-sans leading-relaxed">
                {diagnosticReport.summaryText}
              </p>
            </div>

            {/* Step-by-Step Delivery Verifications */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto no-scrollbar pr-0.5">
              {diagnosticReport.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className={`p-3 rounded-2xl border text-xs font-mono space-y-1.5 transition-all ${
                    step.passed
                      ? 'bg-[#002B1B]/80 border-emerald-800/80 text-emerald-100'
                      : 'bg-red-950/80 border-red-700 text-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold border-b border-emerald-900/60 pb-1">
                    <span className="text-[#7CFC00] font-sans">{step.deliveryName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        step.passed ? 'bg-emerald-900 text-[#7CFC00]' : 'bg-red-900 text-white'
                      }`}
                    >
                      {step.passed ? 'PASSED ✓' : 'FAILED ✕'}
                    </span>
                  </div>

                  <p className="text-[11px] font-sans text-slate-200 font-medium">
                    {step.actionDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-[#063D2E]/60 p-2 rounded-xl border border-emerald-900/40">
                    <div>
                      <span className="text-emerald-300/80 block">Runs / Wkts:</span>
                      <strong className="text-white">{step.actualTotalRuns}/{step.actualWickets}</strong>{' '}
                      <span className="text-[#91AAA1]">({step.actualLegalBalls} balls)</span>
                    </div>
                    <div>
                      <span className="text-emerald-300/80 block">Striker:</span>
                      <strong className="text-[#7CFC00]">{step.actualStrikerName}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/80 block">Non-Striker:</span>
                      <strong className="text-white">{step.actualNonStrikerName}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/80 block">Over Complete:</span>
                      <strong className={step.actualOverComplete ? 'text-[#7CFC00]' : 'text-slate-300'}>
                        {step.actualOverComplete ? 'Yes (Swap ends)' : 'No'}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowDiagnosticModal(false)}
              className="w-full py-3 bg-[#7CFC00] text-[#002B1B] font-bold text-xs rounded-xl cursor-pointer touch-press"
            >
              Close Diagnostic Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
