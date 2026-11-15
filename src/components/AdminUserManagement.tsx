import React, { useState, useEffect, useMemo } from 'react';
import {
  AppUser,
  Player,
  PlayingRole,
  BattingStyle,
  BowlingStyle,
  UserRole,
} from '../types/cricket';
import {
  subscribeAppUsers,
  subscribeAdminUids,
  subscribeScorerUids,
  updateUserRole,
  createOrInviteUser,
  createPlayer,
} from '../services/playerService';
import { logAdminAction } from '../utils/auditLogger';
import { useAuth } from '../context/AuthContext';
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
  Crown,
  UserCheck,
  Activity,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Check,
  ShieldAlert,
  Plus,
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
  const { currentUser, appUser: currentAppUser } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [adminUids, setAdminUids] = useState<Set<string>>(new Set());
  const [scorerUids, setScorerUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<
    'all' | 'admin' | 'scorer' | 'player' | 'unconverted'
  >('all');
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Role Change Modal State
  const [roleModalUser, setRoleModalUser] = useState<AppUser | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('admin');
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Quick Add / Invite User Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    displayName: string;
    role: UserRole;
  }>({
    email: '',
    displayName: '',
    role: 'admin',
  });
  const [isInviting, setIsInviting] = useState(false);

  // Conversion Form State (Create Player profile for registered user)
  const [convertingUser, setConvertingUser] = useState<AppUser | null>(null);
  const [isSubmittingPlayer, setIsSubmittingPlayer] = useState(false);
  const [playerFormData, setPlayerFormData] = useState({
    fullName: '',
    playingRole: 'top_order_batter' as PlayingRole,
    battingStyle: 'right_hand_bat' as BattingStyle,
    bowlingStyle: 'right_arm_medium' as BowlingStyle,
    teamName: '',
    jerseyNumber: '',
    location: '',
  });

  // Subscribe to Users, Admins, and Scorers in Firestore
  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubAdmins: (() => void) | undefined;
    let unsubScorers: (() => void) | undefined;

    try {
      unsubUsers = subscribeAppUsers(
        (data) => {
          setUsers(data);
          setLoading(false);
        },
        (err) => {
          console.error('AdminUserManagement: Users subscription error:', err);
          showNotice('Failed to fetch users list from database.', 'error');
          setLoading(false);
        }
      );

      unsubAdmins = subscribeAdminUids(
        (ids) => {
          setAdminUids(new Set(ids));
        },
        (err) => {
          console.warn('AdminUserManagement: Admins subscription warning:', err);
        }
      );

      unsubScorers = subscribeScorerUids(
        (ids) => {
          setScorerUids(new Set(ids));
        },
        (err) => {
          console.warn('AdminUserManagement: Scorers subscription warning:', err);
        }
      );
    } catch (err) {
      console.error('Subscription setup failed:', err);
      setLoading(false);
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubAdmins) unsubAdmins();
      if (unsubScorers) unsubScorers();
    };
  }, []);

  const showNotice = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Helper to determine accurate user role
  const getUserEffectiveRole = (u: AppUser): UserRole => {
    if (adminUids.has(u.id) || u.role === 'admin' || u.isSuperAdmin) {
      return 'admin';
    }
    if (scorerUids.has(u.id) || u.role === 'scorer') {
      return 'scorer';
    }
    return 'player';
  };

  // Map of Player IDs for fast lookup
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) {
      if (p.id) map.set(p.id, p);
      if (p.userId) map.set(p.userId, p);
    }
    return map;
  }, [players]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    let adminsCount = 0;
    let scorersCount = 0;
    let playersCount = 0;
    let unconvertedCount = 0;

    for (const u of users) {
      const role = getUserEffectiveRole(u);
      if (role === 'admin') adminsCount++;
      else if (role === 'scorer') scorersCount++;
      else playersCount++;

      if (!playerMap.has(u.id)) {
        unconvertedCount++;
      }
    }

    return {
      total: users.length,
      admins: adminsCount,
      scorers: scorersCount,
      players: playersCount,
      unconverted: unconvertedCount,
    };
  }, [users, adminUids, scorerUids, playerMap]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const role = getUserEffectiveRole(u);
      const isPlayerLinked = playerMap.has(u.id);

      // Filter Tab
      if (selectedRoleFilter === 'admin' && role !== 'admin') return false;
      if (selectedRoleFilter === 'scorer' && role !== 'scorer') return false;
      if (selectedRoleFilter === 'player' && role !== 'player') return false;
      if (selectedRoleFilter === 'unconverted' && isPlayerLinked) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.displayName || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesId = (u.id || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesId;
      }
      return true;
    });
  }, [users, adminUids, scorerUids, playerMap, selectedRoleFilter, searchQuery]);

  // Open Role Change Modal
  const handleOpenRoleModal = (user: AppUser) => {
    setRoleModalUser(user);
    const current = getUserEffectiveRole(user);
    // Suggest the other role by default
    setSelectedNewRole(current === 'admin' ? 'scorer' : 'admin');
  };

  // Execute Role Update
  const handleConfirmRoleChange = async () => {
    if (!roleModalUser) return;

    const previousRole = getUserEffectiveRole(roleModalUser);
    if (previousRole === selectedNewRole) {
      setRoleModalUser(null);
      return;
    }

    setIsChangingRole(true);
    try {
      await updateUserRole(
        roleModalUser.id,
        roleModalUser.email,
        selectedNewRole,
        currentUser
      );

      // Audit Log
      await logAdminAction(
        currentUser,
        'change_user_role',
        roleModalUser.id,
        'user',
        {
          userName: roleModalUser.displayName,
          userEmail: roleModalUser.email,
          previousRole,
          newRole: selectedNewRole,
        }
      );

      // Local State Optimistic Update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === roleModalUser.id ? { ...u, role: selectedNewRole } : u
        )
      );

      if (selectedNewRole === 'admin') {
        setAdminUids((prev) => new Set([...prev, roleModalUser.id]));
        setScorerUids((prev) => {
          const next = new Set(prev);
          next.delete(roleModalUser.id);
          return next;
        });
        showNotice(
          `🎉 ${roleModalUser.displayName || roleModalUser.email} को सफलतापूर्वक Admin बनाया गया!`,
          'success'
        );
      } else if (selectedNewRole === 'scorer') {
        setScorerUids((prev) => new Set([...prev, roleModalUser.id]));
        setAdminUids((prev) => {
          const next = new Set(prev);
          next.delete(roleModalUser.id);
          return next;
        });
        showNotice(
          `🏏 ${roleModalUser.displayName || roleModalUser.email} को Scorer भूमिका दी गई!`,
          'success'
        );
      } else {
        setAdminUids((prev) => {
          const next = new Set(prev);
          next.delete(roleModalUser.id);
          return next;
        });
        setScorerUids((prev) => {
          const next = new Set(prev);
          next.delete(roleModalUser.id);
          return next;
        });
        showNotice(
          `👤 ${roleModalUser.displayName || roleModalUser.email} को Player भूमिका में सेट किया गया।`,
          'info'
        );
      }

      setRoleModalUser(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Role update error:', err);
      showNotice('भूमिका बदलने में त्रुटि हुई। कृपया पुनः प्रयास करें।', 'error');
    } finally {
      setIsChangingRole(false);
    }
  };

  // Quick Pre-add / Invite User
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.displayName.trim()) {
      showNotice('कृपया नाम और ईमेल दोनों दर्ज करें।', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const newUser = await createOrInviteUser(
        inviteForm.email,
        inviteForm.displayName,
        inviteForm.role,
        currentUser
      );

      await logAdminAction(
        currentUser,
        'invite_user',
        newUser.id,
        'user',
        {
          userName: newUser.displayName,
          userEmail: newUser.email,
          role: inviteForm.role,
        }
      );

      showNotice(
        `✓ उपयोगकर्ता ${newUser.displayName} (${inviteForm.role.toUpperCase()}) सफलतापूर्वक जोड़ा गया!`,
        'success'
      );
      setShowInviteModal(false);
      setInviteForm({ email: '', displayName: '', role: 'admin' });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Invite error:', err);
      showNotice('उपयोगकर्ता जोड़ने में विफल।', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  // Start Player Conversion
  const handleStartConversion = (user: AppUser) => {
    setConvertingUser(user);
    setPlayerFormData({
      fullName: user.displayName || user.email.split('@')[0],
      playingRole: 'top_order_batter',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'right_arm_medium',
      teamName: '',
      jerseyNumber: '',
      location: '',
    });
  };

  // Submit Player Profile Conversion
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingUser) return;

    if (!playerFormData.fullName.trim()) {
      showNotice('Player Full Name is required.', 'error');
      return;
    }

    setIsSubmittingPlayer(true);
    try {
      const jerseyNum = parseInt(playerFormData.jerseyNumber, 10);

      const newPlayer: Omit<Player, 'career' | 'registrationDate'> = {
        id: convertingUser.id,
        userId: convertingUser.id,
        fullName: playerFormData.fullName.trim(),
        email: convertingUser.email,
        playingRole: playerFormData.playingRole,
        battingStyle: playerFormData.battingStyle,
        bowlingStyle: playerFormData.bowlingStyle,
        teamName: playerFormData.teamName.trim() || undefined,
        jerseyNumber: isNaN(jerseyNum) ? undefined : jerseyNum,
        location: playerFormData.location.trim() || undefined,
        verificationStatus: 'verified',
        status: 'active',
        photoUrl: convertingUser.photoURL || undefined,
      };

      await createPlayer(newPlayer);
      await logAdminAction(
        currentUser,
        'convert_to_player',
        convertingUser.id,
        'player',
        {
          playerName: newPlayer.fullName,
          email: convertingUser.email,
        }
      );

      showNotice(`✓ Successfully converted ${newPlayer.fullName} to player!`);
      setConvertingUser(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Conversion error:', err);
      showNotice('Failed to convert user to player.', 'error');
    } finally {
      setIsSubmittingPlayer(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 font-sans text-slate-100 max-w-5xl mx-auto pb-10">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[110] bg-[#131D33] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold border border-cyan-500/40 flex items-center gap-2 animate-in slide-in-from-top">
          <span
            className={`w-2 h-2 rounded-full ${
              notice.type === 'success'
                ? 'bg-[#00F2FE]'
                : notice.type === 'info'
                ? 'bg-amber-400'
                : 'bg-rose-500'
            }`}
          />
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#131D33] to-[#0B1120] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 shadow-sm cursor-pointer transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                User & Role Management
              </h1>
              <span className="bg-cyan-500/10 border border-cyan-500/30 text-[#00F2FE] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                Admin Suite
              </span>
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5">
              उपयोगकर्ताओं की भूमिकाएं बदलें (Admin, Scorer, Player) और नए एडमिन बनाएं
            </p>
          </div>
        </div>

        {/* Quick Add User Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-gradient-to-r from-[#00F2FE] to-blue-600 hover:from-[#00F2FE]/90 hover:to-blue-600/90 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Admin / User</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div
          onClick={() => setSelectedRoleFilter('all')}
          className={`stadium-card rounded-2xl p-3 border cursor-pointer transition-all ${
            selectedRoleFilter === 'all'
              ? 'border-[#00F2FE] bg-cyan-950/20 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Total Users</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display font-black text-xl text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('admin')}
          className={`stadium-card rounded-2xl p-3 border cursor-pointer transition-all ${
            selectedRoleFilter === 'admin'
              ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
            <span>Admins 👑</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-black text-xl text-amber-300 mt-1">
            {stats.admins}
          </div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('scorer')}
          className={`stadium-card rounded-2xl p-3 border cursor-pointer transition-all ${
            selectedRoleFilter === 'scorer'
              ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
            <span>Scorers 🏏</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-xl text-emerald-300 mt-1">
            {stats.scorers}
          </div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('player')}
          className={`stadium-card rounded-2xl p-3 border cursor-pointer transition-all ${
            selectedRoleFilter === 'player'
              ? 'border-blue-400 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400 text-[11px] font-bold">
            <span>Players 👤</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-display font-black text-xl text-blue-300 mt-1">
            {stats.players}
          </div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('unconverted')}
          className={`col-span-2 sm:col-span-1 stadium-card rounded-2xl p-3 border cursor-pointer transition-all ${
            selectedRoleFilter === 'unconverted'
              ? 'border-purple-400 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
            <span>New Signups ✨</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-display font-black text-xl text-purple-300 mt-1">
            {stats.unconverted}
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131D33] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] shadow-inner transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-[#00F2FE] text-slate-950 shadow-md font-black'
                : 'bg-[#131D33] text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('admin')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoleFilter === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-[#131D33] text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            👑 Admins ({stats.admins})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('scorer')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoleFilter === 'scorer'
                ? 'bg-emerald-400 text-slate-950 shadow-md font-black'
                : 'bg-[#131D33] text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            🏏 Scorers ({stats.scorers})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('player')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoleFilter === 'player'
                ? 'bg-blue-400 text-slate-950 shadow-md font-black'
                : 'bg-[#131D33] text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            👤 Players ({stats.players})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('unconverted')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoleFilter === 'unconverted'
                ? 'bg-purple-400 text-slate-950 shadow-md font-black'
                : 'bg-[#131D33] text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            ✨ New ({stats.unconverted})
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-[#00F2FE] rounded-full animate-spin" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              Loading Users & Roles...
            </span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="stadium-card rounded-3xl p-12 text-center space-y-4 border border-white/10">
            <div className="w-16 h-16 bg-[#131D33] rounded-full flex items-center justify-center mx-auto border border-white/10">
              <User className="w-8 h-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">No Users Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No user matched your search "${searchQuery}".`
                  : 'No users registered under this filter yet. You can invite or add an admin manually.'}
              </p>
            </div>
            {selectedRoleFilter !== 'all' && (
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className="text-xs font-bold text-[#00F2FE] hover:underline cursor-pointer"
              >
                View all users
              </button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const role = getUserEffectiveRole(user);
            const isSuper = !!user.isSuperAdmin;
            const isSelf = currentUser?.uid === user.id;
            const linkedPlayer = playerMap.get(user.id);

            return (
              <div
                key={user.id}
                className={`stadium-card rounded-3xl p-4 sm:p-5 border transition-all shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  role === 'admin'
                    ? 'border-amber-400/40 bg-gradient-to-r from-amber-950/10 via-[#131D33] to-[#0B1120]'
                    : role === 'scorer'
                    ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/10 via-[#131D33] to-[#0B1120]'
                    : 'border-white/10 hover:border-cyan-500/30'
                }`}
              >
                {/* User Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-13 h-13 rounded-2xl border-2 overflow-hidden flex items-center justify-center shadow-md ${
                        role === 'admin'
                          ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                          : role === 'scorer'
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                          : 'border-cyan-400/60 bg-cyan-950/40 text-[#00F2FE]'
                      }`}
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display font-black text-xl">
                          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {role === 'admin' && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border border-slate-900">
                        <Crown className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate leading-tight">
                        {user.displayName || 'Unnamed User'}
                      </h3>

                      {isSelf && (
                        <span className="bg-cyan-500/20 text-[#00F2FE] border border-cyan-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                          You
                        </span>
                      )}

                      {isSuper && (
                        <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Super Admin
                        </span>
                      )}

                      {/* Current Role Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 ${
                          role === 'admin'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : role === 'scorer'
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {role === 'admin' ? (
                          <>
                            <Crown className="w-3 h-3 text-amber-400" /> ADMIN
                          </>
                        ) : role === 'scorer' ? (
                          <>
                            <Activity className="w-3 h-3 text-emerald-400" /> SCORER
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-slate-400" /> PLAYER
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate font-medium">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1 font-mono uppercase tracking-tight text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          Joined:{' '}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Earlier'}
                        </span>
                      </div>

                      {linkedPlayer ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            Player Profile Active ({linkedPlayer.playingRole?.replace(/_/g, ' ') || 'Player'})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-purple-400 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          <span>No Player Profile yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Button Group */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Change Role Button */}
                  <button
                    onClick={() => handleOpenRoleModal(user)}
                    disabled={isSuper && !currentAppUser?.isSuperAdmin}
                    className={`px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md ${
                      role === 'admin'
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    } ${isSuper && !currentAppUser?.isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Change user role (Admin, Scorer, Player)"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Change Role</span>
                  </button>

                  {/* Convert to Player Profile Button (if not already converted) */}
                  {!linkedPlayer && (
                    <button
                      onClick={() => handleStartConversion(user)}
                      className="bg-gradient-to-r from-[#00F2FE] to-blue-600 hover:from-[#00F2FE]/90 hover:to-blue-600/90 text-slate-950 font-black text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Create Player Profile for this user"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Convert</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. ROLE CHANGE CONFIRMATION MODAL                             */}
      {/* ============================================================== */}
      {roleModalUser && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-white/10 rounded-[32px] w-full max-w-md shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-200 text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg sm:text-xl text-white leading-tight">
                    Change User Role
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    उपयोगकर्ता भूमिका अपडेट करें
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Summary Box */}
            <div className="bg-[#131D33] border border-white/10 rounded-2xl p-4 mb-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 text-[#00F2FE] flex items-center justify-center font-display font-black text-lg shrink-0">
                {roleModalUser.photoURL ? (
                  <img
                    src={roleModalUser.photoURL}
                    alt={roleModalUser.displayName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  (roleModalUser.displayName || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate">
                  {roleModalUser.displayName || 'User'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {roleModalUser.email}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
                  Current: {getUserEffectiveRole(roleModalUser).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Role Options */}
            <div className="space-y-2.5 mb-6">
              <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">
                Select New Role / नई भूमिका चुनें *
              </label>

              {/* ADMIN OPTION */}
              <div
                onClick={() => setSelectedNewRole('admin')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedNewRole === 'admin'
                    ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border-white/10 bg-[#131D33]/60 hover:border-white/20'
                }`}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 border-amber-400">
                  {selectedNewRole === 'admin' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin (एडमिन)</span>
                    <span className="bg-amber-400/20 text-amber-300 text-[9px] px-2 py-0.2 rounded-full font-black uppercase">
                      Full Control
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    मैच बनाना, एडिट करना, प्लेयर व टीम मैनेजमेंट, ऑडिट लॉग्स और अन्य उपयोगकर्ताओं को एडमिन बनाने का पूरा अधिकार।
                  </p>
                </div>
              </div>

              {/* SCORER OPTION */}
              <div
                onClick={() => setSelectedNewRole('scorer')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedNewRole === 'scorer'
                    ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-white/10 bg-[#131D33]/60 hover:border-white/20'
                }`}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 border-emerald-400">
                  {selectedNewRole === 'scorer' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Official Scorer (स्कोरर)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    लाइव बॉल-बाय-बॉल स्कोरिंग कंसोल, रन, विकेट और मैच स्कोर अपडेट करने की अनुमति।
                  </p>
                </div>
              </div>

              {/* PLAYER OPTION */}
              <div
                onClick={() => setSelectedNewRole('player')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedNewRole === 'player'
                    ? 'border-blue-400 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'border-white/10 bg-[#131D33]/60 hover:border-white/20'
                }`}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 border-blue-400">
                  {selectedNewRole === 'player' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Registered Player (खिलाड़ी)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    स्टैंडर्ड व्यूअर और प्लेयर प्रोफ़ाइल। एडमिन या स्कोरर राइट्स नहीं रहेंगे।
                  </p>
                </div>
              </div>
            </div>

            {/* Self-Demotion Alert */}
            {currentUser?.uid === roleModalUser.id && selectedNewRole !== 'admin' && (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>चेतावनी:</strong> आप अपने खुद के खाते की भूमिका बदल रहे हैं। एडमिन से हटाने पर आप एडमिन पैनल से लॉगआउट हो जाएंगे!
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isChangingRole}
                className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isChangingRole ? (
                  <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Update Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PRE-ADD / INVITE USER MODAL                                 */}
      {/* ============================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-white/10 rounded-[32px] w-full max-w-md shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-200 text-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[#00F2FE] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-xl text-white leading-tight">
                    Add New Admin / User
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    ईमेल से सीधे एडमिन या स्कोरर जोड़ें
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Full Name / नाम *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={inviteForm.displayName}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, displayName: e.target.value })
                  }
                  className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Google Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all shadow-inner"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  जब यह उपयोगकर्ता इस ईमेल से लॉगिन करेगा, उसे तुरंत चुनी गई भूमिका मिल जाएगी।
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Role to Assign / भूमिका *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'admin' })}
                    className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      inviteForm.role === 'admin'
                        ? 'border-amber-400 bg-amber-950/40 text-amber-300 shadow-md'
                        : 'border-white/10 bg-[#131D33] text-slate-400'
                    }`}
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'scorer' })}
                    className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      inviteForm.role === 'scorer'
                        ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 shadow-md'
                        : 'border-white/10 bg-[#131D33] text-slate-400'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Scorer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'player' })}
                    className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      inviteForm.role === 'player'
                        ? 'border-blue-400 bg-blue-950/40 text-blue-300 shadow-md'
                        : 'border-white/10 bg-[#131D33] text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Player</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#00F2FE] to-blue-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isInviting ? (
                    <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Add User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CONVERT TO PLAYER PROFILE MODAL                             */}
      {/* ============================================================== */}
      {convertingUser && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-white/10 rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-200 text-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[#00F2FE] flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-xl text-white leading-tight">
                    Create Player Profile
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    खिलाड़ी प्रोफ़ाइल तैयार करें: {convertingUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertingUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00F2FE] shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200 leading-relaxed font-medium">
                  <strong>Synced Profile:</strong> The player's photo and basic details will be linked to their account.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={playerFormData.fullName}
                  onChange={(e) =>
                    setPlayerFormData({ ...playerFormData, fullName: e.target.value })
                  }
                  className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F2FE] transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Playing Role
                  </label>
                  <select
                    value={playerFormData.playingRole}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        playingRole: e.target.value as PlayingRole,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE] transition-all"
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
                    value={playerFormData.jerseyNumber}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        jerseyNumber: e.target.value,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Batting Style
                  </label>
                  <select
                    value={playerFormData.battingStyle}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        battingStyle: e.target.value as BattingStyle,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
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
                    value={playerFormData.bowlingStyle}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        bowlingStyle: e.target.value as BowlingStyle,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    placeholder="Team (Optional)"
                    value={playerFormData.teamName}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        teamName: e.target.value,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={playerFormData.location}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        location: e.target.value,
                      })
                    }
                    className="w-full bg-[#131D33] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConvertingUser(null)}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlayer}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#00F2FE] to-blue-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmittingPlayer ? (
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
