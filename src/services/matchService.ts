import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BallEvent,
  CricketMatch,
  MatchResult,
  MatchToss,
  Player,
} from '../types/cricket';
import {
  buildInningsSummary,
  evaluateMatchResult,
  generatePlayerMatchStats,
} from '../lib/cricketEngine';
import { generateBallCommentary } from '../utils/commentaryService';
import { recomputePlayerCareer } from './playerService';

const MATCHES_COLLECTION = 'matches';
const AUDIT_COLLECTION = 'auditLogs';

export async function fetchMatches(): Promise<CricketMatch[]> {
  try {
    const snap = await getDocs(collection(db, MATCHES_COLLECTION));
    return snap.docs.map((d) => d.data() as CricketMatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MATCHES_COLLECTION);
  }
}

export function subscribeMatches(onData: (matches: CricketMatch[]) => void) {
  return onSnapshot(
    collection(db, MATCHES_COLLECTION),
    (snap) => {
      const matches = snap.docs.map((d) => d.data() as CricketMatch);
      // Sort: live first, then scheduled, then completed
      matches.sort((a, b) => {
        const order = { live: 0, scheduled: 1, completed: 2, abandoned: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      });
      onData(matches);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MATCHES_COLLECTION);
    }
  );
}

export function subscribeSingleMatch(matchId: string, onData: (match: CricketMatch | null) => void) {
  return onSnapshot(
    doc(db, MATCHES_COLLECTION, matchId),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as CricketMatch);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${MATCHES_COLLECTION}/${matchId}`);
    }
  );
}

export async function createMatch(matchData: CricketMatch): Promise<CricketMatch> {
  try {
    await setDoc(doc(db, MATCHES_COLLECTION, matchData.id), {
      ...matchData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return matchData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MATCHES_COLLECTION}/${matchData.id}`);
  }
}

export async function updateMatch(matchId: string, updates: Partial<CricketMatch>): Promise<void> {
  try {
    const ref = doc(db, MATCHES_COLLECTION, matchId);
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        sanitized[key] = val;
      }
    }
    sanitized.updatedAt = new Date().toISOString();
    await updateDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MATCHES_COLLECTION}/${matchId}`);
    throw error;
  }
}

export async function deleteMatch(matchId: string): Promise<void> {
  try {
    console.log(`[MatchService] Initiating deletion for match: ${matchId}`);
    try {
      const ballsSnap = await getDocs(collection(db, MATCHES_COLLECTION, matchId, 'balls'));
      for (const bDoc of ballsSnap.docs) {
        await deleteDoc(doc(db, MATCHES_COLLECTION, matchId, 'balls', bDoc.id));
      }
      console.log(`[MatchService] Cleaned ball subcollection for match: ${matchId}`);
    } catch (e) {
      console.warn('[MatchService] Could not clean ball subcollection during deleteMatch:', e);
    }
    const ref = doc(db, MATCHES_COLLECTION, matchId);
    await deleteDoc(ref);
    console.log(`[MatchService] Successfully deleted match document: ${matchId}`);
  } catch (error) {
    console.error(`[MatchService] Deletion failed for match: ${matchId}`, error);
    handleFirestoreError(error, OperationType.DELETE, `${MATCHES_COLLECTION}/${matchId}`);
    throw error;
  }
}

export async function recordToss(matchId: string, toss: MatchToss): Promise<void> {
  try {
    await updateDoc(doc(db, MATCHES_COLLECTION, matchId), {
      toss,
      status: 'live',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MATCHES_COLLECTION}/${matchId}`);
  }
}

// ----------------- Ball-by-Ball Delivery Management -----------------

export function subscribeBalls(
  matchId: string,
  innings: 1 | 2,
  onData: (balls: BallEvent[]) => void
) {
  const ballsRef = collection(db, MATCHES_COLLECTION, matchId, 'balls');
  const q = query(ballsRef, where('innings', '==', innings), orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      const balls = snap.docs.map((d) => d.data() as BallEvent);
      // Fallback in-memory sort by timestamp to guarantee order
      balls.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
      onData(balls);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `${MATCHES_COLLECTION}/${matchId}/balls`);
    }
  );
}

