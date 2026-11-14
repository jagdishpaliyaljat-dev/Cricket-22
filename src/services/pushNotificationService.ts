import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db, auth } from '../lib/firebase';

// VAPID Key is required for web push.
// You can get this from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

export async function requestPushPermission() {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register the service worker explicitly to ensure FCM can find it
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      
      const token = await getToken(messaging, { 
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_KEY 
      });
      if (token) {
        console.log('FCM Token received:', token);
        await saveTokenToUser(token);
        return token;
      }
    } else {
      console.warn('Notification permission denied');
    }
  } catch (error) {
    console.error('Error requesting push permission:', error);
  }
  return null;
}

async function saveTokenToUser(token: string) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token)
    });
    console.log('FCM Token saved to user profile');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

export function setupOnMessageListener() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    // You can handle foreground messages here, e.g., show a custom toast
    if (payload.notification) {
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body,
        icon: '/icon.svg'
      });
    }
  });
}
