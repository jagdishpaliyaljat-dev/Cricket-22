export type UserRole = 'admin' | 'scorer' | 'player';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  fcmTokens?: string[];
  createdAt?: string;
}

export type PlayingRole =
  | 'top_order_batter'
  | 'middle_order_batter'
  | 'wicketkeeper_batter'
  | 'batting_allrounder'
  | 'bowling_allrounder'
  | 'pace_bowler'
  | 'spin_bowler';

export type BattingStyle = 'right_hand_bat' | 'left_hand_bat';

export type BowlingStyle =
  | 'right_arm_fast'
  | 'right_arm_medium'
  | 'right_arm_spin'
  | 'left_arm_fast'
  | 'left_arm_spin'
  | 'none';

export interface PlayerCareerStats {
  matches: number;
  innings: number;
  runs: number;
  highestScore: number;
  notOuts: number;
  fifties?: number;
  hundreds?: number;
  fours: number;
  sixes: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
  ballsBowled: number;
  runsConceded: number;
  bestBowlingRuns: number;
  bestBowlingWickets: number;
  catches: number;
  runOuts: number;
  potmAwards: number;
}

export interface Player {
  id: string;
  userId?: string;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  dob?: string;
  playingRole: PlayingRole;
  secondaryRole?: string;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  jerseyNumber?: number;
  photoUrl?: string;
  status: 'active' | 'inactive';
  verificationStatus?: 'verified' | 'pending' | 'blocked';
  registrationDate: string;
  location?: string;
  teamId?: string;
  teamName?: string;
  bio?: string;
  career: PlayerCareerStats;
  createdAt?: string;
  updatedAt?: string;
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'not_responded';

export interface MatchAvailability {
  id: string;
  matchId: string;
  playerId: string;
  status: AvailabilityStatus;
  updatedAt: string;
}

export interface CustomCricketRules {
  legalBallsPerOver: number; // usually 6
  maxWickets: number; // e.g. teamSize - 1
  wideRuns: number; // default 1
  noBallRuns: number; // default 1
  freeHitOnNoBall: boolean; // default true
  byesAllowed: boolean; // default true
  legByesAllowed: boolean; // default true
  superOverOnTie: boolean; // default false
  maxOversPerBowler?: number; // e.g. Math.ceil(overs / 5)
  commonPlayerIds?: string[];
}

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired_hurt'
  | 'retired_out';

export interface WicketDetails {
  type: WicketType;
  dismissedPlayerId: string;
  bowlerId: string;
  fielderId?: string | null;
  newBatterId?: string | null;
}

export type ExtraType = 'none' | 'wide' | 'noBall' | 'bye' | 'legBye' | 'penalty';

export interface BallEvent {
  id: string;
  matchId: string;
  innings: 1 | 2;
  overNumber: number; // 0-indexed or 1-indexed
  ballInOver: number; // legal ball count in current over (1 to legalBallsPerOver)
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  runsBatter: number;
  extraType: ExtraType;
  extraRuns: number;
  isLegal: boolean;
  isWicket: boolean;
  wicketDetails?: WicketDetails;
  totalRunsOnBall: number;
  timestamp: string;
  commentary?: string;
}

export interface BatterInningsStat {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerInningsStat {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}

export interface InningsSummary {
  teamId: string;
  teamName: string;
  totalRuns: number;
  wickets: number;
  legalOvers: number;
  legalBalls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
  isCompleted: boolean;
  completedReason?: string;
  batters: Record<string, BatterInningsStat>;
  bowlers: Record<string, BowlerInningsStat>;
  fallOfWickets: {
    wicketNumber: number;
    score: number;
    over: string;
    playerOutId: string;
  }[];
}

export interface MatchTeam {
  id: string;
  name: string;
  playerIds: string[];
  captainId?: string;
  wicketkeeperId?: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned';

export interface MatchResult {
  winnerTeamId: string | null;
  winType: 'runs' | 'wickets' | 'tie' | 'draw' | 'abandoned';
  margin?: number;
  summaryText: string;
  playerOfTheMatchId?: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface MatchToss {
  winnerTeamId: string;
  decision: 'bat' | 'bowl';
}

export interface CricketMatch {
  id: string;
  title: string;
  dateTime: string;
  venue: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  matchType?: string;
  description?: string;
  commonPlayerIds?: string[];
  reservePlayerIds?: string[];
  playersPerTeam: number;
  oversPerInnings: number;
  rules: CustomCricketRules;
  toss?: MatchToss;
  status: MatchStatus;
  currentInnings: 1 | 2;
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  currentBowlerId?: string;
  targetRuns?: number;
  innings1?: InningsSummary;
  innings2?: InningsSummary;
  result?: MatchResult;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerMatchStat {
  id: string;
  playerId: string;
  matchId: string;
  teamId: string;
  matchTitle: string;
  matchDate: string;
  opponentName: string;
  matchResult: string;
  battingRuns: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissalStatus: string;
  bowlingBalls: number;
  oversBowled: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  catches: number;
  runOuts: number;
  potmAward: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string; // Target user
  title: string;
  message: string;
  type: 'match_finish' | 'info' | 'alert';
  matchId?: string;
  isRead: boolean;
  createdAt: string;
}
