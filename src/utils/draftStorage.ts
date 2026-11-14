export interface CreateMatchDraft {
  matchTitle: string;
  matchVenue: string;
  matchDateTime: string;
  teamAName: string;
  teamBName: string;
  playersPerTeam: number;
  oversPerInnings: number;
  legalBallsPerOver: number;
  wideRuns: number;
  noBallRuns: number;
  freeHitOnNoBall: boolean;
  byesAllowed: boolean;
  legByesAllowed: boolean;
  superOverOnTie: boolean;
  savedAt: number;
}

export interface ScoringDraft {
  matchId: string;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  showWicketModal?: boolean;
  dismissedPlayerId?: string;
  wicketType?: string;
  fielderId?: string;
  newBatterId?: string;
  showExtrasModal?: boolean;
  selectedExtraType?: string;
  extraBoundaryRuns?: number;
  showInningsTransitionModal?: boolean;
  inn2Striker?: string;
  inn2NonStriker?: string;
  inn2Bowler?: string;
  showFinalizeModal?: boolean;
  potmId?: string;
  matchOversSetup?: number;
  activeTab?: string;
  savedAt: number;
}

const CREATE_MATCH_KEY = 'localxi_draft_create_match';
const CREATE_MATCH_MODAL_OPEN_KEY = 'localxi_create_match_modal_open';
const ACTIVE_SCORING_MATCH_KEY = 'localxi_active_scoring_match_id';
const SCORING_DRAFT_PREFIX = 'localxi_draft_scoring_';

// ----------------------------------------------------
// CREATE MATCH DRAFT HELPERS
// ----------------------------------------------------

export function saveCreateMatchDraft(draft: Omit<CreateMatchDraft, 'savedAt'>): void {
  try {
    const payload: CreateMatchDraft = {
      ...draft,
      savedAt: Date.now(),
    };
    localStorage.setItem(CREATE_MATCH_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Unable to save Create Match draft to localStorage:', err);
  }
}

export function loadCreateMatchDraft(): CreateMatchDraft | null {
  try {
    const item = localStorage.getItem(CREATE_MATCH_KEY);
    if (!item) return null;
    return JSON.parse(item) as CreateMatchDraft;
  } catch (err) {
    console.warn('Unable to load Create Match draft from localStorage:', err);
    return null;
  }
}

export function clearCreateMatchDraft(): void {
  try {
    localStorage.removeItem(CREATE_MATCH_KEY);
  } catch (err) {
    console.warn('Unable to clear Create Match draft from localStorage:', err);
  }
}

export function saveCreateMatchModalOpen(isOpen: boolean): void {
  try {
    if (isOpen) {
      localStorage.setItem(CREATE_MATCH_MODAL_OPEN_KEY, 'true');
    } else {
      localStorage.removeItem(CREATE_MATCH_MODAL_OPEN_KEY);
    }
  } catch (err) {
    console.warn('Unable to save create match modal state to localStorage:', err);
  }
}

export function isCreateMatchModalOpen(): boolean {
  try {
    return localStorage.getItem(CREATE_MATCH_MODAL_OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function hasCreateMatchDraft(): boolean {
  try {
    const draft = loadCreateMatchDraft();
    if (!draft) return false;
    // Considered a draft if any key fields differ from blank or initial default
    return Boolean(
      (draft.matchTitle && draft.matchTitle.trim().length > 0) ||
      (draft.teamAName && draft.teamAName !== 'Local XI Warriors') ||
      (draft.teamBName && draft.teamBName !== 'Metro Challengers') ||
      (draft.matchVenue && draft.matchVenue !== 'Central Community Oval') ||
      (draft.playersPerTeam && draft.playersPerTeam !== 7) ||
      (draft.oversPerInnings && draft.oversPerInnings !== 10) ||
      Boolean(draft.matchDateTime)
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// SCORING FORM DRAFT HELPERS
// ----------------------------------------------------

export function saveActiveScoringMatchId(matchId: string): void {
  try {
    localStorage.setItem(ACTIVE_SCORING_MATCH_KEY, matchId);
  } catch (err) {
    console.warn('Unable to save active scoring match ID to localStorage:', err);
  }
}

export function loadActiveScoringMatchId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SCORING_MATCH_KEY);
  } catch (err) {
    console.warn('Unable to load active scoring match ID from localStorage:', err);
    return null;
  }
}

export function clearActiveScoringMatchId(): void {
  try {
    localStorage.removeItem(ACTIVE_SCORING_MATCH_KEY);
  } catch (err) {
    console.warn('Unable to clear active scoring match ID from localStorage:', err);
  }
}

export function saveScoringDraft(matchId: string, draft: Partial<ScoringDraft>): void {
  try {
    const existing = loadScoringDraft(matchId) || { matchId, savedAt: Date.now() };
    const updated: ScoringDraft = {
      ...existing,
      ...draft,
      matchId,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${SCORING_DRAFT_PREFIX}${matchId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn(`Unable to save scoring draft for match ${matchId}:`, err);
  }
}

export function loadScoringDraft(matchId: string): ScoringDraft | null {
  try {
    const item = localStorage.getItem(`${SCORING_DRAFT_PREFIX}${matchId}`);
    if (!item) return null;
    return JSON.parse(item) as ScoringDraft;
  } catch (err) {
    console.warn(`Unable to load scoring draft for match ${matchId}:`, err);
    return null;
  }
}

export function clearScoringDraft(matchId: string): void {
  try {
    localStorage.removeItem(`${SCORING_DRAFT_PREFIX}${matchId}`);
  } catch (err) {
    console.warn(`Unable to clear scoring draft for match ${matchId}:`, err);
  }
}
