import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export interface Team {
  id: string;
  name: string;
  color: string;
  logoUrl: string;
}

const TEAMS_COLLECTION = 'teams';

export const getTeams = async (): Promise<Team[]> => {
  const querySnapshot = await getDocs(collection(db, TEAMS_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

export const addTeam = async (team: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TEAMS_COLLECTION), team);
  return docRef.id;
};

export const updateTeam = async (id: string, team: Partial<Team>): Promise<void> => {
  const docRef = doc(db, TEAMS_COLLECTION, id);
  await updateDoc(docRef, team);
};

export const deleteTeam = async (id: string): Promise<void> => {
  const docRef = doc(db, TEAMS_COLLECTION, id);
  await deleteDoc(docRef);
};
