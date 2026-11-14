import React, { useState, useEffect } from 'react';
import { CricketMatch, Player, MatchAvailability, AvailabilityStatus } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { fetchMatchAvailability, setPlayerAvailability, subscribeMatchAvailability } from '../services/availabilityService';
import { X, Check, Clock, UserCheck } from 'lucide-react';

interface AvailabilityModalProps {
  match: CricketMatch;
  players: Player[];
  onClose: () => void;
  onOpenTeamBuilder?: (match: CricketMatch) => void;
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  match,
  players,
  onClose,
  onOpenTeamBuilder,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [availabilities, setAvailabilities] = useState<Record<string, AvailabilityStatus>>({});
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable' | 'not_responded'>('all');

  useEffect(() => {
    const unsub = subscribeMatchAvailability(match.id, (data) => {
      const map: Record<string, AvailabilityStatus> = {};
      data.forEach((item) => {
        map[item.playerId] = item.status;
      });
      setAvailabilities(map);
    });
    return () => unsub();
  }, [match.id]);

  const handleSetStatus = async (playerId: string, status: AvailabilityStatus) => {
    try {
      await setPlayerAvailability(match.id, playerId, status);
    } catch (err) {
      console.error('Error setting availability:', err);
    }
  };

  // Find if current user is linked to any player
  const myPlayer = players.find((p) => p.userId === currentUser?.uid);

  // Available count
  const availableCount = players.filter(
    (p) => (availabilities[p.id] || 'not_responded') === 'available'
  ).length;

  const unavailableCount = players.filter(
    (p) => (availabilities[p.id] || 'not_responded') === 'unavailable'
  ).length;

  const notRespondedCount = players.length - availableCount - unavailableCount;

  // Filtered players list
  const filteredPlayers = players.filter((p) => {
    const status = availabilities[p.id] || 'not_responded';
    if (filter === 'all') return true;
    return status === filter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-[#063D2E] border border-emerald-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#002B1B] p-4 border-b border-emerald-900/60 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-white">
              Match Availability
            </h2>
            <div className="text-xs text-emerald-200/80 font-mono">
              {match.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white bg-emerald-950 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Quick Response Card */}
        {myPlayer && (
          <div className="bg-emerald-950/90 p-3.5 border-b border-emerald-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">
                Your Availability ({myPlayer.fullName}):
              </span>
              <span className="text-xs font-mono font-bold text-[#7CFC00] capitalize">
                {availabilities[myPlayer.id] || 'Not Responded'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 xs:gap-2">
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'available')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer touch-press ${
                  availabilities[myPlayer.id] === 'available'
                    ? 'bg-[#16A34A] text-white border-lime-400'
                    : 'bg-[#002B1B] text-slate-300 border-emerald-800'
                }`}
              >
                <Check className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Available</span>
              </button>
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'unavailable')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer touch-press ${
                  availabilities[myPlayer.id] === 'unavailable'
                    ? 'bg-red-700 text-white border-red-500'
                    : 'bg-[#002B1B] text-slate-300 border-emerald-800'
                }`}
              >
                <X className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Unavailable</span>
              </button>
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'not_responded')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer touch-press ${
                  (!availabilities[myPlayer.id] || availabilities[myPlayer.id] === 'not_responded')
                    ? 'bg-slate-700 text-white border-slate-500'
                    : 'bg-[#002B1B] text-slate-300 border-emerald-800'
                }`}
              >
                <Clock className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Undecided</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div className="p-3 bg-[#002B1B]/60 flex items-center justify-around text-xs border-b border-emerald-950 text-slate-300 font-mono">
          <div>
            Available: <strong className="text-[#7CFC00]">{availableCount}</strong>
          </div>
          <div>
            Unavailable: <strong className="text-red-400">{unavailableCount}</strong>
          </div>
          <div>
            Pending: <strong className="text-slate-400">{notRespondedCount}</strong>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 p-2 bg-[#063D2E] text-xs">
          {(['all', 'available', 'unavailable', 'not_responded'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1.5 px-1 rounded-lg font-medium capitalize text-[10.5px] xs:text-[11px] transition-colors cursor-pointer text-center truncate ${
                filter === tab
                  ? 'bg-[#7CFC00] text-[#002B1B] font-bold'
                  : 'text-slate-300 hover:text-white bg-emerald-950/60'
              }`}
            >
              {tab === 'not_responded' ? 'Pending' : tab}
            </button>
          ))}
        </div>

        {/* Player Roster Availability List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1 max-h-72">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic text-xs">
              No players found in this category.
            </div>
          ) : (
            filteredPlayers.map((p) => {
              const status = availabilities[p.id] || 'not_responded';

              return (
                <div
                  key={p.id}
                  className="bg-[#002B1B] p-2.5 rounded-xl border border-emerald-950 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{p.fullName}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {p.playingRole.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSetStatus(p.id, 'available')}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                          status === 'available'
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-emerald-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        Avail
                      </button>
                      <button
                        onClick={() => handleSetStatus(p.id, 'unavailable')}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                          status === 'unavailable'
                            ? 'bg-red-700 text-white'
                            : 'bg-emerald-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        Unavail
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-[11px] font-mono font-bold capitalize ${
                        status === 'available'
                          ? 'text-[#7CFC00]'
                          : status === 'unavailable'
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Admin Action: Team Builder */}
        {isAdmin && onOpenTeamBuilder && (
          <div className="p-3 bg-[#002B1B] border-t border-emerald-900/60">
            <button
              onClick={() => {
                onClose();
                onOpenTeamBuilder(match);
              }}
              className="w-full min-h-[44px] bg-[#7CFC00] hover:bg-lime-400 text-[#002B1B] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer touch-press"
            >
              <UserCheck className="w-4 h-4" />
              Build Teams with Available Players ({availableCount} Ready)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
