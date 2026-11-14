import React from 'react';
import { X, Bell, Trophy, Calendar, CheckCircle, Info } from 'lucide-react';
import { CricketMatch } from '../types/cricket';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches?: CricketMatch[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  matches = [],
}) => {
  if (!isOpen) return null;

  const liveMatches = matches.filter((m) => m.status === 'live');
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const notifications = [
    ...liveMatches.map((m) => {
      const activeInnings = m.currentInnings === 2 ? m.innings2 : m.innings1;
      const scoreStr = activeInnings ? `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.legalOvers}.${activeInnings.legalBalls} ov)` : 'Live Now';
      return {
        id: `notif_live_${m.id}`,
        title: `${m.title} is Live`,
        message: `${m.teamA.name} vs ${m.teamB.name} • ${scoreStr}`,
        time: 'Live',
        unread: true,
        icon: Trophy,
      };
    }),
    ...scheduledMatches.slice(0, 3).map((m) => ({
      id: `notif_sched_${m.id}`,
      title: 'Upcoming Fixture',
      message: `${m.title} at ${m.venue} (${m.playersPerTeam}v${m.playersPerTeam})`,
      time: new Date(m.dateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      unread: false,
      icon: Calendar,
    })),
    ...completedMatches.slice(0, 2).map((m) => ({
      id: `notif_comp_${m.id}`,
      title: 'Match Finalized',
      message: `${m.title}: ${m.result?.summaryText || 'Finalized'}`,
      time: 'Completed',
      unread: false,
      icon: CheckCircle,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white border border-[#DFE7F2] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-[#172033]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#0B3F91] bg-[#1554B8] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white leading-tight tracking-tight">Notifications</h3>
              <p className="text-xs text-[#EAF2FF] font-medium mt-0.5">
                {liveMatches.length > 0 ? `${liveMatches.length} live update${liveMatches.length > 1 ? 's' : ''}` : 'Activity & Match Updates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* List */}
        <div className="p-3.5 space-y-2.5 max-h-84 overflow-y-auto bg-[#F2F6FC]">
          {notifications.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2 bg-white rounded-2xl border border-[#DFE7F2] my-1">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF2FF] text-[#1554B8] flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#172033] font-bold pt-1">No Match Notifications Yet</p>
              <p className="text-[11px] text-[#718096] max-w-xs mx-auto leading-relaxed">
                When matches go live or results are finalized, live score updates and alerts will appear right here.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-xs transition-all shadow-2xs ${
                    n.unread
                      ? 'bg-[#EAF2FF] border-[#1554B8]/30 text-[#172033] shadow-xs'
                      : 'bg-white border-[#DFE7F2] text-[#172033] hover:border-[#1554B8]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        n.unread ? 'bg-[#1554B8] text-white shadow-xs' : 'bg-[#F2F6FC] text-[#1554B8] border border-[#DFE7F2]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#172033] truncate text-[12px]">{n.title}</span>
                        <span className={`text-[10px] shrink-0 font-bold px-2 py-0.5 rounded-full ${
                          n.unread ? 'bg-[#1554B8] text-white' : 'text-[#718096] bg-[#F2F6FC] border border-[#DFE7F2]'
                        }`}>
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#718096] mt-1 leading-snug font-medium">{n.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

