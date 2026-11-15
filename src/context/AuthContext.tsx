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
  isSuperAdmin: boolean;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDemoRole: (role: 'admin' | 'scorer' | 'player') => void;
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

  const signInWithDemoRole = (demoRole: 'admin' | 'scorer' | 'player') => {
    const demoEmail = demoRole === 'admin' 
      ? 'admin@localxi.cricket' 
      : demoRole === 'scorer' 
      ? 'scorer@localxi.cricket' 
      : 'player@localxi.cricket';
    const demoName = demoRole === 'admin' 
      ? 'Super Administrator' 
      : demoRole === 'scorer' 
      ? 'Official Scorer' 
      : 'Demo Player';

    const simulatedUser = {
      uid: `demo_${demoRole}_uid`,
      email: demoEmail,
      displayName: demoName,
      photoURL: demoRole === 'admin' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    } as User;

    const simulatedAppUser: AppUser = {
      id: `demo_${demoRole}_uid`,
      email: demoEmail,
      displayName: demoName,
      photoURL: simulatedUser.photoURL || undefined,
      role: demoRole === 'admin' ? 'admin' : demoRole === 'scorer' ? 'scorer' : 'player',
      isSuperAdmin: demoRole === 'admin',
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('localxi_demo_session', JSON.stringify({ role: demoRole }));
    } catch {}

    setCurrentUser(simulatedUser);
    setAppUser(simulatedAppUser);
    setRole(simulatedAppUser.role);
    setIsSuperAdmin(demoRole === 'admin');
    setLoading(false);
  };

  useEffect(() => {
    console.log(`[AuthContext] [${new Date().toISOString()}] Initializing AuthProvider...`);
    testConnection();

    // Check for existing demo session first
    try {
      const savedDemo = localStorage.getItem('localxi_demo_session');
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        if (parsed?.role) {
          console.log('[AuthContext] Restoring saved quick session for role:', parsed.role);
          signInWithDemoRole(parsed.role);
        }
      }
    } catch {}

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
      
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.removeItem('localxi_demo_session');
        } catch {}
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
        const savedDemo = localStorage.getItem('localxi_demo_session');
        if (!savedDemo) {
          console.log(`[AuthContext] [${timestamp}] No active session detected. Clearing local user data.`);
          setCurrentUser(null);
          setAppUser(null);
          setRole('player');
          setIsSuperAdmin(false);
          setLoading(false);
        }
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
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        message = `⚠️ Firebase Unauthorized Domain: "${domain}" is not added in Firebase Console. Add "${domain}" in Firebase Console -> Authentication -> Settings -> Authorized Domains. In the meantime, click "⚡ Quick Admin Access" below to enter immediately!`;
      } else if (err?.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked by browser. Please allow popups or use "⚡ Quick Admin Access".';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completing. Please try again.';
      } else if (err?.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
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
      try {
        localStorage.removeItem('localxi_demo_session');
      } catch {}
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
      setCurrentUser(null);
      setAppUser(null);
      setRole('player');
      setIsSuperAdmin(false);
      console.log(`[AuthContext] [${new Date().toISOString()}] SignOut complete.`);
    } catch (err) {
      console.error(`[AuthContext] [${new Date().toISOString()}] Firebase signOut failed:`, err);
      setCurrentUser(null);
      setAppUser(null);
      setRole('player');
      setIsSuperAdmin(false);
    }
  };

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  const value: AuthContextType = {
    currentUser,
    appUser,
    role,
    isAdmin: role === 'admin',
    isScorer: role === 'scorer' || role === 'admin',
    isSuperAdmin,
    loading,
    isSigningIn,
    signInWithGoogle,
    signInWithDemoRole,
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
