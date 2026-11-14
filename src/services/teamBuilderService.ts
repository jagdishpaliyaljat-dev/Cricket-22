import { Player, PlayingRole } from '../types/cricket';

export interface TeamGenerationResult {
  teamA: Player[];
  teamB: Player[];
  reserves: Player[];
  error?: string;
  isBalanced: boolean;
}

/**
 * Calculates a player's composite balance rating based on career statistics and playing role.
 */
export function getPlayerRating(player: Player): number {
  const career = player.career;
  let rating = 50; // base rating

  // Batting factor
  if (career.innings > 0) {
    const battingAvg = career.runs / Math.max(1, career.innings - career.notOuts);
    rating += Math.min(30, battingAvg);
    const strikeRate = (career.runs / Math.max(1, career.ballsFaced)) * 100;
    rating += Math.min(15, (strikeRate - 100) * 0.2);
  }

  // Bowling factor
  if (career.oversBowled > 0) {
    const wicketsPerMatch = career.wickets / Math.max(1, career.matches);
    rating += Math.min(30, wicketsPerMatch * 15);
    const economy = career.runsConceded / Math.max(1, career.ballsBowled / 6);
    if (economy > 0 && economy < 8) {
      rating += (8 - economy) * 2;
    }
  }

  // Fielding factor
  rating += Math.min(10, (career.catches + career.runOuts) * 2);

  // POTM bonus
  rating += Math.min(10, career.potmAwards * 3);

  return Math.round(rating);
}

/**
 * Random team generation (clearly marked as purely random without claiming equal strength).
 */
export function generateRandomTeams(
  availablePlayers: Player[],
  playersPerTeam: number
): TeamGenerationResult {
  const totalRequired = playersPerTeam * 2;
  if (availablePlayers.length < totalRequired) {
    return {
      teamA: [],
      teamB: [],
      reserves: [],
      isBalanced: false,
      error: `Insufficient available players: ${availablePlayers.length} available, but ${totalRequired} are required for ${playersPerTeam} players per team.`,
    };
  }

  // Shuffle array using Fisher-Yates
  const shuffled = [...availablePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const teamA = shuffled.slice(0, playersPerTeam);
  const teamB = shuffled.slice(playersPerTeam, totalRequired);
  const reserves = shuffled.slice(totalRequired);

  return { teamA, teamB, reserves, isBalanced: false };
}

/**
 * Balanced team generation using role categorization and historical ratings.
 * Balances batters, bowlers, all-rounders, and keepers evenly between Team A and Team B.
 */
export function generateBalancedTeams(
  availablePlayers: Player[],
  playersPerTeam: number
): TeamGenerationResult {
  const totalRequired = playersPerTeam * 2;
  if (availablePlayers.length < totalRequired) {
    return {
      teamA: [],
      teamB: [],
      reserves: [],
      isBalanced: false,
      error: `Insufficient available players: ${availablePlayers.length} available, but ${totalRequired} are required for ${playersPerTeam} players per team.`,
    };
  }

  // Sort available players by their composite rating descending
  const sortedPlayers = [...availablePlayers].sort((a, b) => getPlayerRating(b) - getPlayerRating(a));

  // Partition by role category
  const keepers: Player[] = [];
  const allrounders: Player[] = [];
  const batters: Player[] = [];
  const bowlers: Player[] = [];

  for (const p of sortedPlayers) {
    const r: PlayingRole = p.playingRole;
    if (r === 'wicketkeeper_batter') keepers.push(p);
    else if (r === 'batting_allrounder' || r === 'bowling_allrounder') allrounders.push(p);
    else if (r === 'pace_bowler' || r === 'spin_bowler') bowlers.push(p);
    else batters.push(p);
  }

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  let scoreA = 0;
  let scoreB = 0;

  // Snake draft distribution function
  const distributeGroup = (group: Player[]) => {
    for (const player of group) {
      if (teamA.length >= playersPerTeam && teamB.length >= playersPerTeam) break;

      const rating = getPlayerRating(player);
      if (teamA.length < playersPerTeam && teamB.length < playersPerTeam) {
        if (scoreA <= scoreB) {
          teamA.push(player);
          scoreA += rating;
        } else {
          teamB.push(player);
          scoreB += rating;
        }
      } else if (teamA.length < playersPerTeam) {
        teamA.push(player);
        scoreA += rating;
      } else if (teamB.length < playersPerTeam) {
        teamB.push(player);
        scoreB += rating;
      }
    }
  };

  // Distribute roles systematically: WKs -> All-rounders -> Bowlers -> Batters
  distributeGroup(keepers);
  distributeGroup(allrounders);
  distributeGroup(bowlers);
  distributeGroup(batters);

  // Identify reserves (players not in Team A or Team B)
  const selectedIds = new Set([...teamA.map((p) => p.id), ...teamB.map((p) => p.id)]);
  const reserves = availablePlayers.filter((p) => !selectedIds.has(p.id));

  return { teamA, teamB, reserves, isBalanced: true };
}
