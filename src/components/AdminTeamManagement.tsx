import React, { useMemo } from 'react';
import { CricketMatch } from '../types/cricket';
import { Users, MoreVertical, Shield } from 'lucide-react';

interface AdminTeamManagementProps {
  matches: CricketMatch[];
}

export const AdminTeamManagement: React.FC<AdminTeamManagementProps> = ({ matches }) => {
  const teams = useMemo(() => {
    const teamMap = new Map<string, { id: string, name: string, players: string[] }>();
    
    matches.forEach(match => {
        [match.teamA, match.teamB].forEach(team => {
            if (!teamMap.has(team.id)) {
                teamMap.set(team.id, { id: team.id, name: team.name, players: team.playerIds });
            }
        });
    });
    return Array.from(teamMap.values());
  }, [matches]);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h2 className="font-display font-black text-2xl text-[#17211D]">Teams Management</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map(team => (
            <div key={team.id} className="bg-white p-4 rounded-2xl border border-[#E3EAE7] flex items-center justify-between shadow-sm hover:border-[#1554B8] transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                        {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-[#17211D]">{team.name}</h3>
                        <p className="text-xs text-[#68746F]">{team.players.length} Players</p>
                    </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-[#1554B8] cursor-pointer transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        ))}
        {teams.length === 0 && (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-[#E3EAE7] text-center text-slate-500 text-sm">
                No teams found in matches.
            </div>
        )}
      </div>
    </div>
  );
};
