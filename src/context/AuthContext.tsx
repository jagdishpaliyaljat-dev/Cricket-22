import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, fbSignOut, handleFirestoreError, OperationType, testConnection } from '../lib/firebase';
import { AppUser, UserRole } from '../types/cricket';

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  role: UserRole;
  isAdmin: boolean;
  isScorer: boolean;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const SUPER_ADMIN_EMAILS = [
  'kamleshchoudhary96022@gmail.com',
  'gopsabanna7773@gmail.com',
  'zdpaliyal@gmail.com',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>('player');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchUserProfile = async (user: User) => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[AuthContext] [${timestamp}] Fetching profile for user: ${user.uid}`);
      
      // 1. Check if user is SuperAdmin or has admin document
      let userRole: UserRole = 'player';
      const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(
        (e) => e.toLowerCase() === (user.email || '').toLowerCase()
      );

      // Check if admin doc exists
      const adminDocRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminDocRef);

      if (adminSnap.exists() || isSuperAdminEmail) {
        userRole = 'admin';
        console.log(`[AuthContext] [${new Date().toISOString()}] User identified as admin.`);
        if (isSuperAdminEmail && !adminSnap.exists()) {
          // Ensure admin record exists
          await setDoc(adminDocRef, {
            uid: user.uid,
            email: user.email,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // First user to register becomes admin bootstrap
        try {
          const adminsSnap = await getDocs(collection(db, 'admins'));
          if (adminsSnap.empty) {
            console.log(`[AuthContext] [${new Date().toISOString()}] First user detected, bootstrapping admin role.`);
            await setDoc(adminDocRef, {
              uid: user.uid,
              email: user.email,
              createdAt: new Date().toISOString(),
            });
            userRole = 'admin';
          }
        } catch (err) {
          console.warn(`[AuthContext] Admin bootstrap check failed:`, err);
        }

        if (userRole !== 'admin') {
          // Check if scorer
          const scorerSnap = await getDoc(doc(db, 'scorers', user.uid));
          if (scorerSnap.exists()) {
            userRole = 'scorer';
            console.log(`[AuthContext] [${new Date().toISOString()}] User identified as scorer.`);
          }
        }
      }

      // Check or create user doc
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      let userData: AppUser;
      if (userSnap.exists()) {
        userData = userSnap.data() as AppUser;
        console.log(`[AuthContext] [${new Date().toISOString()}] Profile found in Firestore.`);
        // Keep role and super admin status updated
        const needsUpdate = 
          userData.role !== userRole || 
          userData.photoURL !== (user.photoURL || undefined) ||
          userData.isSuperAdmin !== isSuperAdminEmail;

        if (needsUpdate) {
          userData.role = userRole;
          userData.photoURL = user.photoURL || undefined;
          userData.isSuperAdmin = isSuperAdminEmail;
          await setDoc(userDocRef, { 
            role: userRole, 
            photoURL: user.photoURL || undefined,
            isSuperAdmin: isSuperAdminEmail 
          }, { merge: true });
        }
      } else {
        console.log(`[AuthContext] [${new Date().toISOString()}] No profile found. Creating new user document.`);
        userData = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Cricket Player',
          photoURL: user.photoURL || undefined,
          role: userRole,
          isSuperAdmin: isSuperAdminEmail,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, userData);
      }
      


      // 2. Synchronize photoURL with Player profile if it exists
      try {
        const playersRef = collection(db, 'players');
        // Match by userId first, then email
        const qUserId = query(playersRef, where('userId', '==', user.uid));
        const userIdSnap = await getDocs(qUserId);
        
        let playerToUpdate: string | null = null;
        if (!userIdSnap.empty) {
          playerToUpdate = userIdSnap.docs[0].id;
        } else if (user.email) {
          const qEmail = query(playersRef, where('email', '==', user.email));
          const emailSnap = await getDocs(qEmail);
          if (!emailSnap.empty) {
            playerToUpdate = emailSnap.docs[0].id;
            // Also link the userId if missing
            if (!emailSnap.docs[0].data().userId) {
              await setDoc(doc(db, 'players', playerToUpdate), { userId: user.uid }, { merge: true });
            }
          }
        }

        if (playerToUpdate && user.photoURL) {
          console.log(`[AuthContext] Syncing photoURL to Player: ${playerToUpdate}`);
          await setDoc(doc(db, 'players', playerToUpdate), { photoUrl: user.photoURL }, { merge: true });
        }
      } catch (err) {
        console.warn('[AuthContext] Player photo sync failed:', err);
      }

      setAppUser(userData);
      setRole(userRole);
      setIsSuperAdmin(!!userData.isSuperAdmin);
      console.log(`[AuthContext] [${new Date().toISOString()}] Profile state updated successfully. Role: ${userRole}, isSuperAdmin: ${!!userData.isSuperAdmin}`);
    } catch (err) {
      console.error(`[AuthContext] [${new Date().toISOString()}] CRITICAL: Error fetching user profile:`, err);
      // Fallback: at least set a default role so the app doesn't hang
      setRole('player');
    }
  };

  useEffect(() => {
    console.log(`[AuthContext] [${new Date().toISOString()}] Initializing AuthProvider...`);
    testConnection();

    // Safety timeout to unblock screen if Firebase auth initialization hangs
    const initTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('[AuthContext] Auth init timeout (3s). Unblocking UI.');
          return false;
        }
        return prev;
      });
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(initTimeout);
      const timestamp = new Date().toISOString();
      console.log(`[AuthContext] [${timestamp}] onAuthStateChanged triggered. User UID: ${user?.uid || 'null'}`);
      
      setCurrentUser(user);
      if (user) {
        console.log(`[AuthContext] [${timestamp}] Starting profile fetch for UID: ${user.uid}`);
        // Add a safety timeout to ensure loading eventually becomes false (5 seconds)
        const timeoutId = setTimeout(() => {
          console.warn(`[AuthContext] Profile fetch taking too long (>5s). Forcing loading: false to unblock UI.`);
          setLoading(false);
        }, 5000);

        try {
          await fetchUserProfile(user);
        } catch (profileErr) {
          console.error(`[AuthContext] [${new Date().toISOString()}] fetchUserProfile failed:`, profileErr);
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
          console.log(`[AuthContext] [${new Date().toISOString()}] Profile fetch complete. Loading: false`);
        }
      } else {
        console.log(`[AuthContext] [${timestamp}] No active session detected. Clearing local user data.`);
        setAppUser(null);
        setRole('player');
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(initTimeout);
      console.log(`[AuthContext] [${new Date().toISOString()}] Cleaning up AuthProvider. Unsubscribing from auth listener.`);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      console.log('[AuthContext] Initiating Google sign-in popup...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        console.log('[AuthContext] Sign-in successful:', result.user.uid);
        await fetchUserProfile(result.user);
      }
    } catch (err: any) {
      console.error('[AuthContext] Login failed:', err);
      let message = 'Login failed. Please check your internet connection.';
      if (err?.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked. Please allow popups for this site.';
      } else if (err?.code === 'auth/network-request-failed') {
        message = 'Network error. Please check if you are behind a firewall or have a flaky connection.';
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const clearError = () => setError(null);

  const signOut = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[AuthContext] [${timestamp}] signOut() initiated.`);
    try {
      if (!auth.currentUser) {
        console.warn(`[AuthContext] [${timestamp}] No user currently signed in to Firebase auth.`);
        return;
      }
      console.log(`[AuthContext] [${timestamp}] Firebase User found: ${auth.currentUser.uid}. Calling Firebase signOut...`);
      
      await fbSignOut(auth);
      console.log(`[AuthContext] [${new Date().toISOString()}] Firebase signOut promise resolved successfully.`);
    } catch (err) {
      console.error(`[AuthContext] [${new Date().toISOString()}] Firebase signOut failed:`, err);
      throw err;
    }
  };

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  console.log('[AuthContext] Debug isSuperAdmin:', {
    email: currentUser?.email,
    SUPER_ADMIN_EMAILS,
    isMatch: SUPER_ADMIN_EMAILS.some(
      (e) => e.toLowerCase() === (currentUser?.email || '').toLowerCase()
    )
  });
  // Removed redundant derivation

  const value: AuthContextType & { isSigningIn: boolean; isSuperAdmin: boolean } = {
    currentUser,
    appUser,
    role,
    isAdmin: role === 'admin',
    isScorer: role === 'scorer' || role === 'admin',
    isSuperAdmin,
    loading,
    isSigningIn,
    signInWithGoogle,
    signOut,
    refreshUserData,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext) as AuthContextType & { isSigningIn: boolean; isSuperAdmin: boolean };
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