export async function fetchMatchBalls(matchId: string): Promise<BallEvent[]> {
  try {
    const ballsRef = collection(db, MATCHES_COLLECTION, matchId, 'balls');
    const q = query(ballsRef, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    const balls = snap.docs.map((d) => d.data() as BallEvent);
    balls.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    return balls;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${MATCHES_COLLECTION}/${matchId}/balls`);
  }
}

import { queueOfflineBall, getOfflineQueue, removeOfflineBall } from './offlineQueueService';

/**
 * Saves a new delivery ball event and synchronizes the match innings summary in Firestore,
 * with local-first IndexedDB offline queuing support.
 */
export async function addBallEvent(
  match: CricketMatch,
  ball: BallEvent,
  playersMap: Record<string, Player>,
  nextStrikerId?: string,
  nextNonStrikerId?: string
): Promise<void> {
  const ballDocRef = doc(db, MATCHES_COLLECTION, match.id, 'balls', ball.id);
  try {
    // Generate AI commentary
    const commentary = await generateBallCommentary(ball, match, playersMap);
    const ballWithCommentary = { ...ball, commentary };
    
    await setDoc(ballDocRef, ballWithCommentary);

    // Fetch all balls for this innings to calculate authoritative summary
    const allBalls = await fetchMatchBalls(match.id);
    const inningsBalls = allBalls.filter((b) => b.innings === match.currentInnings);

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
        : match.toss?.winnerTeamId;

    const battingTeamName =
      battingTeamId === match.teamA.id ? match.teamA.name : match.teamB.name;

    const updatedSummary = buildInningsSummary(
      inningsBalls,
      battingTeamId || match.teamA.id,
      battingTeamName,
      playersMap,
      match.rules,
      match.oversPerInnings,
      match.currentInnings === 2 ? match.targetRuns : undefined
    );

    const matchUpdates: Partial<CricketMatch> = {
      updatedAt: new Date().toISOString(),
      currentStrikerId: nextStrikerId || ball.strikerId,
      currentNonStrikerId: nextNonStrikerId || ball.nonStrikerId,
      currentBowlerId: ball.bowlerId,
    };

    if (match.currentInnings === 1) {
      matchUpdates.innings1 = updatedSummary;
      if (updatedSummary.isCompleted) {
        matchUpdates.targetRuns = updatedSummary.totalRuns + 1;
        // Optionally, we could set a flag or notification here, 
        // but the UI will handle the transition modal based on innings1.isCompleted.
      }
    } else {
      matchUpdates.innings2 = updatedSummary;
      
      // Automatic match completion logic for 2nd innings
      const result = evaluateMatchResult({
        ...match,
        innings2: updatedSummary,
      });

      if (result || updatedSummary.isCompleted) {
        matchUpdates.result = result || undefined;
        matchUpdates.status = 'completed';
      }
    }

    await updateDoc(doc(db, MATCHES_COLLECTION, match.id), matchUpdates);
  } catch (error) {
    console.warn('Network offline or write failed. Queuing ball in IndexedDB offline queue:', error);
    await queueOfflineBall(ball);
  }
}

export async function syncOfflineQueue(match: CricketMatch, playersMap: Record<string, Player>): Promise<void> {
  const queuedBalls = await getOfflineQueue();
  if (queuedBalls.length === 0) return;

  for (const ball of queuedBalls) {
    if (ball.matchId === match.id) {
      try {
        const ballDocRef = doc(db, MATCHES_COLLECTION, match.id, 'balls', ball.id);
        await setDoc(ballDocRef, ball);
        await removeOfflineBall(ball.id);
      } catch (e) {
        console.warn('Still offline during queue sync for ball:', ball.id);
        return; // stop sync attempt if still offline
      }
    }
  }

  // Refresh summary after sync
  const allBalls = await fetchMatchBalls(match.id);
  const inningsBalls = allBalls.filter((b) => b.innings === match.currentInnings);
  const battingTeamId =
    match.currentInnings === 1
      ? match.toss?.decision === 'bat' ? match.toss.winnerTeamId : match.toss?.winnerTeamId === match.teamA.id ? match.teamB.id : match.teamA.id
      : match.toss?.decision === 'bat' ? match.toss?.winnerTeamId === match.teamA.id ? match.teamB.id : match.teamA.id : match.toss?.winnerTeamId;
  const battingTeamName = battingTeamId === match.teamA.id ? match.teamA.name : match.teamB.name;

  const updatedSummary = buildInningsSummary(
    inningsBalls,
    battingTeamId || match.teamA.id,
    battingTeamName,
    playersMap,
    match.rules,
    match.oversPerInnings,
    match.currentInnings === 2 ? match.targetRuns : undefined
  );

  await updateDoc(doc(db, MATCHES_COLLECTION, match.id), {
    [match.currentInnings === 1 ? 'innings1' : 'innings2']: updatedSummary,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Undoes the most recent ball event and restores accurate scorecard state.
 */
export async function undoLastBallEvent(
  match: CricketMatch,
  playersMap: Record<string, Player>
): Promise<void> {
  try {
    const allBalls = await fetchMatchBalls(match.id);
    const inningsBalls = allBalls.filter((b) => b.innings === match.currentInnings);
    if (inningsBalls.length === 0) return;

    const lastBall = inningsBalls[inningsBalls.length - 1];
    await deleteDoc(doc(db, MATCHES_COLLECTION, match.id, 'balls', lastBall.id));

    // Reconstruct summary with last ball removed
    const remainingBalls = inningsBalls.slice(0, inningsBalls.length - 1);

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
        : match.toss?.winnerTeamId;

    const battingTeamName =
      battingTeamId === match.teamA.id ? match.teamA.name : match.teamB.name;

    const restoredSummary = buildInningsSummary(
      remainingBalls,
      battingTeamId || match.teamA.id,
      battingTeamName,
      playersMap,
      match.rules,
      match.oversPerInnings,
      match.currentInnings === 2 ? match.targetRuns : undefined
    );

    const matchUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      status: 'live', // restore to live if it had completed
      result: deleteField(),
    };

    if (remainingBalls.length > 0) {
      const lastRemaining = remainingBalls[remainingBalls.length - 1];
      matchUpdates.currentStrikerId = lastRemaining.strikerId;
      matchUpdates.currentNonStrikerId = lastRemaining.nonStrikerId;
      matchUpdates.currentBowlerId = lastRemaining.bowlerId;
    }

    if (match.currentInnings === 1) {
      matchUpdates.innings1 = restoredSummary;
      matchUpdates.targetRuns = deleteField();
    } else {
      matchUpdates.innings2 = restoredSummary;
    }

    await updateDoc(doc(db, MATCHES_COLLECTION, match.id), matchUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MATCHES_COLLECTION}/${match.id}/balls`);
  }
}

