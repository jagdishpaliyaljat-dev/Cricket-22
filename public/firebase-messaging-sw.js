importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC2MBXrpowK7PrT5jjV8_dVUppOFrbEniQ",
  authDomain: "elliptical-superstate-6v4kj.firebaseapp.com",
  projectId: "elliptical-superstate-6v4kj",
  storageBucket: "elliptical-superstate-6v4kj.firebasestorage.app",
  messagingSenderId: "837967038693",
  appId: "1:837967038693:web:bc8dfbafac5734a2a26c0c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
