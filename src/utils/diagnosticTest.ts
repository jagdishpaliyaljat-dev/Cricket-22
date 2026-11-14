import {
  BallEvent,
  CustomCricketRules,
  ExtraType,
  Player,
  WicketType,
} from '../types/cricket';
import {
  buildInningsSummary,
  getNextStrikeState,
  formatOvers,
} from '../lib/cricketEngine';

export interface DiagnosticStepResult {
  stepNumber: number;
  deliveryName: string;
  actionDescription: string;
  isLegalBall: boolean;
  expectedTotalRuns: number;
  expectedWickets: number;
  expectedLegalBalls: number;
  expectedStrikerName: string;
  expectedNonStrikerName: string;
  expectedOverComplete: boolean;
  actualTotalRuns: number;
  actualWickets: number;
  actualLegalBalls: number;
  actualStrikerName: string;
  actualNonStrikerName: string;
  actualOverComplete: boolean;
  passed: boolean;
  details: string;
}

export interface DiagnosticTestReport {
  timestamp: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  overallPassed: boolean;
  summaryText: string;
  steps: DiagnosticStepResult[];
}

export function runOverDiagnosticTest(
  rules: CustomCricketRules = {
    legalBallsPerOver: 6,
    maxWickets: 10,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitOnNoBall: true,
    byesAllowed: true,
    legByesAllowed: true,
    superOverOnTie: true,
  }
): DiagnosticTestReport {
  const playersMap: Record<string, Player> = {
    p_batter_a: {
      id: 'p_batter_a',
      fullName: 'Amit Patel',
      playingRole: 'top_order_batter',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'none',
      status: 'active',
      registrationDate: new Date().toISOString(),
      career: {
        matches: 10,
        innings: 10,
        runs: 300,
        highestScore: 50,
        notOuts: 1,
        fours: 30,
        sixes: 10,
        ballsFaced: 200,
        wickets: 0,
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        bestBowlingRuns: 0,
        bestBowlingWickets: 0,
        catches: 2,
        runOuts: 0,
        potmAwards: 1,
      },
    },
    p_batter_b: {
      id: 'p_batter_b',
      fullName: 'Vikram Singh',
      playingRole: 'middle_order_batter',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'none',
      status: 'active',
      registrationDate: new Date().toISOString(),
      career: {
        matches: 10,
        innings: 10,
        runs: 250,
        highestScore: 45,
        notOuts: 2,
        fours: 25,
        sixes: 8,
        ballsFaced: 180,
        wickets: 0,
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        bestBowlingRuns: 0,
        bestBowlingWickets: 0,
        catches: 3,
        runOuts: 1,
        potmAwards: 0,
      },
    },
    p_batter_c: {
      id: 'p_batter_c',
      fullName: 'Imran Khan',
      playingRole: 'batting_allrounder',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'none',
      status: 'active',
      registrationDate: new Date().toISOString(),
      career: {
        matches: 12,
        innings: 11,
        runs: 380,
        highestScore: 65,
        notOuts: 3,
        fours: 35,
        sixes: 15,
        ballsFaced: 220,
        wickets: 5,
        oversBowled: 10,
        ballsBowled: 60,
        runsConceded: 70,
        bestBowlingRuns: 15,
        bestBowlingWickets: 2,
        catches: 5,
        runOuts: 1,
        potmAwards: 2,
      },
    },
    p_bowler: {
      id: 'p_bowler',
      fullName: 'Rakesh Jain',
      playingRole: 'bowling_allrounder',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'right_arm_fast',
      status: 'active',
      registrationDate: new Date().toISOString(),
      career: {
        matches: 10,
        innings: 8,
        runs: 120,
        highestScore: 25,
        notOuts: 1,
        fours: 10,
        sixes: 4,
        ballsFaced: 80,
        wickets: 15,
        oversBowled: 25,
        ballsBowled: 150,
        runsConceded: 180,
        bestBowlingRuns: 15,
        bestBowlingWickets: 4,
        catches: 2,
        runOuts: 0,
        potmAwards: 1,
      },
    },
  };

  const steps: DiagnosticStepResult[] = [];
  const ballsHistory: BallEvent[] = [];

  let currentStrikerId = 'p_batter_a';
  let currentNonStrikerId = 'p_batter_b';
  const bowlerId = 'p_bowler';

  // Planned 7 delivery sequence for a full over test
  const plannedDeliveries: Array<{
    stepNumber: number;
    name: string;
    desc: string;
    runsBatter: number;
    extraType: ExtraType;
    extraRuns: number;
    isLegal: boolean;
    isWicket: boolean;
    wicketDetails?: {
      type: WicketType;
      dismissedPlayerId: string;
      bowlerId: string;
      newBatterId: string;
    };
    expectedTotalRuns: number;
    expectedWickets: number;
    expectedLegalBalls: number;
    expectedStrikerId: string;
    expectedNonStrikerId: string;
    expectedOverComplete: boolean;
  }> = [
    {
      stepNumber: 1,
      name: 'Ball 0.1',
      desc: 'Batter A scores 1 Run (Single)',
      runsBatter: 1,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: false,
      expectedTotalRuns: 1,
      expectedWickets: 0,
      expectedLegalBalls: 1,
      expectedStrikerId: 'p_batter_b',
      expectedNonStrikerId: 'p_batter_a',
      expectedOverComplete: false,
    },
    {
      stepNumber: 2,
      name: 'Ball 0.2',
      desc: 'Batter B hits 4 Runs (Boundary)',
      runsBatter: 4,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: false,
      expectedTotalRuns: 5,
      expectedWickets: 0,
      expectedLegalBalls: 2,
      expectedStrikerId: 'p_batter_b',
      expectedNonStrikerId: 'p_batter_a',
      expectedOverComplete: false,
    },
    {
      stepNumber: 3,
      name: 'Ball 0.3',
      desc: 'Batter B plays Dot Ball (0 Runs)',
      runsBatter: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: false,
      expectedTotalRuns: 5,
      expectedWickets: 0,
      expectedLegalBalls: 3,
      expectedStrikerId: 'p_batter_b',
      expectedNonStrikerId: 'p_batter_a',
      expectedOverComplete: false,
    },
    {
      stepNumber: 4,
      name: 'Ball 0.3 (Extra)',
      desc: 'Bowler bowls Wide (+1 Extra Run, Non-legal ball)',
      runsBatter: 0,
      extraType: 'wide' as const,
      extraRuns: 1,
      isLegal: false,
      isWicket: false,
      expectedTotalRuns: 6,
      expectedWickets: 0,
      expectedLegalBalls: 3, // Legal count stays 3
      expectedStrikerId: 'p_batter_b',
      expectedNonStrikerId: 'p_batter_a',
      expectedOverComplete: false,
    },
    {
      stepNumber: 5,
      name: 'Ball 0.4',
      desc: 'Batter B hits 1 Run',
      runsBatter: 1,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: false,
      expectedTotalRuns: 7,
      expectedWickets: 0,
      expectedLegalBalls: 4,
      expectedStrikerId: 'p_batter_a',
      expectedNonStrikerId: 'p_batter_b',
      expectedOverComplete: false,
    },
    {
      stepNumber: 6,
      name: 'Ball 0.5',
      desc: 'Batter A OUT (Caught). Incoming Batter C replaces Batter A.',
      runsBatter: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: true,
      wicketDetails: {
        type: 'caught' as WicketType,
        dismissedPlayerId: 'p_batter_a',
        bowlerId: 'p_bowler',
        newBatterId: 'p_batter_c',
      },
      expectedTotalRuns: 7,
      expectedWickets: 1,
      expectedLegalBalls: 5,
      expectedStrikerId: 'p_batter_c',
      expectedNonStrikerId: 'p_batter_b',
      expectedOverComplete: false,
    },
    {
      stepNumber: 7,
      name: 'Ball 0.6 (Last Ball)',
      desc: 'Batter C hits 1 Run. Over 1 Completed (6/6).',
      runsBatter: 1,
      extraType: 'none' as const,
      extraRuns: 0,
      isLegal: true,
      isWicket: false,
      expectedTotalRuns: 8,
      expectedWickets: 1,
      expectedLegalBalls: 6,
      expectedStrikerId: 'p_batter_c',
      expectedNonStrikerId: 'p_batter_b',
      expectedOverComplete: true,
    },
  ];

  for (const del of plannedDeliveries) {
    const ballInOver = del.isLegal ? (ballsHistory.filter((b) => b.isLegal).length % 6) + 1 : ballsHistory.filter((b) => b.isLegal).length % 6 || 6;
    const overNumber = Math.floor(ballsHistory.filter((b) => b.isLegal).length / 6);

    const event: BallEvent = {
      id: `diag_ball_${del.stepNumber}`,
      matchId: 'diag_match_1',
      innings: 1,
      overNumber,
      ballInOver,
      bowlerId,
      strikerId: currentStrikerId,
      nonStrikerId: currentNonStrikerId,
      runsBatter: del.runsBatter,
      extraType: del.extraType,
      extraRuns: del.extraRuns,
      isLegal: del.isLegal,
      isWicket: del.isWicket,
      totalRunsOnBall: del.runsBatter + del.extraRuns,
      timestamp: new Date().toISOString(),
    };

    if (del.isWicket && del.wicketDetails) {
      event.wicketDetails = del.wicketDetails;
    }

    ballsHistory.push(event);

    // Compute summary
    const summary = buildInningsSummary(
      ballsHistory,
      'team_diag_a',
      'Team Alpha',
      playersMap,
      rules,
      15
    );

    // Compute next strike state
    const isLegalOverComplete = del.isLegal && summary.legalBalls % 6 === 0;

    const nextStrike = getNextStrikeState(
      event,
      currentStrikerId,
      currentNonStrikerId,
      del.runsBatter + (del.extraType === 'bye' || del.extraType === 'legBye' ? del.extraRuns : 0),
      del.extraType === 'wide' || del.extraType === 'noBall',
      isLegalOverComplete,
      del.wicketDetails?.dismissedPlayerId,
      del.wicketDetails?.newBatterId || undefined
    );

    const actualTotalRuns = summary.totalRuns;
    const actualWickets = summary.wickets;
    const actualLegalBalls = summary.legalBalls;
    const actualStrikerName = playersMap[nextStrike.nextStrikerId]?.fullName || nextStrike.nextStrikerId;
    const actualNonStrikerName = playersMap[nextStrike.nextNonStrikerId]?.fullName || nextStrike.nextNonStrikerId;
    const actualOverComplete = summary.legalBalls === 6 && summary.legalBalls % 6 === 0;

    const expectedStrikerName = playersMap[del.expectedStrikerId]?.fullName || del.expectedStrikerId;
    const expectedNonStrikerName = playersMap[del.expectedNonStrikerId]?.fullName || del.expectedNonStrikerId;

    const runsPassed = actualTotalRuns === del.expectedTotalRuns;
    const wicketsPassed = actualWickets === del.expectedWickets;
    const ballsPassed = actualLegalBalls === del.expectedLegalBalls;
    const strikerPassed = nextStrike.nextStrikerId === del.expectedStrikerId;
    const nonStrikerPassed = nextStrike.nextNonStrikerId === del.expectedNonStrikerId;
    const overCompletePassed = actualOverComplete === del.expectedOverComplete;

    const passed = runsPassed && wicketsPassed && ballsPassed && strikerPassed && nonStrikerPassed && overCompletePassed;

    steps.push({
      stepNumber: del.stepNumber,
      deliveryName: del.name,
      actionDescription: del.desc,
      isLegalBall: del.isLegal,
      expectedTotalRuns: del.expectedTotalRuns,
      expectedWickets: del.expectedWickets,
      expectedLegalBalls: del.expectedLegalBalls,
      expectedStrikerName,
      expectedNonStrikerName,
      expectedOverComplete: del.expectedOverComplete,
      actualTotalRuns,
      actualWickets,
      actualLegalBalls,
      actualStrikerName,
      actualNonStrikerName,
      actualOverComplete,
      passed,
      details: passed
        ? `Passed: Runs=${actualTotalRuns}, Wickets=${actualWickets}, LegalBalls=${actualLegalBalls}, Striker=${actualStrikerName}, NonStriker=${actualNonStrikerName}`
        : `Failed: Runs=${actualTotalRuns} (expected ${del.expectedTotalRuns}), Striker=${actualStrikerName} (expected ${expectedStrikerName})`,
    });

    // Advance current state
    currentStrikerId = nextStrike.nextStrikerId;
    currentNonStrikerId = nextStrike.nextNonStrikerId;
  }

  const passedSteps = steps.filter((s) => s.passed).length;
  const failedSteps = steps.length - passedSteps;
  const overallPassed = failedSteps === 0;

  return {
    timestamp: new Date().toISOString(),
    totalSteps: steps.length,
    passedSteps,
    failedSteps,
    overallPassed,
    summaryText: overallPassed
      ? `ALL ${steps.length} DIAGNOSTIC TESTS PASSED: Full over simulation verified runs, strike rotation, wicket dismissal, and over completion.`
      : `${failedSteps} of ${steps.length} diagnostic test steps failed.`,
    steps,
  };
}
