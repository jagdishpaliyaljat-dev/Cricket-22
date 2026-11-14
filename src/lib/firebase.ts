import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Handle potential variations in JSON import (Vite/ESM)
const config = (firebaseConfig as any).default || firebaseConfig;

if (!config || !config.projectId) {
  console.error('[Firebase] FATAL: Configuration missing or invalid.', config);
}

// 1. Initialize or retrieve Firebase App
let app: FirebaseApp;
try {
  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize App:', error);
  // Fallback to existing app if possible
  app = getApp();
}

// 2. Initialize Services
export const auth = getAuth(app);
let firestoreDb: Firestore;
try {
  firestoreDb = config.firestoreDatabaseId 
    ? getFirestore(app, config.firestoreDatabaseId) 
    : getFirestore(app);
} catch (err) {
  console.warn('[Firebase] Failed to initialize with databaseId, falling back to default:', err);
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
const provider = new GoogleAuthProvider();

export const googleProvider = provider;

// Debug log
console.log('[Firebase] Services Layer Ready', {
  projectId: config.projectId,
  databaseId: config.firestoreDatabaseId || '(default)'
});

// Re-export Auth methods
export { signInWithPopup, fbSignOut };

// Error handling utilities
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const code = (error as any)?.code || 'unknown';
  const message = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: `[${code}] ${message}`,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
  };
  
  console.error('[Firebase] Firestore Error:', errInfo);
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    console.warn('[Firebase] Connection test failed (expected if no test doc):', error);
    return true;
  }
}
