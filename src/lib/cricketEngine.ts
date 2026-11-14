import {
  BallEvent,
  CricketMatch,
  CustomCricketRules,
  InningsSummary,
  MatchResult,
  Player,
  PlayerMatchStat,
} from '../types/cricket';

export function formatOvers(legalBalls: number, ballsPerOver: number = 6): string {
  const completeOvers = Math.floor(legalBalls / ballsPerOver);
  const remainingBalls = legalBalls % ballsPerOver;
  return `${completeOvers}.${remainingBalls}`;
}

export function parseOversToBalls(oversStr: string, ballsPerOver: number = 6): number {
  const parts = oversStr.split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return overs * ballsPerOver + balls;
}

export function calculateRunRate(runs: number, legalBalls: number, ballsPerOver: number = 6): number {
  if (legalBalls === 0) return 0;
  const overs = legalBalls / ballsPerOver;
  return Number((runs / overs).toFixed(2));
}

export function calculateStrikeRate(runs: number, ballsFaced: number): number {
  if (ballsFaced === 0) return 0;
  return Number(((runs / ballsFaced) * 100).toFixed(2));
}

export function calculateEconomy(runsConceded: number, legalBalls: number, ballsPerOver: number = 6): number {
  if (legalBalls === 0) return 0;
  const overs = legalBalls / ballsPerOver;
  return Number((runsConceded / overs).toFixed(2));
}

/**
 * Deterministically reconstructs an innings summary from an array of ball-by-ball delivery events.
 */
