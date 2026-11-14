import { useEffect, useState } from 'react';
import { CricketMatch, Player } from '../types/cricket';
import { fetchMatchAvailability } from '../services/availabilityService';

export function useMatchReminders(matches: CricketMatch[], players: Player[], currentUserPlayer?: Player) {
  const [activeAlert, setActiveAlert] = useState<{ match: CricketMatch; message: string } | null>(null);

  useEffect(() => {
    if (!currentUserPlayer || matches.length === 0) return;

    // Request browser notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const checkReminders = async () => {
      const now = new Date().getTime();
      const alertedKey = 'localxi_alerted_matches';
      let alertedIds: string[] = [];
      try {
        const stored = localStorage.getItem(alertedKey);
        if (stored) alertedIds = JSON.parse(stored);
      } catch {}

      for (const match of matches) {
        if (match.status !== 'scheduled') continue;
        if (alertedIds.includes(match.id)) continue;

        const matchTime = new Date(match.dateTime).getTime();
        const diffMinutes = (matchTime - now) / (1000 * 60);

        // Check if match is in 25 to 35 minutes
        if (diffMinutes >= 25 && diffMinutes <= 35) {
          // Check availability status
          try {
            const availabilities = await fetchMatchAvailability(match.id);
            const myAvail = availabilities.find((a) => a.playerId === currentUserPlayer.id);

            if (myAvail && myAvail.status === 'available') {
              const alertMsg = `Reminder: "${match.title}" starts in about 30 minutes at ${match.venue || 'Local Ground'}. Get ready!`;
              
              setActiveAlert({ match, message: alertMsg });

              // Trigger browser notification if supported
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('LocalXI Match Reminder', {
                  body: alertMsg,
                  icon: '/favicon.ico',
                });
              }

              // Mark as alerted
              alertedIds.push(match.id);
              localStorage.setItem(alertedKey, JSON.stringify(alertedIds));
              break; // Show one at a time
            }
          } catch (err) {
            console.error('Error checking availability for reminder:', err);
          }
        }
      }
    };

    // Check immediately and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, [matches, currentUserPlayer]);

  return {
    activeAlert,
    dismissAlert: () => setActiveAlert(null),
  };
}
