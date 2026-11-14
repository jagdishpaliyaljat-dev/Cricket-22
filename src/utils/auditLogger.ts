import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

export const logAdminAction = async (
  user: User | null,
  action: string,
  targetId: string,
  targetType: string,
  details: any = {}
) => {
  if (!user) return;

  try {
    await addDoc(collection(db, 'auditLogs'), {
      adminId: user.uid,
      adminEmail: user.email || 'unknown',
      action,
      targetId,
      targetType,
      timestamp: new Date().toISOString(),
      details
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
