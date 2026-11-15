import React, { useState } from 'react';
import { AlertTriangle, Shield, Trash2, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { purgeAllDataCompletely, seedDemoCricketData } from '../utils/seedData';

export const SuperAdminPanel: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [isPurging, setIsPurging] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="p-4 text-center text-red-600 font-bold">
        Access Denied. Super Admin privileges required.
      </div>
    );
  }

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoCricketData();
      alert(`Seeded successfully! Added ${res.playersCount} players, ${res.teamsCount} teams, and ${res.matchesCount} matches.`);
    } catch (err) {
      console.error('Seed failed:', err);
      alert('Seeding failed. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePurge = async () => {
    if (window.confirm('Are you absolutely sure? This will delete EVERYTHING!')) {
      setIsPurging(true);
      try {
        await purgeAllDataCompletely();
        alert('System purged successfully.');
      } catch (err) {
        console.error('Purge failed:', err);
        alert('Purge failed.');
      } finally {
        setIsPurging(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-[#1554B8]" />
        <h1 className="font-display font-black text-2xl text-[#17211D]">Super Admin Panel</h1>
      </div>

      {/* Demo Data Seeder */}
      <div className="bg-white border border-[#E3EAE7] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-[#1554B8]">
          <Database className="w-6 h-6" />
          <h2 className="font-bold text-lg">Sample Data Management</h2>
        </div>
        <p className="text-xs text-slate-600">
          Populate realistic cricket players, teams, live/completed matches, and leaderboard stats.
        </p>
        <button
          onClick={handleSeed}
          disabled={isSeeding}
          className="w-full flex items-center justify-center gap-2 bg-[#1554B8] hover:bg-[#0E3E8C] text-white font-bold py-3 rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          {isSeeding ? 'Seeding Demo Data...' : 'Seed Sample Cricket Data'}
        </button>
      </div>

      <div className="bg-white border border-[#E3EAE7] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-[#FF263D]">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="font-bold text-lg">Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-600">
          High-level system maintenance tools. Actions taken here are irreversible.
        </p>
        <button
          onClick={handlePurge}
          disabled={isPurging}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isPurging ? 'Purging...' : 'Purge All System Data'}
        </button>
      </div>
    </div>
  );
};
