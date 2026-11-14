import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markAsRead } from '../services/notificationService';
import { AppNotification } from '../types/cricket';
import { Bell, X, Trophy, Info, AlertCircle } from 'lucide-react';

export const NotificationManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToNotifications(currentUser.uid, (newNotifications) => {
      setNotifications(newNotifications);
      
      // If there's a new notification, show it as a banner
      if (newNotifications.length > 0) {
        // Find if there's a new one that wasn't in our previous list
        const latest = newNotifications[0];
        setActiveBanner(latest);
        
        // Auto-hide banner after 8 seconds
        const timer = setTimeout(() => {
          setActiveBanner(null);
        }, 8000);
        
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDismiss = async (notifId: string) => {
    await markAsRead(notifId);
    if (activeBanner?.id === notifId) {
      setActiveBanner(null);
    }
  };

  if (!activeBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top duration-300">
      <div className="bg-white border-2 border-[#1554B8] rounded-[24px] shadow-2xl p-4 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          activeBanner.type === 'match_finish' ? 'bg-amber-100 text-amber-600' : 
          activeBanner.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {activeBanner.type === 'match_finish' ? <Trophy className="w-5 h-5" /> : 
           activeBanner.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-sm text-[#17211D] truncate">{activeBanner.title}</h4>
          <p className="text-xs text-[#68746F] leading-relaxed mt-0.5 line-clamp-2">
            {activeBanner.message}
          </p>
        </div>

        <button 
          onClick={() => handleDismiss(activeBanner.id)}
          className="p-1.5 text-[#68746F] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
