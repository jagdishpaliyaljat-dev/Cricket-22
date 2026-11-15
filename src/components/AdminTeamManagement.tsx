import React, { useMemo } from 'react';
import { CricketMatch } from '../types/cricket';
import { Users, MoreVertical, Shield } from 'lucide-react';

interface AdminTeamManagementProps {
  matches: CricketMatch[];
}

export const AdminTeamManagement: React.FC<AdminTeamManagementProps> = ({ matches }) => {
  const teams = useMemo(() => {
    const teamMap = new Map<string, { id: string; name: string; players: string[] }>();

    matches.forEach((match) => {
      [match.teamA, match.teamB].forEach((team) => {
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, { id: team.id, name: team.name, players: team.playerIds });
        }
      });
    });
    return Array.from(teamMap.values());
  }, [matches]);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">Teams Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Participating teams across all matches & fixtures</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131D33] border border-white/10 text-xs font-mono text-cyan-400">
          <Shield className="w-3.5 h-3.5 text-[#00F2FE]" />
          <span>{teams.length} Teams</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {teams.map((team) => (
          <div
            key={team.id}
            className="stadium-card p-4 rounded-3xl border border-white/10 flex items-center justify-between shadow-lg hover:border-cyan-500/40 transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-[#00F2FE] flex items-center justify-center font-black text-base shadow-inner group-hover:scale-105 transition-transform shrink-0">
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-white truncate tracking-tight group-hover:text-[#00F2FE] transition-colors">
                  {team.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Users className="w-3 h-3 text-[#00F2FE]" />
                    {team.players.length} Players
                  </span>
                </div>
              </div>
            </div>

            <button
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
              title="Team options"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full stadium-card p-10 rounded-3xl border border-white/10 text-center text-slate-400 space-y-2">
            <Shield className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No teams found</p>
            <p className="text-xs text-slate-400">Create fixtures or matches to register participating squads.</p>
          </div>
        )}
      </div>
    </div>
  );
};
