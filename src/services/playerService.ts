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
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Player, PlayerCareerStats, PlayerMatchStat, AppUser } from '../types/cricket';

const PLAYERS_COLLECTION = 'players';
const STATS_COLLECTION = 'playerMatchStats';
const USERS_COLLECTION = 'users';

export async function fetchAppUsers(): Promise<AppUser[]> {
  try {
    console.log('[PlayerService] db instance:', db);
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map((d) => d.data() as AppUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    return [];
  }
}

export function subscribeAppUsers(
  onData: (users: AppUser[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, USERS_COLLECTION),
    (snap) => {
      const users = snap.docs.map((d) => d.data() as AppUser);
      onData(users);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    }
  );
}

export function subscribeAdminUids(
  onData: (adminIds: string[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, 'admins'),
    (snap) => {
      onData(snap.docs.map((d) => d.id));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribeScorerUids(
  onData: (scorerIds: string[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, 'scorers'),
    (snap) => {
      onData(snap.docs.map((d) => d.id));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function updateUserRole(
  userId: string,
  email: string,
  newRole: 'admin' | 'scorer' | 'player',
  performedBy?: { uid: string; email?: string | null } | null
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const adminRef = doc(db, 'admins', userId);
    const scorerRef = doc(db, 'scorers', userId);

    // Update role in users document
    await setDoc(
      userRef,
      {
        role: newRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (newRole === 'admin') {
      // Add to admins collection
      await setDoc(
        adminRef,
        {
          uid: userId,
          email: email || '',
          assignedAt: new Date().toISOString(),
          assignedBy: performedBy?.email || performedBy?.uid || 'admin',
        },
        { merge: true }
      );

      // Clean up scorers collection if previously a scorer
      try {
        await deleteDoc(scorerRef);
      } catch (err) {
        // Safe to ignore
      }
    } else if (newRole === 'scorer') {
      // Add to scorers collection
      await setDoc(
        scorerRef,
        {
          uid: userId,
          email: email || '',
          assignedAt: new Date().toISOString(),
          assignedBy: performedBy?.email || performedBy?.uid || 'admin',
        },
        { merge: true }
      );

      // Clean up admins collection if previously an admin
      try {
        await deleteDoc(adminRef);
      } catch (err) {
        // Safe to ignore
      }
    } else {
      // Role is player - remove from both admins and scorers collections
      try {
        await deleteDoc(adminRef);
      } catch (err) {}
      try {
        await deleteDoc(scorerRef);
      } catch (err) {}
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
}

export async function createOrInviteUser(
  email: string,
  displayName: string,
  role: 'admin' | 'scorer' | 'player',
  performedBy?: { uid: string; email?: string | null } | null
): Promise<AppUser> {
  try {
    const cleanId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newUser: AppUser = {
      id: cleanId,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role,
      createdAt: new Date().toISOString(),
    };

    const userRef = doc(db, USERS_COLLECTION, cleanId);
    await setDoc(userRef, newUser, { merge: true });

    if (role === 'admin') {
      await setDoc(
        doc(db, 'admins', cleanId),
        {
          uid: cleanId,
          email: newUser.email,
          assignedAt: new Date().toISOString(),
          assignedBy: performedBy?.email || performedBy?.uid || 'admin',
        },
        { merge: true }
      );
    } else if (role === 'scorer') {
      await setDoc(
        doc(db, 'scorers', cleanId),
        {
          uid: cleanId,
          email: newUser.email,
          assignedAt: new Date().toISOString(),
          assignedBy: performedBy?.email || performedBy?.uid || 'admin',
        },
        { merge: true }
      );
    }

    return newUser;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, USERS_COLLECTION);
    throw error;
  }
}

export const initialCareerStats: PlayerCareerStats = {
  matches: 0,
  innings: 0,
  runs: 0,
  highestScore: 0,
  notOuts: 0,
  fours: 0,
  sixes: 0,
  ballsFaced: 0,
  wickets: 0,
  oversBowled: 0,
  ballsBowled: 0,
  runsConceded: 0,
  bestBowlingRuns: 0,
  bestBowlingWickets: 0,
  catches: 0,
  runOuts: 0,
  potmAwards: 0,
};

export async function fetchPlayers(): Promise<Player[]> {
  try {
    const snap = await getDocs(collection(db, PLAYERS_COLLECTION));
    return snap.docs.map((d) => d.data() as Player);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PLAYERS_COLLECTION);
  }
}

export function subscribePlayers(
  onData: (players: Player[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, PLAYERS_COLLECTION),
    (snap) => {
      const players = snap.docs.map((d) => d.data() as Player);
      onData(players);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, PLAYERS_COLLECTION);
    }
  );
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  try {
    const snap = await getDoc(doc(db, PLAYERS_COLLECTION, playerId));
    if (snap.exists()) {
      return snap.data() as Player;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PLAYERS_COLLECTION}/${playerId}`);
  }
}

function sanitizeFirestoreData<T extends Record<string, any>>(data: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export async function createPlayer(playerData: Omit<Player, 'career' | 'registrationDate'>): Promise<Player> {
  try {
    const newPlayer: Player = {
      ...playerData,
      registrationDate: new Date().toISOString(),
      career: { ...initialCareerStats },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sanitized = sanitizeFirestoreData(newPlayer);
    await setDoc(doc(db, PLAYERS_COLLECTION, newPlayer.id), sanitized);
    return newPlayer;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PLAYERS_COLLECTION}/${playerData.id}`);
    throw error;
  }
}

export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
  try {
    const ref = doc(db, PLAYERS_COLLECTION, playerId);
    const sanitized = sanitizeFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(ref, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PLAYERS_COLLECTION}/${playerId}`);
    throw error;
  }
}export async function deletePlayer(playerId: string): Promise<void> {
  try {
    console.log(`[PlayerService] Initiating deletion for player: ${playerId}`);
    const ref = doc(db, PLAYERS_COLLECTION, playerId);
    await deleteDoc(ref);
    console.log(`[PlayerService] Successfully deleted player: ${playerId}`);
  } catch (error) {
    console.error(`[PlayerService] Deletion failed for: ${playerId}`, error);
    handleFirestoreError(error, OperationType.DELETE, `${PLAYERS_COLLECTION}/${playerId}`);
    throw error;
  }
}

export async function fetchPlayerMatchStats(playerId: string): Promise<PlayerMatchStat[]> {
  try {
    const q = query(collection(db, STATS_COLLECTION), where('playerId', '==', playerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PlayerMatchStat);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STATS_COLLECTION);
  }
}

/**
 * Recomputes career aggregate statistics for a player using all recorded playerMatchStats.
 * Guarantees that duplicate finalizations or score corrections never corrupt the career totals.
 */
export async function recomputePlayerCareer(playerId: string): Promise<PlayerCareerStats> {
  try {
    const stats = await fetchPlayerMatchStats(playerId);
    const career: PlayerCareerStats = { ...initialCareerStats };

    career.matches = stats.length;

    let bestWickets = 0;
    let bestRuns = 999;

    for (const s of stats) {
      if (s.dismissalStatus !== 'Did not bat') {
        career.innings += 1;
        career.runs += s.battingRuns;
        career.ballsFaced += s.ballsFaced;
        career.fours += s.fours;
        career.sixes += s.sixes;
        if (s.battingRuns > career.highestScore) {
          career.highestScore = s.battingRuns;
        }
        if (s.dismissalStatus.toLowerCase().includes('not out')) {
          career.notOuts += 1;
        }
      }

      career.ballsBowled += s.bowlingBalls;
      career.runsConceded += s.runsConceded;
      career.wickets += s.wickets;

      // Track best bowling figures
      if (s.wickets > bestWickets || (s.wickets === bestWickets && s.runsConceded < bestRuns && s.wickets > 0)) {
        bestWickets = s.wickets;
        bestRuns = s.runsConceded;
      }

      career.catches += s.catches || 0;
      career.runOuts += s.runOuts || 0;
      if (s.potmAward) {
        career.potmAwards += 1;
      }
    }

    career.oversBowled = Number((Math.floor(career.ballsBowled / 6) + (career.ballsBowled % 6) / 10).toFixed(1));
    career.bestBowlingWickets = bestWickets;
    career.bestBowlingRuns = bestWickets > 0 ? bestRuns : 0;

    // Update in Firestore
    await updateDoc(doc(db, PLAYERS_COLLECTION, playerId), {
      career,
      updatedAt: new Date().toISOString(),
    });

    return career;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PLAYERS_COLLECTION}/${playerId}`);
  }
}
