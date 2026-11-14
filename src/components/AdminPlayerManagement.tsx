import React, { useState, useMemo } from 'react';
import {
  Player,
  PlayingRole,
  BattingStyle,
  BowlingStyle,
} from '../types/cricket';
import { createPlayer, updatePlayer, deletePlayer } from '../services/playerService';
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit3,
  ShieldCheck,
  Ban,
  CheckCircle2,
  X,
  Camera,
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  BarChart2,
  Clock,
  Trash2,
  ChevronRight,
  Activity,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react';

interface AdminPlayerManagementProps {
  players: Player[];
  onRefreshData?: () => void;
  onOpenSidebar?: () => void;
  currentUserDisplayName?: string;
  currentUserPhotoUrl?: string;
}

// Demo/Sample players removed completely as per user request
const KNOWN_TEAMS: string[] = [];

export const AdminPlayerManagement: React.FC<AdminPlayerManagementProps> = ({
  players: initialPlayers,
  onRefreshData,
  onOpenSidebar,
  currentUserDisplayName = 'Admin User',
  currentUserPhotoUrl,
}) => {
  // Navigation View State inside Player Management
  const [viewState, setViewState] = useState<'list' | 'details' | 'form'>('list');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // List View State
  const [statusTab, setStatusTab] = useState<'all' | 'verified' | 'pending' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [openMenuPlayerId, setOpenMenuPlayerId] = useState<string | null>(null);

  // Player Details View State
  const [detailsTab, setDetailsTab] = useState<'overview' | 'batting' | 'bowling' | 'matches'>('overview');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneCode: '+91',
    phoneNumber: '',
    dob: '',
    location: '',
    battingStyle: 'right_hand_bat' as BattingStyle,
    bowlingStyle: 'right_arm_spin' as BowlingStyle,
    primaryRole: 'top_order_batter' as PlayingRole,
    secondaryRole: 'none' as PlayingRole | 'none',
    teamName: '',
    jerseyNumber: '',
    verificationStatus: 'verified' as 'verified' | 'pending' | 'blocked',
    photoUrl: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  // Only real Firestore players (no sample/demo fallback)
  const allPlayersList = useMemo(() => {
    if (initialPlayers && initialPlayers.length > 0) {
      return initialPlayers.map((p) => ({
        ...p,
        verificationStatus:
          p.verificationStatus || (p.status === 'inactive' ? 'blocked' : 'verified'),
      }));
    }
    return [];
  }, [initialPlayers]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: allPlayersList.length,
      verified: allPlayersList.filter((p) => p.verificationStatus === 'verified').length,
      pending: allPlayersList.filter((p) => p.verificationStatus === 'pending').length,
      blocked: allPlayersList.filter((p) => p.verificationStatus === 'blocked').length,
    };
  }, [allPlayersList]);

  // Filtered player list
  const filteredPlayers = useMemo(() => {
    return allPlayersList.filter((p) => {
      // Tab filter
      if (statusTab === 'verified' && p.verificationStatus !== 'verified') return false;
      if (statusTab === 'pending' && p.verificationStatus !== 'pending') return false;
      if (statusTab === 'blocked' && p.verificationStatus !== 'blocked') return false;

      // Role filter
      if (roleFilter !== 'all' && p.playingRole !== roleFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesTeam = (p.teamName || '').toLowerCase().includes(q);
        const matchesJersey = String(p.jerseyNumber || '').includes(q);
        const matchesLocation = (p.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTeam && !matchesJersey && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [allPlayersList, statusTab, roleFilter, searchQuery]);

  // Helper formatting for role names
  const formatRoleName = (role?: string): string => {
    if (!role || role === 'none') return 'None';
    switch (role) {
      case 'top_order_batter':
        return 'Top Order Batter';
      case 'middle_order_batter':
        return 'Middle Order Batter';
      case 'wicketkeeper_batter':
        return 'Wicketkeeper Batter';
      case 'batting_allrounder':
        return 'Batting All-rounder';
      case 'bowling_allrounder':
        return 'Bowling All-rounder';
      case 'pace_bowler':
        return 'Pace Bowler';
      case 'spin_bowler':
        return 'Spin Bowler';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  const formatBattingStyle = (style?: string): string => {
    if (!style) return 'Right Hand Bat';
    if (style === 'left_hand_bat') return 'Left Hand Bat';
    return 'Right Hand Bat';
  };

  const formatBowlingStyle = (style?: string): string => {
    if (!style || style === 'none') return 'None';
    switch (style) {
      case 'right_arm_fast':
        return 'Right Arm Fast';
      case 'right_arm_medium':
        return 'Right Arm Medium';
      case 'right_arm_spin':
        return 'Right Arm Off Spin';
      case 'left_arm_fast':
        return 'Left Arm Fast';
      case 'left_arm_spin':
        return 'Left Arm Spin';
      default:
        return style.replace(/_/g, ' ');
    }
  };

  // Open Add Player Form
  const handleOpenAddForm = () => {
    setFormMode('add');
    setSelectedPlayer(null);
    setFormData({
      fullName: '',
      email: '',
      phoneCode: '+91',
      phoneNumber: '',
      dob: '1998-03-14',
      location: 'Indore, Madhya Pradesh',
      battingStyle: 'right_hand_bat',
      bowlingStyle: 'right_arm_spin',
      primaryRole: 'top_order_batter',
      secondaryRole: 'bowling_allrounder',
      teamName: 'Metro Challengers',
      jerseyNumber: '07',
      verificationStatus: 'verified',
      photoUrl: '',
    });
    setFormErrors({});
    setViewState('form');
  };

  // Open Edit Player Form
  const handleOpenEditForm = (player: Player) => {
    setFormMode('edit');
    setSelectedPlayer(player);

    let phoneCode = '+91';
    let phoneNumber = player.mobileNumber || '';
    if (phoneNumber.startsWith('+91')) {
      phoneCode = '+91';
      phoneNumber = phoneNumber.replace('+91', '').trim();
    }

    setFormData({
      fullName: player.fullName,
      email: player.email || `${player.fullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      phoneCode,
      phoneNumber,
      dob: player.dob || '1998-03-14',
      location: player.location || 'Indore, Madhya Pradesh',
      battingStyle: player.battingStyle || 'right_hand_bat',
      bowlingStyle: player.bowlingStyle || 'right_arm_spin',
      primaryRole: player.playingRole || 'top_order_batter',
      secondaryRole: (player.secondaryRole as PlayingRole) || 'none',
      teamName: player.teamName || 'Metro Challengers',
      jerseyNumber: player.jerseyNumber ? String(player.jerseyNumber).padStart(2, '0') : '07',
      verificationStatus: player.verificationStatus || 'verified',
      photoUrl: player.photoUrl || '',
    });
    setFormErrors({});
    setViewState('form');
  };

  // Handle Verify Player
  const handleVerifyPlayer = async (player: Player) => {
    try {
      await updatePlayer(player.id, {
        verificationStatus: 'verified',
        status: 'active',
      });
      showNotice(`Player "${player.fullName}" verified successfully.`);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Verify error:', err);
      showNotice(`Verified player locally.`, 'info');
    }
  };

  // Modal confirmation states
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [confirmBlockPlayer, setConfirmBlockPlayer] = useState<{ player: Player; nextStatus: string; actionName: string } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Handle Block / Unblock Player
  const handleToggleBlockPlayer = (player: Player) => {
    const isCurrentlyBlocked = player.verificationStatus === 'blocked';
    const actionName = isCurrentlyBlocked ? 'unblock' : 'block';
    setConfirmBlockPlayer({
      player,
      nextStatus: isCurrentlyBlocked ? 'verified' : 'blocked',
      actionName,
    });
  };

  const executeToggleBlock = async () => {
    if (!confirmBlockPlayer) return;
    const { player, nextStatus, actionName } = confirmBlockPlayer;
    const isCurrentlyBlocked = player.verificationStatus === 'blocked';
    try {
      await updatePlayer(player.id, {
        verificationStatus: nextStatus as any,
        status: isCurrentlyBlocked ? 'active' : 'inactive',
      });
      showNotice(
        `Player "${player.fullName}" ${isCurrentlyBlocked ? 'unblocked' : 'blocked'} successfully.`
      );
      if (selectedPlayer && selectedPlayer.id === player.id) {
        setSelectedPlayer((prev) =>
          prev ? { ...prev, verificationStatus: nextStatus as any, status: isCurrentlyBlocked ? 'active' : 'inactive' } : null
        );
      }
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('[AdminPlayerManagement] Block toggle error:', err);
      showNotice(`Failed to ${actionName} player.`, 'error');
    } finally {
      setConfirmBlockPlayer(null);
    }
  };

  // Handle Delete Player
  const handlePlayerDelete = (player: Player) => {
    setPlayerToDelete(player);
  };

  const executePlayerDelete = async () => {
    if (!playerToDelete) return;
    try {
      console.log(`[AdminPlayerManagement] Attempting delete for player: ${playerToDelete.id}, name: ${playerToDelete.fullName}`);
      await deletePlayer(playerToDelete.id);
      console.log(`[AdminPlayerManagement] Delete service call successful for: ${playerToDelete.id}`);
      showNotice(`Player "${playerToDelete.fullName}" deleted successfully.`);
      if (selectedPlayer?.id === playerToDelete.id) {
        setViewState('list');
        setSelectedPlayer(null);
      }
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('[AdminPlayerManagement] Delete error details:', err);
      showNotice(`Failed to delete player: ${err instanceof Error ? err.message : 'Permission denied or network error.'}`, 'error');
    } finally {
      setPlayerToDelete(null);
    }
  };

  const handleDeleteAllPlayers = () => {
    setConfirmDeleteAll(true);
  };

  const executeDeleteAllPlayers = async () => {
    try {
      console.log(`[AdminPlayerManagement] Attempting to delete all players...`);
      for (const player of allPlayersList) {
        await deletePlayer(player.id);
      }
      showNotice(`All players deleted successfully.`);
      if (viewState === 'details') {
        setViewState('list');
        setSelectedPlayer(null);
      }
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('[AdminPlayerManagement] Delete all error:', err);
      showNotice(`Failed to delete all players.`, 'error');
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone Number is required.';
    } else if (!/^\d{10}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number must contain exactly 10 digits.';
    }

    if (!formData.dob) {
      errors.dob = 'Date of Birth is required.';
    }

    if (!formData.teamName) {
      errors.teamName = 'Team selection is required.';
    }

    if (formData.jerseyNumber) {
      const num = parseInt(formData.jerseyNumber, 10);
      if (isNaN(num) || num < 0 || num > 999) {
        errors.jerseyNumber = 'Jersey number must be between 0 and 999.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Player Submit
  const handleSavePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const fullMobile = `${formData.phoneCode} ${formData.phoneNumber.trim()}`;
      const jerseyNum = parseInt(formData.jerseyNumber, 10) || 7;

      if (formMode === 'add') {
        const newPlayerId = `player_${Date.now()}`;
        const newPlayer: Omit<Player, 'career' | 'registrationDate'> = {
          id: newPlayerId,
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          mobileNumber: fullMobile,
          dob: formData.dob,
          location: formData.location.trim(),
          playingRole: formData.primaryRole,
          secondaryRole: formData.secondaryRole === 'none' ? undefined : formData.secondaryRole,
          battingStyle: formData.battingStyle,
          bowlingStyle: formData.bowlingStyle,
          teamName: formData.teamName,
          jerseyNumber: jerseyNum,
          verificationStatus: formData.verificationStatus,
          status: formData.verificationStatus === 'blocked' ? 'inactive' : 'active',
          photoUrl: formData.photoUrl || undefined,
        };

        await createPlayer(newPlayer);
        showNotice(`Player "${newPlayer.fullName}" added successfully!`);
      } else if (selectedPlayer) {
        const updates: Partial<Player> = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          mobileNumber: fullMobile,
          dob: formData.dob,
          location: formData.location.trim(),
          playingRole: formData.primaryRole,
          secondaryRole: formData.secondaryRole === 'none' ? undefined : formData.secondaryRole,
          battingStyle: formData.battingStyle,
          bowlingStyle: formData.bowlingStyle,
          teamName: formData.teamName,
          jerseyNumber: jerseyNum,
          verificationStatus: formData.verificationStatus,
          status: formData.verificationStatus === 'blocked' ? 'inactive' : 'active',
          photoUrl: formData.photoUrl || undefined,
        };

        await updatePlayer(selectedPlayer.id, updates);
        showNotice(`Player "${formData.fullName}" updated successfully!`);
      }

      if (onRefreshData) onRefreshData();
      setViewState('list');
    } catch (err) {
      console.error('Error saving player:', err);
      showNotice('Could not save player record to Firebase.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status?: 'verified' | 'pending' | 'blocked') => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 bg-[#D8FBE5] text-[#007A3D] border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-[#FFF0D1] text-[#945700] border border-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 bg-[#FFE0E0] text-[#E53945] border border-red-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <Ban className="w-3 h-3" /> Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-[#D8FBE5] text-[#007A3D] px-2 py-0.5 rounded-full text-[11px] font-bold">
            Verified
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F6FC] text-[#172033] flex flex-col font-sans">
      {/* Toast Notice Banner */}
      {notice && (
        <div className="fixed top-16 right-4 z-50 bg-white border border-[#DFE7F2] text-[#172033] px-4 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2.5 transition-all animate-in fade-in">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            notice.type === 'success' ? 'bg-[#21864A]' : notice.type === 'error' ? 'bg-[#D94343]' : 'bg-[#1554B8]'
          }`} />
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="ml-2 text-[#718096] hover:text-[#172033] cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Shared Admin Header spacing */}
      <div className="pt-2"></div>

      {/* Main Content Area Routing */}
      <main className="flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full pb-20">
        {/* PLAYERS MANAGEMENT LIST */}
        {viewState === 'list' && (
          <div className="space-y-4">
            {/* Title & Add Player Button */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-sans font-bold text-xl sm:text-2xl text-[#172033] tracking-tight">
                  Players
                </h2>
                <p className="text-xs text-[#718096]">Manage LocalXI registered player directory & verification</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAllPlayers}
                  disabled={allPlayersList.length === 0}
                  className="bg-red-900/80 hover:bg-red-900 text-red-100 font-bold text-xs px-3 py-2 rounded-xl border border-red-500/40 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                  title="Delete all players"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-300" />
                  <span className="hidden xs:inline">Delete All</span>
                </button>

                <button
                  onClick={handleOpenAddForm}
                  className="bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs sm:text-sm px-3.5 py-2 sm:py-2.5 rounded-xl shadow-xs border border-[#1554B8] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>+ Add Player</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="bg-[#EAF2FF] p-1 rounded-2xl border border-[#DFE7F2] grid grid-cols-4 gap-1 text-[11px] font-bold">
              <button
                onClick={() => setStatusTab('all')}
                className={`py-2 px-0.5 rounded-xl text-center transition-all cursor-pointer ${
                  statusTab === 'all'
                    ? 'bg-[#1554B8] text-white shadow-xs'
                    : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                All <span className="text-[9px] opacity-70">({counts.all})</span>
              </button>

              <button
                onClick={() => setStatusTab('verified')}
                className={`py-2 px-0.5 rounded-xl text-center transition-all cursor-pointer ${
                  statusTab === 'verified'
                    ? 'bg-[#1554B8] text-white shadow-xs'
                    : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                Verified <span className="text-[9px] opacity-70">({counts.verified})</span>
              </button>

              <button
                onClick={() => setStatusTab('pending')}
                className={`py-2 px-0.5 rounded-xl text-center transition-all cursor-pointer ${
                  statusTab === 'pending'
                    ? 'bg-[#1554B8] text-white shadow-xs'
                    : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                Pending <span className="text-[9px] opacity-70">({counts.pending})</span>
              </button>

              <button
                onClick={() => setStatusTab('blocked')}
                className={`py-2 px-0.5 rounded-xl text-center transition-all cursor-pointer ${
                  statusTab === 'blocked'
                    ? 'bg-[#1554B8] text-white shadow-xs'
                    : 'text-[#718096] hover:text-[#172033]'
                }`}
              >
                Blocked <span className="text-[9px] opacity-70">({counts.blocked})</span>
              </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096] group-focus-within:text-[#1554B8] transition-colors" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#DFE7F2] rounded-[18px] pl-8.5 pr-3 py-2.5 text-xs text-[#172033] placeholder-[#718096] focus:outline-none focus:border-[#1554B8] transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172033] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-3.5 py-2.5 rounded-[18px] border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs ${
                  showFilterPanel || roleFilter !== 'all'
                    ? 'bg-[#1554B8] border-[#1554B8] text-white'
                    : 'bg-white border-[#DFE7F2] text-[#718096] hover:text-[#172033]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden xs:inline uppercase tracking-wider">Filter</span>
              </button>
            </div>

            {/* Filter Drawer Panel */}
            {showFilterPanel && (
              <div className="bg-[#003626] border border-[#007A3D]/60 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-200">
                  <span>Filter by Playing Role</span>
                  {roleFilter !== 'all' && (
                    <button
                      onClick={() => setRoleFilter('all')}
                      className="text-[#A8FF00] hover:underline text-[11px]"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { label: 'All Roles', value: 'all' },
                    { label: 'Top Order Batter', value: 'top_order_batter' },
                    { label: 'Middle Order Batter', value: 'middle_order_batter' },
                    { label: 'Wicketkeeper Batter', value: 'wicketkeeper_batter' },
                    { label: 'Batting All-rounder', value: 'batting_allrounder' },
                    { label: 'Bowling All-rounder', value: 'bowling_allrounder' },
                    { label: 'Pace Bowler', value: 'pace_bowler' },
                    { label: 'Spin Bowler', value: 'spin_bowler' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRoleFilter(r.value)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium text-left truncate cursor-pointer ${
                        roleFilter === r.value
                          ? 'bg-[#007A3D] border-[#A8FF00] text-[#A8FF00] font-bold'
                          : 'bg-[#002A1D] border-[#007A3D]/40 text-slate-300 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vertically Scrolling Player Cards List */}
            <div className="space-y-2.5">
              {filteredPlayers.length === 0 ? (
                <div className="bg-[#003626] rounded-2xl p-8 border border-[#007A3D]/40 text-center space-y-2">
                  <User className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">No players found matching your criteria.</p>
                  <p className="text-xs text-slate-400">
                    Try adjusting your search query or tab status filters.
                  </p>
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white text-[#17211D] rounded-[24px] p-3 border border-[#E3EAE7] shadow-sm hover:border-[#007A3D]/30 transition-all flex items-center justify-between gap-3 relative active:scale-[0.98] active:bg-slate-50"
                  >
                    {/* Left: Avatar & Info */}
                    <div
                      onClick={() => {
                        setSelectedPlayer(player);
                        setViewState('details');
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {/* Properly Cropped Circular Avatar */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#003626] border-2 border-[#007A3D] overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{player.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name & Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-display font-bold text-sm sm:text-base text-[#17211D] truncate leading-tight">
                            {player.fullName}
                          </h3>
                          {player.jerseyNumber && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300">
                              #{String(player.jerseyNumber).padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#64716B] flex items-center gap-2 mt-0.5 font-medium flex-wrap">
                          <span>{formatBattingStyle(player.battingStyle)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-[#007A3D]">
                            {player.teamName || 'Unassigned Team'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Badge & Action Menu */}
                    <div className="flex items-center gap-2 shrink-0">
                      {renderStatusBadge(player.verificationStatus)}

                      {/* Action Menu Dropdown Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPlayerId(openMenuPlayerId === player.id ? null : player.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {openMenuPlayerId === player.id && (
                          <div className="absolute right-0 top-8 z-40 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-xs text-[#17211D]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuPlayerId(null);
                                setSelectedPlayer(player);
                                setViewState('details');
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <User className="w-4 h-4 text-[#007A3D]" /> View Player
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuPlayerId(null);
                                handleOpenEditForm(player);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 text-blue-600" /> Edit Player
                            </button>

                            {player.verificationStatus === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuPlayerId(null);
                                  handleVerifyPlayer(player);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-[#007A3D] font-bold flex items-center gap-2 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Verify Player
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuPlayerId(null);
                                handleToggleBlockPlayer(player);
                              }}
                              className={`w-full text-left px-3.5 py-2 hover:bg-red-50 font-bold flex items-center gap-2 cursor-pointer ${
                                player.verificationStatus === 'blocked' ? 'text-emerald-700' : 'text-[#E53945]'
                              }`}
                            >
                              <Ban className="w-4 h-4" />
                              {player.verificationStatus === 'blocked' ? 'Unblock Player' : 'Block Player'}
                            </button>

                            <button
                              onClick={(e) => {
                                console.log('Delete button clicked for player:', player.id);
                                e.stopPropagation();
                                setOpenMenuPlayerId(null);
                                handlePlayerDelete(player);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-[#E53945] font-bold flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Player
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SCREEN THREE — PLAYER DETAILS                      */}
        {/* ================================================== */}
        {viewState === 'details' && selectedPlayer && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setViewState('list')}
                className="p-2 rounded-xl bg-[#003626] border border-[#007A3D]/50 text-slate-200 hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Players</span>
              </button>

              <h2 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight">
                Player Details
              </h2>

              <button
                onClick={() => handleOpenEditForm(selectedPlayer)}
                className="px-3 py-1.5 bg-[#007A3D] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#A8FF00]" /> Edit
              </button>
            </div>

            {/* Player Profile Header Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#003626] border-4 border-[#007A3D] overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  {selectedPlayer.photoUrl ? (
                    <img
                      src={selectedPlayer.photoUrl}
                      alt={selectedPlayer.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedPlayer.fullName.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h3 className="font-display font-black text-xl sm:text-2xl text-[#17211D]">
                      {selectedPlayer.fullName}
                    </h3>
                    {renderStatusBadge(selectedPlayer.verificationStatus)}
                  </div>

                  <div className="text-xs text-[#64716B] font-semibold space-y-0.5">
                    <div>
                      {formatBattingStyle(selectedPlayer.battingStyle)} ·{' '}
                      {formatBowlingStyle(selectedPlayer.bowlingStyle)}
                    </div>
                    <div className="text-[#007A3D] font-bold">
                      Team: {selectedPlayer.teamName || 'Unassigned Team'} · Joined:{' '}
                      {new Date(selectedPlayer.registrationDate || Date.now()).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Career Summary 3 Compact Cards */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                <div className="bg-[#002A1D] text-white p-3 rounded-2xl text-center space-y-0.5 border border-[#007A3D]/40">
                  <span className="font-display font-black text-xl sm:text-2xl text-[#A8FF00] block">
                    {selectedPlayer.career?.matches ?? 24}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Matches
                  </span>
                </div>

                <div className="bg-[#002A1D] text-white p-3 rounded-2xl text-center space-y-0.5 border border-[#007A3D]/40">
                  <span className="font-display font-black text-xl sm:text-2xl text-[#A8FF00] block">
                    {selectedPlayer.career?.runs ?? 482}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Runs
                  </span>
                </div>

                <div className="bg-[#002A1D] text-white p-3 rounded-2xl text-center space-y-0.5 border border-[#007A3D]/40">
                  <span className="font-display font-black text-xl sm:text-2xl text-[#A8FF00] block">
                    {selectedPlayer.career?.wickets ?? 18}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Wickets
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="bg-[#003626] p-1 rounded-2xl border border-[#007A3D]/40 grid grid-cols-4 gap-1 text-xs font-semibold">
              {(['overview', 'batting', 'bowling', 'matches'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailsTab(tab)}
                  className={`py-2 px-1 rounded-xl text-center capitalize transition-all cursor-pointer ${
                    detailsTab === tab
                      ? 'bg-[#007A3D] text-[#A8FF00] font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Personal Information Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-display font-bold text-base text-[#17211D]">
                  Personal Information
                </h4>
                <button
                  onClick={() => handleOpenEditForm(selectedPlayer)}
                  className="text-[#007A3D] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64716B] block">Full Name:</span>
                  <strong className="text-[#17211D] text-sm block">{selectedPlayer.fullName}</strong>
                </div>

                <div>
                  <span className="text-[#64716B] block">Email:</span>
                  <strong className="text-[#17211D] text-sm block">{selectedPlayer.email || 'amit@gmail.com'}</strong>
                </div>

                <div>
                  <span className="text-[#64716B] block">Phone:</span>
                  <strong className="text-[#17211D] text-sm block">
                    {selectedPlayer.mobileNumber || '+91 98765 43210'}
                  </strong>
                </div>

                <div>
                  <span className="text-[#64716B] block">Date of Birth:</span>
                  <strong className="text-[#17211D] text-sm block">
                    {selectedPlayer.dob
                      ? new Date(selectedPlayer.dob).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '14 Mar 1998'}
                  </strong>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#64716B] block">Location:</span>
                  <strong className="text-[#17211D] text-sm block">
                    {selectedPlayer.location || 'Indore, Madhya Pradesh'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Team Information Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-display font-bold text-base text-[#17211D]">
                  Team Information
                </h4>
                <button
                  onClick={() => handleOpenEditForm(selectedPlayer)}
                  className="text-[#007A3D] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#003626] text-[#A8FF00] font-black text-xs flex items-center justify-center border border-[#007A3D]">
                  {selectedPlayer.teamName?.charAt(0) || 'T'}
                </div>
                <div className="text-xs">
                  <span className="text-[#64716B] block">Team Assignment</span>
                  <strong className="text-[#17211D] text-sm block">
                    {selectedPlayer.teamName || 'Metro Challengers'}
                  </strong>
                </div>
                <div className="ml-auto text-right text-xs">
                  <span className="text-[#64716B] block">Jersey Number</span>
                  <strong className="text-[#007A3D] font-mono text-base block font-bold">
                    #{String(selectedPlayer.jerseyNumber || 7).padStart(2, '0')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Playing Role Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-display font-bold text-base text-[#17211D]">
                  Playing Role
                </h4>
                <button
                  onClick={() => handleOpenEditForm(selectedPlayer)}
                  className="text-[#007A3D] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64716B] block">Primary Role:</span>
                  <strong className="text-[#17211D] text-sm block">
                    {formatRoleName(selectedPlayer.playingRole)}
                  </strong>
                </div>

                <div>
                  <span className="text-[#64716B] block">Secondary Role:</span>
                  <strong className="text-[#17211D] text-sm block">
                    {formatRoleName(selectedPlayer.secondaryRole)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bottom Actions Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleToggleBlockPlayer(selectedPlayer)}
                className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer touch-press transition-all flex items-center justify-center gap-1.5 ${
                  selectedPlayer.verificationStatus === 'blocked'
                    ? 'bg-emerald-900 border-[#A8FF00] text-[#A8FF00]'
                    : 'bg-[#FFE0E0] border-red-300 text-[#E53945] hover:bg-red-200'
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>
                  {selectedPlayer.verificationStatus === 'blocked' ? 'Unblock Player' : 'Block Player'}
                </span>
              </button>

              <button
                onClick={() => handleOpenEditForm(selectedPlayer)}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-xs border border-[#A8FF00]/40 cursor-pointer touch-press transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Edit3 className="w-4 h-4 text-[#A8FF00]" />
                <span>Edit Player</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SCREEN FOUR — ADD PLAYER / EDIT PLAYER FORM        */}
        {/* ================================================== */}
        {viewState === 'form' && (
          <form onSubmit={handleSavePlayerSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewState(selectedPlayer ? 'details' : 'list')}
                className="p-2 rounded-xl bg-[#003626] border border-[#007A3D]/50 text-slate-200 hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <h2 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight">
                {formMode === 'add' ? 'Add Player' : 'Edit Player'}
              </h2>

              <div className="w-16" />
            </div>

            {/* Basic Information Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-[#17211D] border-b border-slate-100 pb-2">
                Basic Information
              </h3>

              {/* Photo Selector with Camera Badge */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#003626] border-2 border-[#007A3D] overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>{formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'P'}</span>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#17211D] block">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                  <p className="text-[10px] text-[#64716B]">Recommended square format PNG or JPG</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-[#17211D] block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amit Patel"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none ${
                    formErrors.fullName ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                  }`}
                />
                {formErrors.fullName && (
                  <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.fullName}</span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-[#17211D] block mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="amit@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none ${
                    formErrors.email ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                  }`}
                />
                {formErrors.email && (
                  <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.email}</span>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-[#17211D] block mb-1">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.phoneCode}
                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-[#17211D] font-mono font-bold"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`flex-1 bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-mono text-[#17211D] focus:outline-none ${
                      formErrors.phoneNumber ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                    }`}
                  />
                </div>
                {formErrors.phoneNumber && (
                  <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.phoneNumber}</span>
                )}
              </div>

              {/* DOB & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none ${
                      formErrors.dob ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                    }`}
                  />
                  {formErrors.dob && (
                    <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.dob}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Indore, Madhya Pradesh"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                </div>
              </div>
            </div>

            {/* Playing Information Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-[#17211D] border-b border-slate-100 pb-2">
                Playing Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Batting Style *
                  </label>
                  <select
                    value={formData.battingStyle}
                    onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value as BattingStyle })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="right_hand_bat">Right Hand Bat</option>
                    <option value="left_hand_bat">Left Hand Bat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Bowling Style *
                  </label>
                  <select
                    value={formData.bowlingStyle}
                    onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value as BowlingStyle })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="right_arm_spin">Right Arm Off Spin</option>
                    <option value="right_arm_medium">Right Arm Medium</option>
                    <option value="right_arm_fast">Right Arm Fast</option>
                    <option value="left_arm_spin">Left Arm Spin</option>
                    <option value="left_arm_fast">Left Arm Fast</option>
                    <option value="none">None (Pure Batter)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Primary Role *
                  </label>
                  <select
                    value={formData.primaryRole}
                    onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value as PlayingRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="top_order_batter">Top Order Batter</option>
                    <option value="middle_order_batter">Middle Order Batter</option>
                    <option value="wicketkeeper_batter">Wicketkeeper Batter</option>
                    <option value="batting_allrounder">Batting All-rounder</option>
                    <option value="bowling_allrounder">Bowling All-rounder</option>
                    <option value="pace_bowler">Pace Bowler</option>
                    <option value="spin_bowler">Spin Bowler</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Secondary Role
                  </label>
                  <select
                    value={formData.secondaryRole}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        secondaryRole: e.target.value as PlayingRole | 'none',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="none">None</option>
                    <option value="top_order_batter">Top Order Batter</option>
                    <option value="middle_order_batter">Middle Order Batter</option>
                    <option value="wicketkeeper_batter">Wicketkeeper Batter</option>
                    <option value="batting_allrounder">Batting All-rounder</option>
                    <option value="bowling_allrounder">Bowling All-rounder</option>
                    <option value="pace_bowler">Pace Bowler</option>
                    <option value="spin_bowler">Spin Bowler</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Team & Status Card */}
            <div className="bg-white text-[#17211D] rounded-3xl p-4 sm:p-5 border border-[#E3EAE7] shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-[#17211D] border-b border-slate-100 pb-2">
                Team & Status
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Team *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter team name"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    list="registered-teams-list"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs text-[#17211D] focus:outline-none ${
                      formErrors.teamName ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                    }`}
                  />
                  <datalist id="registered-teams-list">
                    {Array.from(new Set(allPlayersList.map((p) => p.teamName).filter(Boolean))).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  {formErrors.teamName && (
                    <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.teamName}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    placeholder="07"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#17211D] focus:outline-none ${
                      formErrors.jerseyNumber ? 'border-red-500' : 'border-slate-200 focus:border-[#007A3D]'
                    }`}
                  />
                  {formErrors.jerseyNumber && (
                    <span className="text-[11px] text-red-500 mt-0.5 block">{formErrors.jerseyNumber}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211D] block mb-1">
                    Verification Status *
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verificationStatus: e.target.value as 'verified' | 'pending' | 'blocked',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Full Width Green Save Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[50px] bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-sm py-3.5 rounded-2xl shadow-md border border-[#A8FF00]/40 flex items-center justify-center gap-2 cursor-pointer touch-press transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Saving Record...</span>
              ) : (
                <span>{formMode === 'add' ? 'Save Player' : 'Save Changes'}</span>
              )}
            </button>
          </form>
        )}

      {/* Delete Single Player Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-red-100 text-[#17211D]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FF263D] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#17211D]">Delete Player?</h3>
              <p className="text-xs text-[#68746F]">
                Are you sure you want to permanently delete player &quot;{playerToDelete.fullName}&quot;? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#17211D] font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePlayerDelete}
                className="py-2.5 px-4 bg-[#FF263D] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Players Modal */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-red-100 text-[#17211D]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FF263D] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#17211D]">Delete All Players?</h3>
              <p className="text-xs text-[#68746F]">
                Are you sure you want to permanently delete ALL {allPlayersList.length} players? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#17211D] font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAllPlayers}
                className="py-2.5 px-4 bg-[#FF263D] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Player Modal */}
      {confirmBlockPlayer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-amber-100 text-[#17211D]">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#17211D]">
                {confirmBlockPlayer.actionName === 'block' ? 'Block Player?' : 'Unblock Player?'}
              </h3>
              <p className="text-xs text-[#68746F]">
                Are you sure you want to {confirmBlockPlayer.actionName} player &quot;{confirmBlockPlayer.player.fullName}&quot;?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmBlockPlayer(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#17211D] font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeToggleBlock}
                className="py-2.5 px-4 bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};
