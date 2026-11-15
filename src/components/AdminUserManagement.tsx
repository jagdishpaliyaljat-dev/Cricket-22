import React, { useState, useEffect, useMemo } from 'react';
import { AppUser, Player, PlayingRole, BattingStyle, BowlingStyle } from '../types/cricket';
import { subscribeAppUsers, createPlayer } from '../services/playerService';
import {
  ArrowLeft,
  Search,
  User,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  X,
  Shield,
} from 'lucide-react';

interface AdminUserManagementProps {
  players: Player[];
  onBack: () => void;
  onRefreshData?: () => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  players,
  onBack,
  onRefreshData,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Conversion Form State
  const [convertingUser, setConvertingUser] = useState<AppUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    playingRole: 'top_order_batter' as PlayingRole,
    battingStyle: 'right_hand_bat' as BattingStyle,
    bowlingStyle: 'right_arm_medium' as BowlingStyle,
    teamName: '',
    jerseyNumber: '',
    location: '',
  });

  useEffect(() => {
    const unsub = subscribeAppUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        console.error('AdminUserManagement: Subscription error:', err);
        setNotice({ type: 'error', message: 'Failed to fetch users. Permission denied.' });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const filteredUsers = useMemo(() => {
    const playerIds = new Set(players.map((p) => p.id));
    return users.filter((u) => {
      // 1. Filter out users who are already players
      if (playerIds.has(u.id)) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, players, searchQuery]);

  const handleStartConversion = (user: AppUser) => {
    setConvertingUser(user);
    setFormData({
      fullName: user.displayName || user.email.split('@')[0],
      playingRole: 'top_order_batter',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'right_arm_medium',
      teamName: '',
      jerseyNumber: '',
      location: '',
    });
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingUser) return;

    if (!formData.fullName.trim()) {
      showNotice('Full Name is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const jerseyNum = parseInt(formData.jerseyNumber, 10);

      const newPlayer: Omit<Player, 'career' | 'registrationDate'> = {
        id: convertingUser.id,
        fullName: formData.fullName.trim(),
        email: convertingUser.email,
        playingRole: formData.playingRole,
        battingStyle: formData.battingStyle,
        bowlingStyle: formData.bowlingStyle,
        teamName: formData.teamName.trim() || undefined,
        jerseyNumber: isNaN(jerseyNum) ? undefined : jerseyNum,
        location: formData.location.trim() || undefined,
        verificationStatus: 'verified',
        status: 'active',
        photoUrl: convertingUser.photoURL || undefined,
      };

      await createPlayer(newPlayer);
      showNotice(`Successfully converted ${newPlayer.fullName} to player!`);
      setConvertingUser(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Conversion error:', err);
      showNotice('Failed to convert user to player.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 font-sans text-slate-100">
      {/* Notice */}
      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#131D33] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold border border-cyan-500/40 flex items-center gap-2 animate-in slide-in-from-top">
          <span
            className={`w-2 h-2 rounded-full ${
              notice.type === 'success' ? 'bg-[#00F2FE]' : 'bg-rose-500'
            }`}
          />
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-[#131D33] border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 shadow-sm cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h1 className="font-display font-black text-xl text-white">Registered Users</h1>
            <p className="text-[11px] text-slate-400">New app users who haven't been added as players yet</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#131D33] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] shadow-inner transition-colors"
        />
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-[#00F2FE] rounded-full animate-spin" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">Fetching Users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="stadium-card rounded-3xl p-10 text-center space-y-3 border border-white/10">
            <div className="w-16 h-16 bg-[#131D33] rounded-full flex items-center justify-center mx-auto border border-white/10">
              <User className="w-8 h-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white">No new users found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                All registered app users are already in the player directory or match your search.
              </p>
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="stadium-card rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-4 shadow-lg hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-cyan-950/40 border-2 border-[#00F2FE] overflow-hidden shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,254,0.2)]">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#00F2FE] font-black text-lg">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white truncate leading-tight">{user.displayName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    <span className="truncate font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#00F2FE] font-bold font-mono uppercase tracking-tighter">
                    <Clock className="w-3 h-3" />
                    <span>
                      Joined:{' '}
                      {new Date(user.createdAt || '').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartConversion(user)}
                className="bg-gradient-to-r from-[#00F2FE] to-blue-600 hover:from-[#00F2FE]/90 hover:to-blue-600/90 text-slate-950 font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Convert</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Conversion Modal */}
      {convertingUser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-white/10 rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[#00F2FE] flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-xl text-white leading-tight">
                    Create Player Profile
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Customizing: {convertingUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertingUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-5">
              {/* Profile Sync Note */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#00F2FE] shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200 leading-relaxed font-medium">
                  <strong className="text-white">Google Profile Synced:</strong> Profile image will be automatically set to the user's Google account photo.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Player Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                      Playing Role
                    </label>
                    <select
                      value={formData.playingRole}
                      onChange={(e) => setFormData({ ...formData, playingRole: e.target.value as PlayingRole })}
                      className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all"
                    >
                      <option value="top_order_batter">Top Batter</option>
                      <option value="middle_order_batter">Mid Batter</option>
                      <option value="wicketkeeper_batter">WK-Batter</option>
                      <option value="batting_allrounder">Bat All-rounder</option>
                      <option value="bowling_allrounder">Bowl All-rounder</option>
                      <option value="pace_bowler">Pace Bowler</option>
                      <option value="spin_bowler">Spin Bowler</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                      Jersey No.
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 07"
                      value={formData.jerseyNumber}
                      onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                      className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                      Batting Style
                    </label>
                    <select
                      value={formData.battingStyle}
                      onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value as BattingStyle })}
                      className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                    >
                      <option value="right_hand_bat">Right Hand</option>
                      <option value="left_hand_bat">Left Hand</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                      Bowling Style
                    </label>
                    <select
                      value={formData.bowlingStyle}
                      onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value as BowlingStyle })}
                      className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                    >
                      <option value="right_arm_fast">RH Fast</option>
                      <option value="right_arm_medium">RH Medium</option>
                      <option value="right_arm_spin">RH Spin</option>
                      <option value="left_arm_fast">LH Fast</option>
                      <option value="left_arm_spin">LH Spin</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Current Team
                  </label>
                  <input
                    type="text"
                    placeholder="Team Name (Optional)"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConvertingUser(null)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-gradient-to-r from-[#00F2FE] to-blue-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Create Player</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