export function buildInningsSummary(
  balls: BallEvent[],
  teamId: string,
  teamName: string,
  playersMap: Record<string, Player>,
  rules: CustomCricketRules,
  totalOvers: number,
  targetRuns?: number
): InningsSummary {
  const ballsPerOver = rules.legalBallsPerOver || 6;
  const maxWickets = rules.maxWickets;

  const summary: InningsSummary = {
    teamId,
    teamName,
    totalRuns: 0,
    wickets: 0,
    legalOvers: 0,
    legalBalls: 0,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
      total: 0,
    },
    isCompleted: false,
    batters: {},
    bowlers: {},
    fallOfWickets: [],
  };

  // Helper to ensure batter entry
  const getBatter = (id: string, name?: string) => {
    if (!summary.batters[id]) {
      summary.batters[id] = {
        playerId: id,
        playerName: name || playersMap[id]?.fullName || 'Unknown Batter',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      };
    }
    return summary.batters[id];
  };

  // Helper to ensure bowler entry
  const getBowler = (id: string, name?: string) => {
    if (!summary.bowlers[id]) {
      summary.bowlers[id] = {
        playerId: id,
        playerName: name || playersMap[id]?.fullName || 'Unknown Bowler',
        overs: 0,
        balls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
      };
    }
    return summary.bowlers[id];
  };

  // Track over-by-over bowler runs and legal balls for maiden calculations
  const overRunsByBowler: Record<string, Record<number, number>> = {};
  const overLegalBallsByBowler: Record<string, Record<number, number>> = {};

  for (const b of balls) {
    const runsOffBat = b.runsBatter || 0;
    const extraRuns = b.extraRuns || 0;
    const totalBallRuns = b.totalRunsOnBall || runsOffBat + extraRuns;

    // 1. Team total
    summary.totalRuns += totalBallRuns;

    // 2. Extras accounting
    if (b.extraType === 'wide') {
      summary.extras.wides += extraRuns;
      summary.extras.total += extraRuns;
    } else if (b.extraType === 'noBall') {
      summary.extras.noBalls += extraRuns;
      summary.extras.total += extraRuns;
    } else if (b.extraType === 'bye') {
      summary.extras.byes += extraRuns;
      summary.extras.total += extraRuns;
    } else if (b.extraType === 'legBye') {
      summary.extras.legByes += extraRuns;
      summary.extras.total += extraRuns;
    } else if (b.extraType === 'penalty') {
      summary.extras.penalty += extraRuns;
      summary.extras.total += extraRuns;
    }

    // 3. Batter stats
    const batter = getBatter(b.strikerId);
    if (b.extraType !== 'wide') {
      batter.balls += 1;
    }
    batter.runs += runsOffBat;
    if (runsOffBat === 4) batter.fours += 1;
    if (runsOffBat === 6) batter.sixes += 1;
    batter.strikeRate = calculateStrikeRate(batter.runs, batter.balls);

    // 4. Bowler stats
    const bowler = getBowler(b.bowlerId);
    if (!overRunsByBowler[b.bowlerId]) {
      overRunsByBowler[b.bowlerId] = {};
      overLegalBallsByBowler[b.bowlerId] = {};
    }
    if (overRunsByBowler[b.bowlerId][b.overNumber] === undefined) {
      overRunsByBowler[b.bowlerId][b.overNumber] = 0;
      overLegalBallsByBowler[b.bowlerId][b.overNumber] = 0;
    }

    // Bowler runs: runs off bat + wide + noBall (byes/leg-byes are not charged to bowler)
    let bowlerCharged = runsOffBat;
    if (b.extraType === 'wide' || b.extraType === 'noBall') {
      bowlerCharged += extraRuns;
    }
    bowler.runsConceded += bowlerCharged;
    overRunsByBowler[b.bowlerId][b.overNumber] += bowlerCharged;

    if (b.isLegal) {
      bowler.balls += 1;
      summary.legalBalls += 1;
      overLegalBallsByBowler[b.bowlerId][b.overNumber] += 1;
    }

    // 5. Wicket stats
    if (b.isWicket && b.wicketDetails) {
      summary.wickets += 1;
      const dismissedId = b.wicketDetails.dismissedPlayerId || b.strikerId;
      const dismissedBatter = getBatter(dismissedId);
      dismissedBatter.isOut = true;

      const bowlerName = playersMap[b.bowlerId]?.fullName || 'Bowler';
      const fielderName = b.wicketDetails.fielderId
        ? playersMap[b.wicketDetails.fielderId]?.fullName || 'Fielder'
        : null;

      let dismissalText = 'out';
      switch (b.wicketDetails.type) {
        case 'bowled':
          dismissalText = `b ${bowlerName}`;
          bowler.wickets += 1;
          break;
        case 'caught':
          dismissalText = fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
          bowler.wickets += 1;
          break;
        case 'lbw':
          dismissalText = `lbw b ${bowlerName}`;
          bowler.wickets += 1;
          break;
        case 'stumped':
          dismissalText = fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
          bowler.wickets += 1;
          break;
        case 'hit_wicket':
          dismissalText = `hit wicket b ${bowlerName}`;
          bowler.wickets += 1;
          break;
        case 'run_out':
          dismissalText = fielderName ? `run out (${fielderName})` : 'run out';
          break;
        case 'retired_hurt':
          dismissalText = 'retired hurt';
          break;
        case 'retired_out':
          dismissalText = 'retired out';
          break;
      }
      dismissedBatter.dismissal = dismissalText;

      summary.fallOfWickets.push({
        wicketNumber: summary.wickets,
        score: summary.totalRuns,
        over: formatOvers(summary.legalBalls, ballsPerOver),
        playerOutId: dismissedId,
      });
    }

    // Check target in chase
    if (targetRuns && summary.totalRuns >= targetRuns) {
      summary.isCompleted = true;
      summary.completedReason = 'Target reached';
      break;
    }

    // Check max wickets fallen
    if (summary.wickets >= maxWickets) {
      summary.isCompleted = true;
      summary.completedReason = 'All wickets fallen';
      break;
    }

    // Check overs completed
    if (summary.legalBalls >= totalOvers * ballsPerOver) {
      summary.isCompleted = true;
      summary.completedReason = 'Configured overs completed';
      break;
    }
  }

  // Finalize bowler maidens & economies
  for (const bowlerId of Object.keys(summary.bowlers)) {
    const bowler = summary.bowlers[bowlerId];
    bowler.overs = Number(formatOvers(bowler.balls, ballsPerOver));
    bowler.economy = calculateEconomy(bowler.runsConceded, bowler.balls, ballsPerOver);

    // Count maidens (completed overs with 0 runs)
    let maidens = 0;
    const overMap = overRunsByBowler[bowlerId] || {};
    const ballsMap = overLegalBallsByBowler[bowlerId] || {};
    for (const [ovNum, conceded] of Object.entries(overMap)) {
      if (conceded === 0 && ballsMap[Number(ovNum)] === ballsPerOver) {
        maidens += 1;
      }
    }
    bowler.maidens = maidens;
  }

  summary.legalOvers = Number(formatOvers(summary.legalBalls, ballsPerOver));
  return summary;
}