/**
 * Transitions from Innings 1 to Innings 2.
 */
export async function startSecondInnings(
  match: CricketMatch,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string
): Promise<void> {
  try {
    const target = (match.innings1?.totalRuns || 0) + 1;
    await updateDoc(doc(db, MATCHES_COLLECTION, match.id), {
      currentInnings: 2,
      targetRuns: target,
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MATCHES_COLLECTION}/${match.id}`);
  }
}

/**
 * Idempotently finalizes a match result, writes individual player performance records,
 * and updates player career aggregates.
 */
import { sendBulkNotifications } from './notificationService';

export async function finalizeMatch(
  match: CricketMatch,
  result: MatchResult,
  adminUserId: string,
  adminName: string
): Promise<void> {
  try {
    const allBalls = await fetchMatchBalls(match.id);
    const balls1 = allBalls.filter((b) => b.innings === 1);
    const balls2 = allBalls.filter((b) => b.innings === 2);

    const completedMatch: CricketMatch = {
      ...match,
      status: 'completed',
      result: {
        ...result,
        finalizedAt: new Date().toISOString(),
        finalizedBy: adminUserId,
      },
      updatedAt: new Date().toISOString(),
    };

    // Calculate individual player match stats
    const playerStats = generatePlayerMatchStats(completedMatch, balls1, balls2);

    const batch = writeBatch(db);

    // 1. Update Match document
    batch.update(doc(db, MATCHES_COLLECTION, match.id), {
      status: 'completed',
      result: {
        ...completedMatch.result,
        playerOfTheMatchId: completedMatch.result?.playerOfTheMatchId || null,
      },
      updatedAt: new Date().toISOString(),
    });

    // 2. Set individual playerMatchStats documents with stable keys (idempotent)
    for (const stat of playerStats) {
      const statRef = doc(db, 'playerMatchStats', stat.id);
      batch.set(statRef, stat);
    }

    // 3. Add audit log
    const auditId = `audit_${Date.now()}`;
    const auditRef = doc(db, AUDIT_COLLECTION, auditId);
    batch.set(auditRef, {
      id: auditId,
      action: 'FINALIZE_MATCH',
      details: `Match "${match.title}" finalized with result: ${result.summaryText}. POTM: ${result.playerOfTheMatchId || 'None'}`,
      performedBy: adminUserId,
      performedByName: adminName,
      timestamp: new Date().toISOString(),
    });

    // Commit atomic batch
    await batch.commit();

    // 4. Send Notifications to involved players who are registered users
    try {
      const participatingPlayerIds = Array.from(new Set([
        ...match.teamA.playerIds,
        ...match.teamB.playerIds,
      ]));

      // Fetch player docs to get userIds
      const playerDocs = await Promise.all(
        participatingPlayerIds.map(id => getDoc(doc(db, 'players', id)))
      );

      const userNotifications: any[] = [];
      playerDocs.forEach(pSnap => {
        if (pSnap.exists()) {
          const pData = pSnap.data();
          if (pData.userId) {
            userNotifications.push({
              userId: pData.userId,
              title: 'Match Finished!',
              message: `${match.title}: ${result.summaryText}`,
              type: 'match_finish',
              matchId: match.id,
            });
          }
        }
      });

      if (userNotifications.length > 0) {
        await sendBulkNotifications(userNotifications);
      }
    } catch (notifErr) {
      console.warn('Failed to send player notifications:', notifErr);
    }

    // 5. Recompute career stats for all participating players
    const participatingPlayerIds = new Set([
      ...match.teamA.playerIds,
      ...match.teamB.playerIds,
    ]);

    for (const pId of participatingPlayerIds) {
      await recomputePlayerCareer(pId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MATCHES_COLLECTION}/${match.id}/finalize`);
  }
}

