import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-red-600/90 backdrop-blur-md border border-red-500/50 px-4 py-3 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider">Offline Mode</p>
          <p className="text-[10px] opacity-90 truncate">Showing cached matches and player data.</p>
        </div>
      </div>
      <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
    </div>
  );
};
