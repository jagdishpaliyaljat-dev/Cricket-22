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
      
      // 1. Strict Role Verification
      let userRole: UserRole = 'player';
      const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(
        (e) => e.toLowerCase() === (user.email || '').toLowerCase()
      );

      // Check if admin document exists by UID
      const adminDocRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminDocRef);

      // Check if user was assigned admin by email by an existing admin
      let isAdminByEmail = false;
      if (!adminSnap.exists() && user.email) {
        try {
          const qAdminEmail = query(
            collection(db, 'admins'),
            where('email', '==', user.email.toLowerCase())
          );
          const adminEmailSnap = await getDocs(qAdminEmail);
          if (!adminEmailSnap.empty) {
            isAdminByEmail = true;
            // Link UID into admins doc for instant future lookups
            await setDoc(adminDocRef, {
              uid: user.uid,
              email: user.email.toLowerCase(),
              linkedAt: new Date().toISOString(),
            }, { merge: true });
          }
        } catch (err) {
          console.warn('[AuthContext] Admin email check warning:', err);
        }
      }

      if (isSuperAdminEmail || adminSnap.exists() || isAdminByEmail) {
        userRole = 'admin';
        console.log(`[AuthContext] [${new Date().toISOString()}] User verified as ADMIN.`);
        if (isSuperAdminEmail && !adminSnap.exists()) {
          await setDoc(adminDocRef, {
            uid: user.uid,
            email: user.email,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      } else {
        // Check if scorer document exists by UID or by email
        const scorerDocRef = doc(db, 'scorers', user.uid);
        const scorerSnap = await getDoc(scorerDocRef);
        let isScorerByEmail = false;

        if (!scorerSnap.exists() && user.email) {
          try {
            const qScorerEmail = query(
              collection(db, 'scorers'),
              where('email', '==', user.email.toLowerCase())
            );
            const scorerEmailSnap = await getDocs(qScorerEmail);
            if (!scorerEmailSnap.empty) {
              isScorerByEmail = true;
              await setDoc(scorerDocRef, {
                uid: user.uid,
                email: user.email.toLowerCase(),
                linkedAt: new Date().toISOString(),
              }, { merge: true });
            }
          } catch (err) {
            console.warn('[AuthContext] Scorer email check warning:', err);
          }
        }

        if (scorerSnap.exists() || isScorerByEmail) {
          userRole = 'scorer';
          console.log(`[AuthContext] [${new Date().toISOString()}] User verified as SCORER.`);
        } else {
          // STRICTLY PLAYER! No automatic admin promotion under any circumstances!
          userRole = 'player';
          console.log(`[AuthContext] [${new Date().toISOString()}] User is standard PLAYER.`);
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
      


      // 2. Synchronize or auto-provision Player profile for the authenticated user
      try {
        const playersRef = collection(db, 'players');
        const directPlayerRef = doc(db, 'players', `player_${user.uid}`);
        const directPlayerSnap = await getDoc(directPlayerRef);

        let targetPlayerDocId: string | null = directPlayerSnap.exists() ? directPlayerRef.id : null;

        if (!targetPlayerDocId) {
          const qUserId = query(playersRef, where('userId', '==', user.uid));
          const userIdSnap = await getDocs(qUserId);
          if (!userIdSnap.empty) {
            targetPlayerDocId = userIdSnap.docs[0].id;
          }
        }

        if (!targetPlayerDocId && user.email) {
          const qEmail = query(playersRef, where('email', '==', user.email.toLowerCase()));
          const emailSnap = await getDocs(qEmail);
          if (!emailSnap.empty) {
            targetPlayerDocId = emailSnap.docs[0].id;
          }
        }

        if (targetPlayerDocId) {
          const updates: Record<string, any> = {
            userId: user.uid,
            updatedAt: new Date().toISOString(),
          };
          if (user.photoURL) updates.photoUrl = user.photoURL;
          if (user.displayName) updates.fullName = user.displayName;
          if (user.email) updates.email = user.email.toLowerCase();

          await setDoc(doc(db, 'players', targetPlayerDocId), updates, { merge: true });
          console.log(`[AuthContext] Synced profile details to Player: ${targetPlayerDocId}`);
        } else {
          const newPlayerId = `player_${user.uid}`;
          const newPlayerData = {
            id: newPlayerId,
            userId: user.uid,
            fullName: user.displayName || 'Cricket Player',
            email: user.email ? user.email.toLowerCase() : '',
            photoUrl: user.photoURL || '',
            playingRole: 'batting_allrounder',
            battingStyle: 'right_hand_bat',
            bowlingStyle: 'right_arm_medium',
            status: 'active',
            verificationStatus: 'verified',
            registrationDate: new Date().toISOString(),
            career: {
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
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'players', newPlayerId), newPlayerData, { merge: true });
          console.log(`[AuthContext] Auto-created player profile for user: ${newPlayerId}`);
        }
      } catch (err) {
        console.warn('[AuthContext] Player profile sync/creation failed:', err);
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

    // Background sync to Firestore so the user and demo users exist in the users table
    (async () => {
      try {
        await setDoc(doc(db, 'users', simulatedAppUser.id), simulatedAppUser, { merge: true });
        if (demoRole === 'admin') {
          await setDoc(doc(db, 'admins', simulatedAppUser.id), {
            uid: simulatedAppUser.id,
            email: simulatedAppUser.email,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }

        // Ensure sample registered users exist for instant testing of role changes
        const sampleUsers: AppUser[] = [
          {
            id: 'sample_user_rahul',
            email: 'rahul.cricket@gmail.com',
            displayName: 'Rahul Sharma',
            role: 'player',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'sample_user_vikram',
            email: 'vikram.singh@gmail.com',
            displayName: 'Vikram Singh Rathore',
            role: 'scorer',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
          {
            id: 'sample_user_amit',
            email: 'amit.patel@gmail.com',
            displayName: 'Amit Patel',
            role: 'player',
            createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ];

        for (const s of sampleUsers) {
          const userRef = doc(db, 'users', s.id);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, s);
            if (s.role === 'scorer') {
              await setDoc(
                doc(db, 'scorers', s.id),
                {
                  uid: s.id,
                  email: s.email,
                  createdAt: s.createdAt,
                },
                { merge: true }
              );
            }
          }
        }
      } catch (e) {
        console.warn('Demo users Firestore background sync notice (non-fatal):', e);
      }
    })();
  };

  useEffect(() => {
    console.log(`[AuthContext] [${new Date().toISOString()}] Initializing AuthProvider...`);
    testConnection();

    // Purge any stale demo session so real authentication is strictly enforced
    try {
      localStorage.removeItem('localxi_demo_session');
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
        message = `⚠️ Firebase Unauthorized Domain: "${domain}" is not yet added in Firebase Console. Please add "${domain}" under Firebase Console → Authentication → Settings → Authorized Domains.`;
      } else if (err?.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked by your browser. Please enable popups for this site and try again.';
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
