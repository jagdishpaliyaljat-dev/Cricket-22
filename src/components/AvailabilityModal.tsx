import React, { useState, useEffect } from 'react';
import { CricketMatch, Player, AvailabilityStatus } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { setPlayerAvailability, subscribeMatchAvailability } from '../services/availabilityService';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-[#0F172A] border border-white/15 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col text-slate-100 font-sans">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F1E36] to-[#13284C] p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-base text-white">
              Match Availability
            </h2>
            <div className="text-xs text-[#00F2FE] font-mono mt-0.5">
              {match.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer border border-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Quick Response Card */}
        {myPlayer && (
          <div className="stadium-card-glow p-3.5 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">
                Your Availability ({myPlayer.fullName}):
              </span>
              <span className="text-xs font-mono font-bold text-[#00F2FE] capitalize">
                {availabilities[myPlayer.id] || 'Not Responded'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 xs:gap-2">
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'available')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  availabilities[myPlayer.id] === 'available'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <Check className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Available</span>
              </button>
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'unavailable')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  availabilities[myPlayer.id] === 'unavailable'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-xs'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Unavailable</span>
              </button>
              <button
                onClick={() => handleSetStatus(myPlayer.id, 'not_responded')}
                className={`py-2 px-1 text-[10.5px] xs:text-xs font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  (!availabilities[myPlayer.id] || availabilities[myPlayer.id] === 'not_responded')
                    ? 'bg-slate-700 text-white border-slate-500 shadow-xs'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <Clock className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
                <span className="truncate">Undecided</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div className="p-3 bg-[#0B1120] flex items-center justify-around text-xs border-b border-white/10 text-slate-300 font-mono">
          <div>
            Available: <strong className="text-emerald-400 font-bold">{availableCount}</strong>
          </div>
          <div>
            Unavailable: <strong className="text-red-400 font-bold">{unavailableCount}</strong>
          </div>
          <div>
            Pending: <strong className="text-slate-400 font-bold">{notRespondedCount}</strong>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 p-2 bg-[#131E32]/90 border-b border-white/10 text-xs">
          {(['all', 'available', 'unavailable', 'not_responded'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1.5 px-1 rounded-lg font-bold capitalize text-[10.5px] xs:text-[11px] transition-all cursor-pointer text-center truncate ${
                filter === tab
                  ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              {tab === 'not_responded' ? 'Pending' : tab}
            </button>
          ))}
        </div>

        {/* Player Roster Availability List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1 max-h-72 bg-[#0B1120]">
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
                  className="stadium-card p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs"
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
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Avail
                      </button>
                      <button
                        onClick={() => handleSetStatus(p.id, 'unavailable')}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                          status === 'unavailable'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Unavail
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-[11px] font-mono font-bold capitalize px-2 py-0.5 rounded-full ${
                        status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : status === 'unavailable'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
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
          <div className="p-3 bg-[#0F172A] border-t border-white/10">
            <button
              onClick={() => {
                onClose();
                onOpenTeamBuilder(match);
              }}
              className="w-full min-h-[44px] bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] active:scale-95 transition-all"
            >
              <UserCheck className="w-4 h-4 stroke-[2.5]" />
              Build Teams with Available Players ({availableCount} Ready)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