/**
 * Nominates or updates the 'Man of the Match' (Player of the Match) for a match.
 */
export async function nominatePlayerOfTheMatch(
  matchId: string,
  playerId: string,
  nominatedByUserId?: string,
  nominatedByName?: string
): Promise<void> {
  try {
    const ref = doc(db, MATCHES_COLLECTION, matchId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Match not found');
    }
    const matchData = snap.data() as CricketMatch;

    const existingResult: MatchResult = matchData.result || {
      winnerTeamId: null,
      winType: 'runs',
      summaryText: 'Match Completed',
    };

    const updatedResult: MatchResult = {
      ...existingResult,
      playerOfTheMatchId: playerId,
      finalizedAt: existingResult.finalizedAt || new Date().toISOString(),
    };

    await updateDoc(ref, {
      result: updatedResult,
      updatedAt: new Date().toISOString(),
    });

    if (nominatedByUserId) {
      const auditId = `audit_motm_${Date.now()}`;
      const auditRef = doc(db, AUDIT_COLLECTION, auditId);
      await setDoc(auditRef, {
        id: auditId,
        action: 'NOMINATE_POTM',
        details: `Nominated Player ID ${playerId} as Man of the Match for match "${matchData.title}"`,
        performedBy: nominatedByUserId,
        performedByName: nominatedByName || 'Admin/Scorer',
        timestamp: new Date().toISOString(),
      });
    }

    await recomputePlayerCareer(playerId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MATCHES_COLLECTION}/${matchId}/nominatePOTM`);
    throw error;
  }
}

export interface MatchValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates player rosters, existence, and career stats consistency before a match starts.
 */
export function validateMatchRosterAndCareer(
  match: CricketMatch,
  playersMap: Record<string, Player>
): MatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!match.teamA || !match.teamA.playerIds || match.teamA.playerIds.length === 0) {
    errors.push('Team A has no players assigned.');
  }
  if (!match.teamB || !match.teamB.playerIds || match.teamB.playerIds.length === 0) {
    errors.push('Team B has no players assigned.');
  }

  const allPlayerIds = [...(match.teamA?.playerIds || []), ...(match.teamB?.playerIds || [])];
  for (const pId of allPlayerIds) {
    const player = playersMap[pId];
    if (!player) {
      errors.push(`Player ID ${pId} assigned to team could not be found in player registry.`);
    } else {
      if (!player.career || typeof player.career.matches !== 'number' || player.career.matches < 0) {
        warnings.push(`Player ${player.fullName} (${pId}) has uninitialized career stats structure.`);
      }
    }
  }

  if (match.oversPerInnings <= 0) {
    errors.push('Overs per innings must be greater than 0.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