/**
 * Determines who is currently on strike and bowling based on the last ball and partnership state.
 */
export function getNextStrikeState(
  lastBall: BallEvent | null,
  strikerId: string,
  nonStrikerId: string,
  runsOnBat: number,
  isExtraWideOrNoBall: boolean,
  isLegalOverComplete: boolean,
  dismissedId?: string,
  newBatterId?: string
): { nextStrikerId: string; nextNonStrikerId: string } {
  let sId = strikerId;
  let nsId = nonStrikerId;

  // 1. Handle Wicket Dismissal
  if (dismissedId) {
    if (newBatterId && newBatterId !== 'none' && newBatterId !== '') {
      // Incoming batter replaces the dismissed player
      if (dismissedId === sId) {
        sId = newBatterId;
      } else if (dismissedId === nsId) {
        nsId = newBatterId;
      }
    } else {
      // No incoming batter (e.g. last player remaining in solo batter mode, or all out)
      if (dismissedId === sId) {
        // Dismissed striker leaves; surviving non-striker moves to strike if present
        sId = nsId !== 'none' ? nsId : '';
        nsId = 'none';
      } else if (dismissedId === nsId) {
        // Dismissed non-striker leaves; striker stays on strike, non-striker becomes 'none'
        nsId = 'none';
      }
    }
  }

  // 2. Single Batter (Solo) Mode: if non-striker is 'none' or empty, striker stays on strike
  if (!nsId || nsId === 'none') {
    return { nextStrikerId: sId, nextNonStrikerId: 'none' };
  }

  // 3. Strike changes on odd runs completed off bat or running extras
  if (runsOnBat % 2 === 1) {
    const temp = sId;
    sId = nsId;
    nsId = temp;
  }

  // 4. At the end of an over, batsmen swap ends for the next over
  if (isLegalOverComplete) {
    const temp = sId;
    sId = nsId;
    nsId = temp;
  }

  return { nextStrikerId: sId, nextNonStrikerId: nsId };
}

/**
 * Calculates official match result from completed or in-progress innings.
 */
export function evaluateMatchResult(match: CricketMatch): MatchResult | null {
  if (!match.innings1 || !match.innings2) return null;

  const teamAName = match.teamA.name;
  const teamBName = match.teamB.name;
  const battingFirstTeamId = match.innings1.teamId;
  const battingSecondTeamId = match.innings2.teamId;

  const team1Runs = match.innings1.totalRuns;
  const team2Runs = match.innings2.totalRuns;
  const maxWickets = match.rules.maxWickets;
  const wickets2 = match.innings2.wickets;

  // Has chasing team surpassed target?
  if (team2Runs > team1Runs) {
    const wicketsRemaining = maxWickets - wickets2;
    const winningTeamId = battingSecondTeamId;
    const winningName = winningTeamId === match.teamA.id ? teamAName : teamBName;
    return {
      winnerTeamId: winningTeamId,
      winType: 'wickets',
      margin: wicketsRemaining,
      summaryText: `${winningName} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`,
    };
  }

  // Has 2nd innings completed with team2 having fewer runs?
  if (match.innings2.isCompleted) {
    if (team2Runs < team1Runs) {
      const runMargin = team1Runs - team2Runs;
      const winningTeamId = battingFirstTeamId;
      const winningName = winningTeamId === match.teamA.id ? teamAName : teamBName;
      return {
        winnerTeamId: winningTeamId,
        winType: 'runs',
        margin: runMargin,
        summaryText: `${winningName} won by ${runMargin} run${runMargin === 1 ? '' : 's'}`,
      };
    } else if (team2Runs === team1Runs) {
      return {
        winnerTeamId: null,
        winType: 'tie',
        margin: 0,
        summaryText: 'Match tied',
      };
    }
  }

  return null;
}

