import React, { useState, useEffect } from 'react';
import { getTeams, addTeam, updateTeam, deleteTeam, Team } from '../services/teamService';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';

export const TeamManagementView: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeam, setNewTeam] = useState({ name: '', color: '#1554B8', logoUrl: '' });

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
    setNewTeam({ name: '', color: '#1554B8', logoUrl: '' });
    fetchTeams();
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h2 className="font-display font-black text-2xl text-[#17211D]">Team Management</h2>
      
      <div className="bg-white p-6 rounded-2xl border border-[#E3EAE7] shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-[#17211D]">Add New Team</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Team Name" 
            className="flex-1 p-2 rounded-xl border border-[#E3EAE7] focus:ring-2 focus:ring-[#1554B8] outline-none"
            value={newTeam.name}
            onChange={e => setNewTeam({...newTeam, name: e.target.value})}
          />
          <input 
            type="color" 
            className="w-16 h-10 rounded-xl border border-[#E3EAE7]"
            value={newTeam.color}
            onChange={e => setNewTeam({...newTeam, color: e.target.value})}
          />
          <button 
            onClick={handleAddTeam}
            className="bg-[#1554B8] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#104396] transition-colors"
          >
            <Plus className="w-5 h-5" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white p-4 rounded-2xl border border-[#E3EAE7] flex items-center justify-between shadow-sm hover:border-[#1554B8] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border" style={{ backgroundColor: team.color + '20', borderColor: team.color, color: team.color }}>
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#17211D]">{team.name}</h3>
                <p className="text-xs text-[#68746F]">Color: {team.color}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-[#1554B8] transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => deleteTeam(team.id).then(fetchTeams)}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
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
