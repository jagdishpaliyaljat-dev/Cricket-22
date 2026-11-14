import { CricketMatch } from '../types/cricket';

export interface WinProbabilityResult {
  teamAWinProb: number;
  teamBWinProb: number;
  battingTeamId?: string;
  bowlingTeamId?: string;
  summaryText?: string;
}

/**
 * Calculates a dynamic win probability percentage (0-100%) for Team A and Team B
 * using a heuristic based on current runs, wickets lost, and remaining balls.
 */
export function calculateWinProbability(match: CricketMatch): WinProbabilityResult {
  if (!match) {
    return { teamAWinProb: 50, teamBWinProb: 50 };
  }

  // Case 1: Match Completed
  if (match.status === 'completed') {
    if (match.result?.winnerTeamId === match.teamA.id) {
      return { teamAWinProb: 100, teamBWinProb: 0, summaryText: `${match.teamA.name} won` };
    } else if (match.result?.winnerTeamId === match.teamB.id) {
      return { teamAWinProb: 0, teamBWinProb: 100, summaryText: `${match.teamB.name} won` };
    } else {
      return { teamAWinProb: 50, teamBWinProb: 50, summaryText: match.result?.summaryText || 'Match Tied / No Result' };
    }
  }

  // Case 2: Scheduled / Not started
  if (match.status === 'scheduled' || !match.currentInnings) {
    return { teamAWinProb: 50, teamBWinProb: 50, summaryText: 'Match not started' };
  }

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

  const isBattingTeamA = battingTeamId === match.teamA.id;
  const activeInnings = match.currentInnings === 2 ? match.innings2 : match.innings1;

  const maxWickets = match.playersPerTeam > 1 ? match.playersPerTeam - 1 : 10;
  const totalOvers = match.oversPerInnings || 20;
  const totalBalls = totalOvers * 6;

  const legalOvers = activeInnings?.legalOvers ?? 0;
  const legalBalls = activeInnings?.legalBalls ?? 0;
  const ballsBowled = legalOvers * 6 + legalBalls;
  const totalRuns = activeInnings?.totalRuns ?? 0;
  const wickets = activeInnings?.wickets ?? 0;
  const wicketsInHand = Math.max(0, maxWickets - wickets);

  let battingWinProb = 50;

  // Case 3: First Innings
  if (match.currentInnings === 1) {
    if (ballsBowled < 6) {
      battingWinProb = 50;
    } else {
      const remainingBalls = Math.max(0, totalBalls - ballsBowled);
      const currentRunRate = ballsBowled > 0 ? (totalRuns / ballsBowled) * 6 : 0;
      const wicketRatio = wicketsInHand / maxWickets;

      // Projected total formula
      const expectedFutureRR = Math.max(3, currentRunRate * (0.4 + 0.6 * wicketRatio));
      const projectedRuns = totalRuns + (remainingBalls / 6) * expectedFutureRR;

      const parScore = totalOvers * 8; // Standard 8 RPO benchmark
      const diff = projectedRuns - parScore;

      const prob = 50 + (diff / parScore) * 50;
      battingWinProb = Math.min(92, Math.max(8, Math.round(prob)));
    }
  } else {
    // Case 4: Second Innings (Chasing)
    const targetRuns = match.targetRuns || ((match.innings1?.totalRuns ?? 0) + 1);
    const requiredRuns = Math.max(0, targetRuns - totalRuns);
    const remainingBalls = Math.max(0, totalBalls - ballsBowled);

    if (requiredRuns <= 0) {
      battingWinProb = 100;
    } else if (wicketsInHand <= 0 || (remainingBalls <= 0 && requiredRuns > 0)) {
      battingWinProb = 0;
    } else {
      const rrr = (requiredRuns / Math.max(1, remainingBalls)) * 6;
      const wicketRatio = wicketsInHand / maxWickets;

      const parRRR = 5.5 + 4.5 * wicketRatio;
      const diff = parRRR - rrr;

      let rawProb = 50 + diff * 8.5;

      const completionRatio = totalRuns / targetRuns;
      if (completionRatio > 0.8 && requiredRuns < 20 && wicketsInHand >= 3) {
        rawProb += 8;
      }

      battingWinProb = Math.min(98, Math.max(2, Math.round(rawProb)));
    }
  }

  const teamAWinProb = isBattingTeamA ? battingWinProb : 100 - battingWinProb;
  const teamBWinProb = 100 - teamAWinProb;

  return {
    teamAWinProb,
    teamBWinProb,
    battingTeamId,
    bowlingTeamId: isBattingTeamA ? match.teamB.id : match.teamA.id,
  };
}