/**
 * Automatically computes individual player match stats from an official match scorecard.
 */
export function generatePlayerMatchStats(
  match: CricketMatch,
  ballsInnings1: BallEvent[],
  ballsInnings2: BallEvent[]
): PlayerMatchStat[] {
  const statsMap: Record<string, PlayerMatchStat> = {};
  const allBalls = [...ballsInnings1, ...ballsInnings2];

  // Helper to init player stat
  const getStat = (playerId: string, teamId: string): PlayerMatchStat => {
    if (!statsMap[playerId]) {
      const isTeamA = teamId === match.teamA.id;
      const opponentName = isTeamA ? match.teamB.name : match.teamA.name;

      statsMap[playerId] = {
        id: `${match.id}_${playerId}`,
        playerId,
        matchId: match.id,
        teamId,
        matchTitle: match.title,
        matchDate: match.dateTime,
        opponentName,
        matchResult: match.result?.summaryText || 'Match completed',
        battingRuns: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        dismissalStatus: 'Did not bat',
        bowlingBalls: 0,
        oversBowled: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        catches: 0,
        runOuts: 0,
        potmAward: match.result?.playerOfTheMatchId === playerId,
        createdAt: new Date().toISOString(),
      };
    }
    return statsMap[playerId];
  };

  // Populate participating players in team rosters
  match.teamA.playerIds.forEach((pId) => getStat(pId, match.teamA.id));
  match.teamB.playerIds.forEach((pId) => getStat(pId, match.teamB.id));

  // Process innings 1 batters
  if (match.innings1) {
    for (const [pId, bStat] of Object.entries(match.innings1.batters)) {
      const p = getStat(pId, match.innings1.teamId);
      p.battingRuns = bStat.runs;
      p.ballsFaced = bStat.balls;
      p.fours = bStat.fours;
      p.sixes = bStat.sixes;
      p.strikeRate = bStat.strikeRate;
      p.dismissalStatus = bStat.isOut ? bStat.dismissal || 'Out' : 'Not out';
    }
    for (const [pId, bowStat] of Object.entries(match.innings1.bowlers)) {
      const p = getStat(pId, match.teamA.id === match.innings1.teamId ? match.teamB.id : match.teamA.id);
      p.bowlingBalls += bowStat.balls;
      p.runsConceded += bowStat.runsConceded;
      p.wickets += bowStat.wickets;
      p.oversBowled = Number(formatOvers(p.bowlingBalls, match.rules.legalBallsPerOver));
      p.economy = calculateEconomy(p.runsConceded, p.bowlingBalls, match.rules.legalBallsPerOver);
    }
  }

  // Process innings 2 batters
  if (match.innings2) {
    for (const [pId, bStat] of Object.entries(match.innings2.batters)) {
      const p = getStat(pId, match.innings2.teamId);
      p.battingRuns = bStat.runs;
      p.ballsFaced = bStat.balls;
      p.fours = bStat.fours;
      p.sixes = bStat.sixes;
      p.strikeRate = bStat.strikeRate;
      p.dismissalStatus = bStat.isOut ? bStat.dismissal || 'Out' : 'Not out';
    }
    for (const [pId, bowStat] of Object.entries(match.innings2.bowlers)) {
      const p = getStat(pId, match.teamA.id === match.innings2.teamId ? match.teamB.id : match.teamA.id);
      p.bowlingBalls += bowStat.balls;
      p.runsConceded += bowStat.runsConceded;
      p.wickets += bowStat.wickets;
      p.oversBowled = Number(formatOvers(p.bowlingBalls, match.rules.legalBallsPerOver));
      p.economy = calculateEconomy(p.runsConceded, p.bowlingBalls, match.rules.legalBallsPerOver);
    }
  }

  // Tally fielding catches and run-outs from ball events
  for (const b of allBalls) {
    if (b.isWicket && b.wicketDetails?.fielderId) {
      const fielderStat = getStat(b.wicketDetails.fielderId, '');
      if (b.wicketDetails.type === 'caught') {
        fielderStat.catches += 1;
      } else if (b.wicketDetails.type === 'run_out') {
        fielderStat.runOuts += 1;
      }
    }
  }

  return Object.values(statsMap);
}
