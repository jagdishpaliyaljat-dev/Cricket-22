import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification } from '../types/cricket';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const sendNotification = async (notification: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

export const sendBulkNotifications = async (notifications: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>[]) => {
  try {
    const batch = writeBatch(db);
    notifications.forEach((notif) => {
      const newDocRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
      batch.set(newDocRef, {
        ...notif,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc'),
    limit(10)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as AppNotification);
    });
    callback(notifications);
  });
};

export const markAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      isRead: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
