import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AvailabilityStatus, MatchAvailability } from '../types/cricket';

const AVAILABILITY_COLLECTION = 'availability';

export async function fetchMatchAvailability(matchId: string): Promise<MatchAvailability[]> {
  try {
    const q = query(collection(db, AVAILABILITY_COLLECTION), where('matchId', '==', matchId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MatchAvailability);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, AVAILABILITY_COLLECTION);
  }
}

export function subscribeMatchAvailability(
  matchId: string,
  onData: (availabilities: MatchAvailability[]) => void
) {
  const q = query(collection(db, AVAILABILITY_COLLECTION), where('matchId', '==', matchId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as MatchAvailability);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, AVAILABILITY_COLLECTION);
    }
  );
}

export async function setPlayerAvailability(
  matchId: string,
  playerId: string,
  status: AvailabilityStatus
): Promise<void> {
  const docId = `${matchId}_${playerId}`;
  try {
    const record: MatchAvailability = {
      id: docId,
      matchId,
      playerId,
      status,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, AVAILABILITY_COLLECTION, docId), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${AVAILABILITY_COLLECTION}/${docId}`);
  }
}
