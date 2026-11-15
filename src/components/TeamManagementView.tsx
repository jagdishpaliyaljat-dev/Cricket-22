import React, { useState, useEffect } from 'react';
import { getTeams, addTeam, updateTeam, deleteTeam, Team } from '../services/teamService';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';

export const TeamManagementView: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeam, setNewTeam] = useState({ name: '', color: '#00F2FE', logoUrl: '' });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    const data = await getTeams();
    setTeams(data);
    setLoading(false);
  };

  const handleAddTeam = async () => {
    if (!newTeam.name) return;
    await addTeam(newTeam);
    setNewTeam({ name: '', color: '#00F2FE', logoUrl: '' });
    fetchTeams();
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto text-slate-100">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#00F2FE]" />
          <span>Team Management</span>
        </h2>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10">
          {teams.length} Teams
        </span>
      </div>
      
      <div className="stadium-card p-5 sm:p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <h3 className="font-bold text-base text-white">Add New Team</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Team Name (e.g. Royal Strikers)" 
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#131E32]/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] text-xs shadow-inner"
            value={newTeam.name}
            onChange={e => setNewTeam({...newTeam, name: e.target.value})}
          />
          <div className="flex items-center gap-2">
            <input 
              type="color" 
              className="w-14 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"
              value={newTeam.color}
              onChange={e => setNewTeam({...newTeam, color: e.target.value})}
            />
            <button 
              onClick={handleAddTeam}
              className="flex-1 sm:flex-none bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:opacity-95 transition-all text-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Team
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {teams.map(team => (
          <div key={team.id} className="stadium-card p-3.5 sm:p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm hover:border-[#00F2FE]/50 transition-all group">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg border shrink-0 shadow-sm font-sans" 
                style={{ backgroundColor: team.color + '25', borderColor: team.color, color: team.color }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 truncate">
                <h3 className="font-bold text-sm text-white group-hover:text-[#00F2FE] transition-colors truncate">{team.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Color: <span className="font-semibold" style={{ color: team.color }}>{team.color}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => deleteTeam(team.id).then(fetchTeams)}
                className="p-2 text-slate-500 hover:text-[#EF4444] hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title="Delete team"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
