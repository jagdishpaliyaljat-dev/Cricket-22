import React, { useState } from 'react';
import { Logo } from './Logo';
import { CricketMatch, Player, CustomCricketRules } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { createMatch, updateMatch, deleteMatch } from '../services/matchService';
import { updatePlayer } from '../services/playerService';
import {
  Menu,
  X,
  Bell,
  Home,
  Calendar,
  Users,
  MapPin,
  Activity,
  Megaphone,
  BarChart2,
  User,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Clock,
  ChevronDown,
  ArrowLeft,
  Trash2,
  Edit3,
  Play,
  ShieldCheck,
  Shield,
  AlertTriangle,
  Check,
} from 'lucide-react';

import { LiveScoringPanel } from './LiveScoringPanel';
import { AdminPlayerManagement } from './AdminPlayerManagement';
import { TeamManagementView } from './TeamManagementView';
import { AdminUserManagement } from './AdminUserManagement';
import { AuditLogView } from './AuditLogView';
import { SuperAdminPanel } from './SuperAdminPanel';
import { logAdminAction } from '../utils/auditLogger';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { purgeAllDemoData, purgeAllDataCompletely } from '../utils/seedData';

interface AdminPanelProps {
  matches: CricketMatch[];
  players: Player[];
  onOpenTeamBuilder: (match: CricketMatch) => void;
  onOpenScoringPad: (match: CricketMatch) => void;
  onOpenAvailability: (match: CricketMatch) => void;
  onRefreshData: () => void;
  onNavigateTab?: (tab: string) => void;
  initialEditingMatch?: CricketMatch | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  matches,
  players,
  onOpenTeamBuilder,
  onOpenScoringPad,
  onOpenAvailability,
  onRefreshData,
  onNavigateTab,
  initialEditingMatch = null,
}) => {
  const { currentUser, signOut, isAdmin, isScorer, isSuperAdmin } = useAuth();
  
  // Navigation & Screen State
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'manage_matches' | 'create_match' | 'edit_match' | 'live_scoring_panel' | 'player_management' | 'manage_users' | 'logo_upload' | 'manage_teams' | 'audit_log' | 'super_admin'>(() => {
    return initialEditingMatch ? 'edit_match' : 'dashboard';
  });
  const [selectedScoringMatch, setSelectedScoringMatch] = useState<CricketMatch | null>(null);
  const [editingMatch, setEditingMatch] = useState<CricketMatch | null>(initialEditingMatch);
  const [matchToDelete, setMatchToDelete] = useState<CricketMatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarNavTab, setSidebarNavTab] = useState('Dashboard');

  // Manage Matches state
  const [matchFilterTab, setMatchFilterTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuMatchId, setActiveMenuMatchId] = useState<string | null>(null);

  // Create Match form state
  const [matchName, setMatchName] = useState('');
  const [matchType, setMatchType] = useState('Tournament Match');
  const [format, setFormat] = useState('5v5');
  const [overs, setOvers] = useState('15 Overs');
  const [isCustomOvers, setIsCustomOvers] = useState(false);
  const [customOversValue, setCustomOversValue] = useState('15');
  const [matchDate, setMatchDate] = useState(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const [matchTime, setMatchTime] = useState('04:00 PM');
  const [venue, setVenue] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchStatus, setMatchStatus] = useState('Upcoming');
  const [liveScoringEnabled, setLiveScoringEnabled] = useState(true);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedMvpId, setSelectedMvpId] = useState<string | null>(null);

  // Player Assignments for Create Match
  const [selectedTeamAPlayers, setSelectedTeamAPlayers] = useState<string[]>([]);
  const [selectedTeamBPlayers, setSelectedTeamBPlayers] = useState<string[]>([]);
  const [selectedCommonPlayers, setSelectedCommonPlayers] = useState<string[]>([]);

  const handleAssignPlayer = (playerId: string, target: 'teamA' | 'teamB' | 'common' | 'none') => {
    setSelectedTeamAPlayers((prev) => prev.filter((id) => id !== playerId));
    setSelectedTeamBPlayers((prev) => prev.filter((id) => id !== playerId));
    setSelectedCommonPlayers((prev) => prev.filter((id) => id !== playerId));

    if (target === 'teamA') {
      setSelectedTeamAPlayers((prev) => [...prev, playerId]);
    } else if (target === 'teamB') {
      setSelectedTeamBPlayers((prev) => [...prev, playerId]);
    } else if (target === 'common') {
      setSelectedTeamAPlayers((prev) => [...prev, playerId]);
      setSelectedTeamBPlayers((prev) => [...prev, playerId]);
      setSelectedCommonPlayers((prev) => [...prev, playerId]);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sidebar navigation items matching reference
  const sidebarItems = [
    { label: 'Dashboard', icon: Home, screen: 'dashboard', roles: ['admin', 'scorer'] },
    { label: 'Matches', icon: Calendar, screen: 'manage_matches', roles: ['admin', 'scorer'] },
    { label: 'Live Scoring', icon: Activity, screen: 'live_scoring_panel', roles: ['admin', 'scorer'] },
    { label: 'Players', icon: Users, screen: 'player_management', roles: ['admin'] },
    { label: 'Users', icon: User, screen: 'manage_users', roles: ['admin'] },
    { label: 'App Content', icon: FileText, screen: 'logo_upload', roles: ['admin'] },
    { label: 'Teams', icon: Users, screen: 'manage_teams', roles: ['admin'] },
    { label: 'Venues', icon: MapPin, screen: null, roles: ['admin'] },
    { label: 'Announcements', icon: Megaphone, screen: null, roles: ['admin'] },
    { label: 'Reports', icon: BarChart2, screen: null, roles: ['admin'] },
    { label: 'Settings', icon: Settings, screen: null, roles: ['admin'] },
    { label: 'Audit Log', icon: ShieldCheck, screen: 'audit_log', roles: ['admin'] },

    { label: 'Help & Support', icon: HelpCircle, screen: null, roles: ['admin', 'scorer'] },
  ];

  const visibleSidebarItems = sidebarItems.filter(item => {
    if (isSuperAdmin && item.roles.includes('super-admin')) return true;
    if (isAdmin) return true;
    if (isScorer && item.roles.includes('scorer')) return true;
    return false;
  });

  // Derived filtered matches
  const filteredMatches = matches.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.teamA.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.teamB.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (matchFilterTab === 'live') return m.status === 'live';
    if (matchFilterTab === 'upcoming') return m.status === 'scheduled';
    if (matchFilterTab === 'completed') return m.status === 'completed';
    return true;
  });

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!matchName.trim()) {
      setFormError('Match Name is required.');
      return;
    }
    if (!teamA || !teamB) {
      setFormError('Both Team A and Team B must be selected.');
      return;
    }
    if (teamA === teamB) {
      setFormError('Team A and Team B cannot be the same team.');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchId = `match_${Date.now()}`;
      const numOvers = isCustomOvers ? parseInt(customOversValue) : (parseInt(overs) || 15);
      const numPlayers = parseInt(format.split('v')[0]) || 5;

      const rules: CustomCricketRules = {
        legalBallsPerOver: 6,
        maxWickets: numPlayers - 1,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitOnNoBall: true,
        byesAllowed: true,
        legByesAllowed: true,
        superOverOnTie: true,
      };

      const statusMap: Record<string, 'scheduled' | 'live' | 'completed'> = {
        Upcoming: 'scheduled',
        Live: 'live',
        Completed: 'completed',
      };

      const finalTeamAPlayerIds = selectedTeamAPlayers;
      const finalTeamBPlayerIds = selectedTeamBPlayers;

      const newMatch: CricketMatch = {
        id: matchId,
        title: matchName.trim(),
        dateTime: new Date().toISOString(),
        venue: venue.trim(),
        playersPerTeam: numPlayers,
        oversPerInnings: numOvers,
        rules,
        teamA: {
          id: `team_${teamA.toLowerCase().replace(/\s+/g, '_')}`,
          name: teamA,
          playerIds: finalTeamAPlayerIds,
        },
        teamB: {
          id: `team_${teamB.toLowerCase().replace(/\s+/g, '_')}`,
          name: teamB,
          playerIds: finalTeamBPlayerIds,
        },
        commonPlayerIds: selectedCommonPlayers,
        status: statusMap[matchStatus] || 'scheduled',
        currentInnings: 1,
      };

      await createMatch(newMatch);
      await logAdminAction(currentUser, 'create_match', newMatch.id, 'match', { title: newMatch.title });
      onRefreshData();
      showToast('Match created with custom player roster & common players!');
      setActiveScreen('manage_matches');
      // Reset form
      setMatchName('');
      setTeamA('');
      setTeamB('');
      setSelectedTeamAPlayers([]);
      setSelectedTeamBPlayers([]);
      setSelectedCommonPlayers([]);
      setOvers('15 Overs');
      setIsCustomOvers(false);
      setCustomOversValue('15');
    } catch (err) {
      console.error('Failed to create match:', err);
      setFormError('Failed to save match to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `logos/main-logo-${Date.now()}`);
      await uploadBytes(storageRef, logoFile);
      const downloadURL = await getDownloadURL(storageRef);

      const settingsRef = doc(db, 'siteSettings', 'main-settings');
      await setDoc(settingsRef, {
        logoUrl: downloadURL
      }, { merge: true });
      showToast('Logo updated successfully!');
      setActiveScreen('dashboard');
    } catch (error) {
      console.error('Error uploading logo:', error);
      showToast('Failed to upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEditMatch = (match: CricketMatch) => {
    setEditingMatch(match);
    setMatchName(match.title);
    setMatchType(match.matchType || 'Tournament Match');
    setFormat(`${match.playersPerTeam}v${match.playersPerTeam}`);
    
    const standardOvers = ['3 Overs', '5 Overs', '8 Overs', '10 Overs', '12 Overs', '15 Overs', '20 Overs', '25 Overs', '50 Overs'];
    const currentOversText = `${match.oversPerInnings} Overs`;
    
    if (standardOvers.includes(currentOversText)) {
      setOvers(currentOversText);
      setIsCustomOvers(false);
    } else {
      setOvers('Custom');
      setIsCustomOvers(true);
      setCustomOversValue(match.oversPerInnings.toString());
    }

    try {
      const d = new Date(match.dateTime);
      if (!isNaN(d.getTime())) {
        setMatchDate(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
        setMatchTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      }
    } catch {}

    setVenue(match.venue || '');
    setTeamA(match.teamA.name);
    setTeamB(match.teamB.name);
    setSelectedTeamAPlayers(match.teamA.playerIds || []);
    setSelectedTeamBPlayers(match.teamB.playerIds || []);
    setSelectedCommonPlayers(match.commonPlayerIds || match.rules?.commonPlayerIds || []);
    setMatchStatus(match.status === 'live' ? 'Live' : match.status === 'completed' ? 'Completed' : 'Upcoming');
    setSelectedMvpId(match.result?.playerOfTheMatchId || null);
    setDescription(match.description || '');
    setFormError('');
    setActiveMenuMatchId(null);
    setActiveScreen('edit_match');
  };

  React.useEffect(() => {
    if (initialEditingMatch) {
      handleStartEditMatch(initialEditingMatch);
    }
  }, [initialEditingMatch]);

  const handleUpdateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setFormError('');

    if (!matchName.trim()) {
      setFormError('Match Name is required.');
      return;
    }
    if (!teamA || !teamB) {
      setFormError('Both Team A and Team B are required.');
      return;
    }
    if (teamA === teamB) {
      setFormError('Team A and Team B cannot be the same team.');
      return;
    }

    setIsSubmitting(true);
    try {
      const numOvers = isCustomOvers ? parseInt(customOversValue) : (parseInt(overs) || editingMatch.oversPerInnings || 15);
      const numPlayers = parseInt(format.split('v')[0]) || editingMatch.playersPerTeam || 5;

      const statusMap: Record<string, 'scheduled' | 'live' | 'completed'> = {
        Upcoming: 'scheduled',
        Live: 'live',
        Completed: 'completed',
      };

      const rules: CustomCricketRules = {
        ...(editingMatch.rules || {}),
        legalBallsPerOver: editingMatch.rules?.legalBallsPerOver || 6,
        maxWickets: numPlayers - 1,
        wideRuns: editingMatch.rules?.wideRuns ?? 1,
        noBallRuns: editingMatch.rules?.noBallRuns ?? 1,
        freeHitOnNoBall: editingMatch.rules?.freeHitOnNoBall ?? true,
        byesAllowed: editingMatch.rules?.byesAllowed ?? true,
        legByesAllowed: editingMatch.rules?.legByesAllowed ?? true,
        superOverOnTie: editingMatch.rules?.superOverOnTie ?? true,
        commonPlayerIds: selectedCommonPlayers,
      };

      let updatedDateTime = editingMatch.dateTime;
      try {
        const parsed = new Date(`${matchDate} ${matchTime}`);
        if (!isNaN(parsed.getTime())) {
          updatedDateTime = parsed.toISOString();
        } else {
          const dOnly = new Date(matchDate);
          if (!isNaN(dOnly.getTime())) {
            updatedDateTime = dOnly.toISOString();
          }
        }
      } catch {}

      const updates: Partial<CricketMatch> = {
        title: matchName.trim(),
        dateTime: updatedDateTime,
        venue: venue.trim(),
        playersPerTeam: numPlayers,
        oversPerInnings: numOvers,
        rules,
        matchType,
        description: description.trim() || undefined,
        status: statusMap[matchStatus] || editingMatch.status,
        result: {
          ...editingMatch.result,
          playerOfTheMatchId: selectedMvpId || editingMatch.result?.playerOfTheMatchId || null,
          winnerTeamId: editingMatch.result?.winnerTeamId || null,
          winType: editingMatch.result?.winType || 'abandoned',
          summaryText: editingMatch.result?.summaryText || 'Match concluded',
        } as any,
        teamA: {
          ...editingMatch.teamA,
          name: teamA.trim(),
          playerIds: selectedTeamAPlayers,
        },
        teamB: {
          ...editingMatch.teamB,
          name: teamB.trim(),
          playerIds: selectedTeamBPlayers,
        },
        commonPlayerIds: selectedCommonPlayers,
      };

      await updateMatch(editingMatch.id, updates);
      await logAdminAction(currentUser, 'update_match', editingMatch.id, 'match', { title: updates.title });
      onRefreshData();
      showToast('Match updated successfully! (मैच सफलतापूर्वक अपडेट हो गया)');
      setActiveScreen('manage_matches');
      setEditingMatch(null);
    } catch (err) {
      console.error('Failed to update match:', err);
      setFormError('Failed to update match in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    console.log('[AdminPanel] Initiating match deletion for ID:', matchToDelete.id);
    setIsDeleting(true);
    try {
      await deleteMatch(matchToDelete.id);
      await logAdminAction(currentUser, 'delete_match', matchToDelete.id, 'match', { title: matchToDelete.title });
      console.log('[AdminPanel] Match successfully deleted from DB:', matchToDelete.id);
      onRefreshData();
      showToast(`Match "${matchToDelete.title}" deleted.`);
      setMatchToDelete(null);
    } catch (err) {
      console.error('[AdminPanel] Delete match error details:', err);
      showToast(`Failed to delete match: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-[#F2F6FC] text-[#172033] min-h-screen font-sans antialiased relative pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white text-[#172033] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-[#DFE7F2] flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-[#1554B8] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. ADMIN SIDEBAR DRAWER ================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-[300px] bg-[#1554B8] border-r border-white/20 shadow-2xl flex flex-col text-white animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/20 bg-[#1554B8]">
              <div className="flex items-center gap-3">
                <Logo variant="full" className="h-8" />
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer active:scale-90"
              >
                <X className="w-5.5 h-5.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Admin Profile */}
            <div className="mx-4 mt-5 p-3.5 bg-white/10 border border-white/20 rounded-[24px] flex items-center gap-3.5 shadow-inner">
              <div className="w-12 h-12 rounded-full border-2 border-white p-0.5 shadow-sm">
                <img
                  src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt="Admin"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-white truncate tracking-tight">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <p className="text-[10px] text-white font-black uppercase tracking-widest">Active Admin</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 no-scrollbar">
              {visibleSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = sidebarNavTab === item.label;

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarNavTab(item.label);
                      setIsSidebarOpen(false);
                      if (item.label === 'Dashboard') {
                        setActiveScreen('dashboard');
                      } else if (item.label === 'Matches') {
                        setActiveScreen('manage_matches');
                      } else if (item.label === 'Players') {
                        setActiveScreen('player_management');
                      } else if (item.label === 'Users') {
                        setActiveScreen('manage_users');
                      } else if (item.label === 'Live Scoring') {
                        setSelectedScoringMatch(null);
                        setActiveScreen('live_scoring_panel');
                      } else if (item.label === 'App Content') {
                        setActiveScreen('logo_upload');
                      } else if (item.label === 'Teams') {
                        setActiveScreen('manage_teams');
                      } else if (item.label === 'Audit Log') {
                        setActiveScreen('audit_log');

                      } else {
                        showToast(`${item.label} module coming soon.`);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1554B8] shadow-xs'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#1554B8]' : 'text-white/70'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className="p-3 border-t border-white/20 bg-[#0B3F91]">
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    try {
                      console.log('AdminPanel: Initiating sidebar logout...');
                      setIsSidebarOpen(false);
                      await signOut();
                      console.log('AdminPanel: Sidebar logout successful.');
                    } catch (err) {
                      console.error('AdminPanel: Sidebar logout failed:', err);
                      alert('Logout failed. Please try again.');
                    }
                  }
                }}
                className="w-full bg-[#1554B8] hover:bg-[#0B3F91] border border-white/20 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SHARED ADMIN HEADER ================= */}
      {activeScreen !== 'live_scoring_panel' && (
        <header className="sticky top-0 z-40 bg-[#1554B8] text-white border-b border-white/20 shadow-sm backdrop-blur-md bg-opacity-95">
        <div className="max-w-md mx-auto px-4 h-[60px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1.5 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>
            <div className="flex items-center gap-2.5">
              <Logo className="w-8 h-8" variant="icon" />
              <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider -ml-2.5 mt-4">Admin Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="relative p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors active:scale-90">
              <Bell className="w-5.5 h-5.5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF263D] rounded-full border-2 border-[#1554B8]" />
            </button>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to logout?')) {
                  try {
                    console.log('AdminPanel: Initiating logout...');
                    await signOut();
                    console.log('AdminPanel: Logout successful.');
                  } catch (err) {
                    console.error('AdminPanel: Logout failed:', err);
                    alert('Logout failed. Please try again.');
                  }
                }
              }}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors active:scale-90"
              title="Logout"
            >
              <LogOut className="w-5.5 h-5.5" />
            </button>
            <div className="w-9 h-9 rounded-full border-2 border-white p-0.5 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              <img
                src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'}
                alt="Admin"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>
      )}

      {/* ================= 2. ADMIN DASHBOARD SCREEN ================= */}
      {activeScreen === 'dashboard' && (
        <main className="max-w-md mx-auto p-4 space-y-4">
          {/* Top Title & Date Selector */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="font-display font-black text-2xl text-[#17211D] tracking-tight">Dashboard</h1>
              <p className="text-[11px] text-[#68746F] font-bold uppercase tracking-widest mt-0.5">Overview</p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#E3EAE7] pl-3 pr-2.5 py-2 rounded-2xl text-[11px] font-black text-[#17211D] shadow-sm cursor-pointer active:scale-95 transition-all">
              <Calendar className="w-3.5 h-3.5 text-[#007A3D]" />
              <span>{matchDate}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#68746F]" />
            </div>
          </div>

          {/* 4 Statistics Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Card 1: Total Matches (Blue) */}
            <div
              onClick={() => setActiveScreen('manage_matches')}
              className="bg-white border border-[#E3EAE7] rounded-3xl p-3.5 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-[#168BFF] transition-all group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#17211D] font-mono leading-none">{matches.length}</div>
                <div className="text-[10px] font-black text-[#68746F] uppercase tracking-widest mt-1">Matches</div>
              </div>
            </div>

            {/* Card 2: Total Players (Green) */}
            {isAdmin && (
              <div
                onClick={() => setActiveScreen('player_management')}
                className="bg-white border border-[#E3EAE7] rounded-3xl p-3.5 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-[#007A3D] transition-all group active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007A3D] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-[#17211D] font-mono leading-none">{players.length}</div>
                  <div className="text-[10px] font-black text-[#68746F] uppercase tracking-widest mt-1">Players</div>
                </div>
              </div>
            )}

            {/* Card 3: Total Teams (Orange) */}
            <div className="bg-white border border-[#E3EAE7] rounded-3xl p-3.5 shadow-sm flex flex-col gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#17211D] font-mono leading-none">
                  {new Set(matches.flatMap((m) => [m.teamA.name, m.teamB.name]).filter(Boolean)).size}
                </div>
                <div className="text-[10px] font-black text-[#68746F] uppercase tracking-widest mt-1">Teams</div>
              </div>
            </div>

            {/* Card 4: Venues (Purple) */}
            <div className="bg-white border border-[#E3EAE7] rounded-3xl p-3.5 shadow-sm flex flex-col gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#17211D] font-mono leading-none">
                  {new Set(matches.map((m) => m.venue).filter(Boolean)).size}
                </div>
                <div className="text-[10px] font-black text-[#68746F] uppercase tracking-widest mt-1">Venues</div>
              </div>
            </div>
          </div>



          {/* Today's Matches Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#007A3D]" />
                <h2 className="font-black text-sm text-[#17211D] uppercase tracking-widest">Today's Matches</h2>
              </div>
              <button
                onClick={() => setActiveScreen('manage_matches')}
                className="text-[11px] font-black text-[#007A3D] bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
              >
                <span>View All</span>
                <ChevronDown className="w-3 h-3 -rotate-90" />
              </button>
            </div>

            {matches.length === 0 ? (
              <div className="bg-white border border-[#E3EAE7] rounded-2xl p-6 text-center text-xs text-[#68746F] space-y-2">
                <p>No matches created yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveScreen('create_match')}
                  className="mt-1 px-3 py-1.5 bg-[#007A3D] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Create Match Fixture
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
              {matches.slice(0, 3).map((m) => {
                const isLive = m.status === 'live';
                const isScheduled = m.status === 'scheduled';
                const isCompleted = m.status === 'completed';

                return (
                  <div key={m.id} className="bg-white border border-[#E3EAE7] rounded-3xl p-4 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <div className="bg-red-50 border border-red-100 text-[#FF263D] text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF263D] animate-ping" />
                            Live
                          </div>
                        )}
                        {isScheduled && (
                          <div className="bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Upcoming
                          </div>
                        )}
                        {isCompleted && (
                          <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Finished
                          </div>
                        )}
                        <span className="text-[10px] text-[#68746F] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
                          {m.playersPerTeam}v{m.playersPerTeam} • {m.oversPerInnings}O
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setActiveMenuMatchId(activeMenuMatchId === m.id ? null : m.id)}
                        className="p-1.5 text-[#68746F] hover:text-[#17211D] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* Team Display */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-[#007A3D] shadow-inner">
                          <span className="font-black text-xs">{m.teamA.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-black text-[#17211D] text-center truncate w-full">{m.teamA.name}</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-[#68746F] uppercase tracking-widest italic opacity-40">VS</span>
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                          <span className="font-black text-xs">{m.teamB.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-black text-[#17211D] text-center truncate w-full">{m.teamB.name}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F5F7F8] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-[#007A3D] shrink-0" />
                        <span className="text-[10px] font-black text-[#17211D] truncate tracking-tight">{m.venue || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEditMatch(m); }}
                          className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-[#007A3D] rounded-xl border border-emerald-100 transition-all active:scale-90 cursor-pointer shadow-xs"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMatchToDelete(m); }}
                          className="w-8 h-8 flex items-center justify-center bg-red-50 text-[#FF263D] rounded-xl border border-red-100 transition-all active:scale-90 cursor-pointer shadow-xs"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-2 px-0.5">
              <ShieldCheck className="w-4 h-4 text-[#007A3D]" />
              <h2 className="font-black text-sm text-[#17211D] uppercase tracking-widest">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={() => setActiveScreen('create_match')}
                className="bg-white border border-[#E3EAE7] p-3.5 rounded-[24px] flex flex-col gap-3 shadow-sm hover:border-[#007A3D] transition-all cursor-pointer active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#007A3D] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="font-black text-[11px] text-[#17211D] uppercase tracking-wider">Create Match</div>
                  <div className="text-[9px] font-bold text-[#68746F] mt-0.5 opacity-70">Schedule fixture</div>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveScreen('player_management')}
                  className="bg-white border border-[#E3EAE7] p-3.5 rounded-[24px] flex flex-col gap-3 shadow-sm hover:border-[#168BFF] transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-[11px] text-[#17211D] uppercase tracking-wider">Add Player</div>
                    <div className="text-[9px] font-bold text-[#68746F] mt-0.5 opacity-70">Register member</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => setActiveScreen('manage_matches')}
                className="bg-white border border-[#E3EAE7] p-3.5 rounded-[24px] flex flex-col gap-3 shadow-sm hover:border-orange-400 transition-all cursor-pointer active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-[11px] text-[#17211D] uppercase tracking-wider">Fixtures</div>
                  <div className="text-[9px] font-bold text-[#68746F] mt-0.5 opacity-70">Manage schedule</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedScoringMatch(null); setActiveScreen('live_scoring_panel'); }}
                className="bg-white border border-[#E3EAE7] p-3.5 rounded-[24px] flex flex-col gap-3 shadow-sm hover:border-purple-400 transition-all cursor-pointer active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-[11px] text-[#17211D] uppercase tracking-wider">Live Scoring</div>
                  <div className="text-[9px] font-bold text-[#68746F] mt-0.5 opacity-70">Ball-by-ball</div>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveScreen('manage_users')}
                  className="col-span-2 bg-white border border-[#E3EAE7] p-3.5 rounded-[24px] flex items-center gap-4 shadow-sm hover:border-slate-500 transition-all cursor-pointer active:scale-[0.98] group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-[11px] text-[#17211D] uppercase tracking-wider">Registered Users</div>
                    <div className="text-[9px] font-bold text-[#68746F] mt-0.5 opacity-70">Approve & convert new signups to player profiles</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>

        </main>
      )}

      {/* ================= 3. MANAGE MATCHES SCREEN ================= */}
      {activeScreen === 'manage_matches' && (
        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-black text-xl text-[#17211D]">Manage Matches</h1>
            <button
              onClick={() => setActiveScreen('create_match')}
              className="bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Match</span>
            </button>
          </div>

          {/* Match Filter Tabs - Improved Spacing & Compactness */}
          <div className="grid grid-cols-4 gap-1 bg-[#F5F7F8] p-1 rounded-[20px] border border-[#E3EAE7] text-xs font-bold shadow-xs">
            {[
              { id: 'all', label: 'All', count: matches.length },
              { id: 'live', label: 'Live', count: matches.filter((m) => m.status === 'live').length },
              { id: 'upcoming', label: 'Upcm', count: matches.filter((m) => m.status === 'scheduled').length },
              { id: 'completed', label: 'Done', count: matches.filter((m) => m.status === 'completed').length },
            ].map((tab) => {
              const isActive = matchFilterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMatchFilterTab(tab.id as typeof matchFilterTab)}
                  className={`py-2 px-0.5 text-center rounded-[14px] transition-all text-[11px] truncate cursor-pointer flex flex-col items-center justify-center leading-tight ${
                    isActive ? 'bg-[#007A3D] text-white shadow-sm font-black' : 'text-[#68746F] hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[9px] opacity-60 ${isActive ? 'text-emerald-100' : ''}`}>({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68746F]" />
              <input
                type="text"
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E3EAE7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
              />
            </div>
            <button className="bg-white border border-[#E3EAE7] p-2 rounded-xl text-[#68746F] hover:text-[#17211D] cursor-pointer">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Match List */}
          <div className="space-y-3">
            {filteredMatches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E3EAE7] p-6 text-center text-xs text-[#68746F]">
                No matches found matching the selected filter.
              </div>
            ) : (
              filteredMatches.map((m) => {
                const isLive = m.status === 'live';
                const isScheduled = m.status === 'scheduled';
                const isCompleted = m.status === 'completed';

                return (
                  <div key={m.id} className="bg-white border border-[#E3EAE7] rounded-2xl p-3.5 shadow-2xs space-y-2.5 relative">
                    {/* Match Card Header: Status & Info */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FF263D]/10 text-[#FF263D] rounded-full border border-[#FF263D]/20 animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-[#FF263D]" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Live</span>
                          </div>
                        )}
                        {isScheduled && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[9px] font-black uppercase tracking-tighter">Scheduled</span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 text-[9px] font-black uppercase tracking-tighter">Finished</span>
                        )}
                        <h4 className="text-xs font-black text-[#17211D] truncate max-w-[120px]">{m.title}</h4>
                      </div>
                      <span className="text-[10px] font-black text-[#007A3D] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        {m.oversPerInnings} Ov · {m.playersPerTeam}v{m.playersPerTeam}
                      </span>
                    </div>

                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuMatchId(activeMenuMatchId === m.id ? null : m.id)}
                          className="text-[#68746F] hover:text-[#17211D] p-1 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuMatchId === m.id && (
                          <div className="absolute right-0 top-7 z-20 bg-white border border-[#E3EAE7] rounded-xl shadow-lg py-1 w-40 text-xs text-[#17211D]">
                            <button
                              onClick={() => handleStartEditMatch(m)}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] flex items-center gap-2 font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#007A3D]" />
                              <span>Edit Match</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuMatchId(null);
                                onOpenScoringPad(m);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] flex items-center gap-2"
                            >
                              <Play className="w-3.5 h-3.5 text-[#007A3D]" />
                              <span>Scorecard</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuMatchId(null);
                                onOpenTeamBuilder(m);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] flex items-center gap-2"
                            >
                              <Users className="w-3.5 h-3.5 text-[#168BFF]" />
                              <span>Rosters</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuMatchId(null);
                                setMatchToDelete(m);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-[#FF263D] flex items-center gap-2 font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Match</span>
                            </button>
                          </div>
                        )}
                      </div>

                    <div className="flex items-center justify-between py-1 px-1 bg-[#F5F7F8] rounded-2xl border border-[#E3EAE7]/50">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-full bg-[#007A3D] flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                          {m.teamA.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-black text-[#17211D] truncate max-w-[80px]">{m.teamA.name}</span>
                      </div>
                      <div className="px-3">
                        <span className="font-mono text-[#68746F] text-[9px] font-black bg-white px-2 py-0.5 rounded-full border border-[#E3EAE7]">VS</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-[11px] font-black text-[#17211D] truncate max-w-[80px]">{m.teamB.name}</span>
                        <div className="w-8 h-8 rounded-full bg-[#168BFF] flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                          {m.teamB.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E3EAE7] flex items-center justify-between text-[11px] text-[#68746F]">
                      <div className="flex items-center gap-1 min-w-0 flex-1 pr-2">
                        <MapPin className="w-3.5 h-3.5 text-[#007A3D] shrink-0" />
                        <span className="truncate">{m.venue || 'No venue'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditMatch(m);
                          }}
                          className="px-2 py-0.5 bg-[#007A3D]/10 hover:bg-[#007A3D]/20 text-[#007A3D] text-[10.5px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMatchToDelete(m);
                          }}
                          className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-[#FF263D] text-[10.5px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      )}

      {/* ================= 4. CREATE MATCH SCREEN ================= */}
      {activeScreen === 'create_match' && (
        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveScreen('dashboard')}
              className="p-1.5 text-[#17211D] hover:bg-[#E3EAE7] rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-black text-xl text-[#17211D]">Create Match</h1>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-[#FF263D] p-3 rounded-xl text-xs font-semibold">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateMatchSubmit} className="space-y-4">
            {/* Basic Information Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Basic Information</h2>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Match Name *</label>
                <input
                  type="text"
                  placeholder="e.g. City Cup Final"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Match Type *</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                >
                  <option value="Tournament Match">Tournament Match</option>
                  <option value="Friendly">Friendly</option>
                  <option value="League Match">League Match</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Format *</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="5v5">5v5</option>
                    <option value="7v7">7v7</option>
                    <option value="8v8">8v8</option>
                    <option value="11v11">11v11</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Overs (मैच के ओवर) *</label>
                  <select
                    value={overs}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOvers(val);
                      setIsCustomOvers(val === 'Custom');
                    }}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="3 Overs">3 Overs (3 ओवर)</option>
                    <option value="5 Overs">5 Overs (5 ओवर)</option>
                    <option value="8 Overs">8 Overs (8 ओवर)</option>
                    <option value="10 Overs">10 Overs (10 ओवर)</option>
                    <option value="12 Overs">12 Overs (12 ओवर)</option>
                    <option value="15 Overs">15 Overs (15 ओवर)</option>
                    <option value="20 Overs">20 Overs (20 ओवर)</option>
                    <option value="25 Overs">25 Overs (25 ओवर)</option>
                    <option value="50 Overs">50 Overs (50 ओवर)</option>
                    <option value="Custom">Custom (कस्टम ओवर)</option>
                  </select>
                  {isCustomOvers && (
                    <input
                      type="number"
                      value={customOversValue}
                      onChange={(e) => setCustomOversValue(e.target.value)}
                      placeholder="Enter overs"
                      className="w-full mt-2 bg-white border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                      min="1"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Date *</label>
                  <input
                    type="text"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Time *</label>
                  <input
                    type="text"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Venue *</label>
                <input
                  type="text"
                  placeholder="e.g. Central Community Oval, Cricket Ground"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  list="venues-datalist"
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
                <datalist id="venues-datalist">
                  {Array.from(new Set(matches.map((m) => m.venue).filter(Boolean))).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Teams Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Teams</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Team A *</label>
                  <input
                    type="text"
                    placeholder="e.g. Team A"
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    list="teams-datalist-a"
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                  <datalist id="teams-datalist-a">
                    {Array.from(new Set([...matches.map((m) => m.teamA.name), ...players.map((p) => p.teamName || '')].filter(Boolean))).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Team B *</label>
                  <input
                    type="text"
                    placeholder="e.g. Team B"
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    list="teams-datalist-b"
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                  <datalist id="teams-datalist-b">
                    {Array.from(new Set([...matches.map((m) => m.teamB.name), ...players.map((p) => p.teamName || '')].filter(Boolean))).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Player Selection Card (Team A, Team B, & Common Players) */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E3EAE7] pb-2">
                <div>
                  <h2 className="font-bold text-sm text-[#17211D]">Player Selection (खिलाड़ी चुनें)</h2>
                  <p className="text-[11px] text-[#68746F]">
                    Select players for Team A, Team B, or mark as Common Player (दोनों टीमों का खिलाड़ी)
                  </p>
                </div>
                <span className="text-[10.5px] font-mono font-bold text-[#007A3D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  A: {selectedTeamAPlayers.length} · B: {selectedTeamBPlayers.length} · Common: {selectedCommonPlayers.length}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                {players.length === 0 ? (
                  <div className="text-xs text-[#68746F] italic text-center py-2">
                    No registered players found in directory.
                  </div>
                ) : (
                  players.map((p) => {
                    const isCommon = selectedCommonPlayers.includes(p.id);
                    const isTeamA = selectedTeamAPlayers.includes(p.id) && !isCommon;
                    const isTeamB = selectedTeamBPlayers.includes(p.id) && !isCommon;

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-[#F5F7F8] gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#17211D] block truncate">{p.fullName}</span>
                          <span className="text-[10px] text-[#68746F] block truncate">
                            {p.teamName || 'Registered Player'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAssignPlayer(p.id, isTeamA ? 'none' : 'teamA')}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                              isTeamA
                                ? 'bg-[#007A3D] text-white border-[#007A3D]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            Team A
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAssignPlayer(p.id, isTeamB ? 'none' : 'teamB')}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                              isTeamB
                                ? 'bg-[#007A3D] text-white border-[#007A3D]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            Team B
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAssignPlayer(p.id, isCommon ? 'none' : 'common')}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                              isCommon
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                            }`}
                            title="Common player works/plays for both teams"
                          >
                            ⭐️ Common
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Match Settings Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Match Settings</h2>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Status *</label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold text-[#17211D]">Live Scoring</span>
                <button
                  type="button"
                  onClick={() => setLiveScoringEnabled(!liveScoringEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                    liveScoringEnabled ? 'bg-[#007A3D]' : 'bg-[#E3EAE7]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      liveScoringEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Enter match details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl p-3 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
              </div>
            </div>

            {/* Create Match Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Match'}
            </button>
          </form>
        </main>
      )}

      {/* ================= 4b. EDIT MATCH SCREEN ================= */}
      {activeScreen === 'edit_match' && editingMatch && (
        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveScreen('manage_matches');
                  setEditingMatch(null);
                }}
                className="p-1.5 text-[#17211D] hover:bg-[#E3EAE7] rounded-xl cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-black text-xl text-[#17211D]">Edit Match (मैच एडिट करें)</h1>
                <p className="text-[11px] text-[#68746F]">Update schedule, teams, venue, or player roster</p>
              </div>
            </div>

            {(isAdmin || editingMatch.status !== 'completed') && (
              <button
                type="button"
                onClick={() => setMatchToDelete(editingMatch)}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#FF263D] border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-[#FF263D] p-3 rounded-xl text-xs font-semibold">
              {formError}
            </div>
          )}

          <form onSubmit={handleUpdateMatchSubmit} className="space-y-4">
            {/* Basic Information Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Basic Information</h2>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Match Name / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. City Cup Final"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Match Type *</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                >
                  <option value="Tournament Match">Tournament Match</option>
                  <option value="Friendly">Friendly</option>
                  <option value="League Match">League Match</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Format *</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="5v5">5v5</option>
                    <option value="7v7">7v7</option>
                    <option value="8v8">8v8</option>
                    <option value="11v11">11v11</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Overs (मैच के ओवर) *</label>
                  <select
                    value={overs}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOvers(val);
                      setIsCustomOvers(val === 'Custom');
                    }}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  >
                    <option value="3 Overs">3 Overs (3 ओवर)</option>
                    <option value="5 Overs">5 Overs (5 ओवर)</option>
                    <option value="8 Overs">8 Overs (8 ओवर)</option>
                    <option value="10 Overs">10 Overs (10 ओवर)</option>
                    <option value="12 Overs">12 Overs (12 ओवर)</option>
                    <option value="15 Overs">15 Overs (15 ओवर)</option>
                    <option value="20 Overs">20 Overs (20 ओवर)</option>
                    <option value="25 Overs">25 Overs (25 ओवर)</option>
                    <option value="50 Overs">50 Overs (50 ओवर)</option>
                    <option value="Custom">Custom (कस्टम ओवर)</option>
                  </select>
                  {isCustomOvers && (
                    <input
                      type="number"
                      value={customOversValue}
                      onChange={(e) => setCustomOversValue(e.target.value)}
                      placeholder="Enter overs"
                      className="w-full mt-2 bg-white border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                      min="1"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Date *</label>
                  <input
                    type="text"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Time *</label>
                  <input
                    type="text"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Venue *</label>
                <input
                  type="text"
                  placeholder="e.g. Central Community Oval, Cricket Ground"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  list="venues-datalist-edit"
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
                <datalist id="venues-datalist-edit">
                  {Array.from(new Set(matches.map((m) => m.venue).filter(Boolean))).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Teams Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Teams</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Team A *</label>
                  <input
                    type="text"
                    placeholder="e.g. Team A"
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    list="teams-datalist-a-edit"
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                  <datalist id="teams-datalist-a-edit">
                    {Array.from(new Set([...matches.map((m) => m.teamA.name), ...players.map((p) => p.teamName || '')].filter(Boolean))).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#68746F]">Team B *</label>
                  <input
                    type="text"
                    placeholder="e.g. Team B"
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    list="teams-datalist-b-edit"
                    className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                  />
                  <datalist id="teams-datalist-b-edit">
                    {Array.from(new Set([...matches.map((m) => m.teamB.name), ...players.map((p) => p.teamName || '')].filter(Boolean))).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Player Selection Card (Team A, Team B, & Common Players) */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E3EAE7] pb-2">
                <div>
                  <h2 className="font-bold text-sm text-[#17211D]">Squad & Player Roster (स्क्वाड संभालें)</h2>
                  <p className="text-[11px] text-[#68746F]">
                    टीम A, टीम B के खिलाड़ी चुनें या स्क्वाड डेटा साफ़ करें
                  </p>
                </div>
                <span className="text-[10.5px] font-mono font-bold text-[#007A3D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  A: {selectedTeamAPlayers.length} · B: {selectedTeamBPlayers.length}
                </span>
              </div>

              {/* SQUAD CLEAR & ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamAPlayers([]);
                    setSelectedTeamBPlayers([]);
                    setSelectedCommonPlayers([]);
                    showToast('पूरा स्क्वाड डेटा खाली कर दिया गया है। (All squad data cleared)');
                  }}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-[#FF263D] font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Squad Data (पूरा स्क्वाड हटाएं)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamAPlayers([]);
                    showToast('Team A squad cleared.');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10.5px] rounded-lg cursor-pointer"
                >
                  Clear Team A Squad
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamBPlayers([]);
                    showToast('Team B squad cleared.');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10.5px] rounded-lg cursor-pointer"
                >
                  Clear Team B Squad
                </button>
              </div>

              {/* CURRENT TEAM A SQUAD */}
              <div className="space-y-1 bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E3EAE7]">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#007A3D]">
                  <span>{teamA || 'Team A'} Squad ({selectedTeamAPlayers.length} Players)</span>
                </div>
                {selectedTeamAPlayers.length === 0 ? (
                  <p className="text-[11px] text-[#68746F] italic">No players in Team A squad.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTeamAPlayers.map((pId) => {
                      const pObj = players.find((x) => x.id === pId);
                      const name = pObj ? pObj.fullName : `Player ${pId.slice(-4)}`;
                      return (
                        <span
                          key={pId}
                          className="bg-white border border-[#007A3D]/30 text-[#007A3D] font-bold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => handleAssignPlayer(pId, 'none')}
                            className="hover:text-red-600 cursor-pointer ml-0.5 text-xs font-bold"
                            title="Remove from squad"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CURRENT TEAM B SQUAD */}
              <div className="space-y-1 bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E3EAE7]">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#168BFF]">
                  <span>{teamB || 'Team B'} Squad ({selectedTeamBPlayers.length} Players)</span>
                </div>
                {selectedTeamBPlayers.length === 0 ? (
                  <p className="text-[11px] text-[#68746F] italic">No players in Team B squad.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTeamBPlayers.map((pId) => {
                      const pObj = players.find((x) => x.id === pId);
                      const name = pObj ? pObj.fullName : `Player ${pId.slice(-4)}`;
                      return (
                        <span
                          key={pId}
                          className="bg-white border border-[#168BFF]/30 text-[#168BFF] font-bold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => handleAssignPlayer(pId, 'none')}
                            className="hover:text-red-600 cursor-pointer ml-0.5 text-xs font-bold"
                            title="Remove from squad"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DIRECTORY LIST TO TOGGLE PLAYERS */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-[#68746F] block">Add/Toggle Players from Directory:</span>
                <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                  {players.length === 0 ? (
                    <div className="text-xs text-[#68746F] italic text-center py-2">
                      No registered players found in directory. You can add new players from Admin Player Management.
                    </div>
                  ) : (
                    players.map((p) => {
                      const isCommon = selectedCommonPlayers.includes(p.id);
                      const isTeamA = selectedTeamAPlayers.includes(p.id) && !isCommon;
                      const isTeamB = selectedTeamBPlayers.includes(p.id) && !isCommon;

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-[#F5F7F8] gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-[#17211D] block truncate">{p.fullName}</span>
                            <span className="text-[10px] text-[#68746F] block truncate">
                              {p.teamName || 'Registered Player'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAssignPlayer(p.id, isTeamA ? 'none' : 'teamA')}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                                isTeamA
                                  ? 'bg-[#007A3D] text-white border-[#007A3D]'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              Team A
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAssignPlayer(p.id, isTeamB ? 'none' : 'teamB')}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                                isTeamB
                                  ? 'bg-[#007A3D] text-white border-[#007A3D]'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              Team B
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAssignPlayer(p.id, isCommon ? 'none' : 'common')}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                                isCommon
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                              }`}
                              title="Common player works/plays for both teams"
                            >
                              ⭐️ Common
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Match Settings Card */}
            <div className="bg-white border border-[#E3EAE7] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <h2 className="font-bold text-sm text-[#17211D]">Match Status & Details</h2>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Status *</label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                >
                  <option value="Upcoming">Upcoming (Scheduled)</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">MVP Selector (मैन ऑफ द मैच)</label>
                <select
                  value={selectedMvpId || ''}
                  onChange={(e) => setSelectedMvpId(e.target.value || null)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl px-3 py-2 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                >
                  <option value="">Select MVP</option>
                  {Array.from(new Set([...selectedTeamAPlayers, ...selectedTeamBPlayers])).map((pId) => {
                    const pObj = players.find(p => p.id === pId);
                    return <option key={pId} value={pId}>{pObj?.fullName || `Player ${pId.slice(-4)}`}</option>;
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#68746F]">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Enter match details, remarks..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F5F7F8] border border-[#E3EAE7] rounded-xl p-3 text-xs text-[#17211D] focus:outline-none focus:border-[#007A3D]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || (editingMatch.status === 'completed' && !isAdmin)}
                className="w-full bg-[#007A3D] hover:bg-[#006030] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Changes...' : 'Update Match (बदलाव सेव करें)'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveScreen('manage_matches');
                  setEditingMatch(null);
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#17211D] font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel (रद्द करें)
              </button>
            </div>
          </form>
        </main>
      )}

      {/* ================= 5. LIVE SCORING PANEL SCREEN ================= */}
      {activeScreen === 'live_scoring_panel' && (
        <LiveScoringPanel
          matches={matches}
          players={players}
          initialSelectedMatch={selectedScoringMatch}
          onOpenDrawer={() => setIsSidebarOpen(true)}
          onRefreshData={onRefreshData}
          onClosePanel={() => setSelectedScoringMatch(null)}
        />
      )}

      {/* ================= 6. ADMIN PLAYER MANAGEMENT SCREEN ================= */}
      {activeScreen === 'player_management' && (
        <AdminPlayerManagement
          players={players}
          onRefreshData={onRefreshData}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          currentUserDisplayName={currentUser?.displayName || 'Admin User'}
          currentUserPhotoUrl={currentUser?.photoURL || undefined}
        />
      )}

      {/* ================= 6b. ADMIN TEAM MANAGEMENT SCREEN ================= */}
      {activeScreen === 'manage_teams' && (
        <TeamManagementView />
      )}

      {/* ================= 7. ADMIN USER MANAGEMENT SCREEN ================= */}
      {activeScreen === 'manage_users' && (
        <AdminUserManagement
          players={players}
          onBack={() => setActiveScreen('dashboard')}
          onRefreshData={onRefreshData}
        />
      )}

      {activeScreen === 'audit_log' && (
        <AuditLogView />
      )}

      {activeScreen === 'super_admin' && (
        <SuperAdminPanel />
      )}

      {/* ================= 8. ADMIN LOGO UPLOAD SCREEN ================= */}
      {activeScreen === 'logo_upload' && (
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <h2 className="text-xl font-black text-[#17211D]">Upload Custom Logo</h2>
          <input 
            type="file" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLogoFile(file);
              }
            }} 
            accept="image/*" 
          />
          {logoFile && <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-32 h-32 object-contain" />}
          
          <div className="flex gap-2">
            <button 
              onClick={handleLogoUpload}
              disabled={isUploading || !logoFile}
              className="bg-[#007A3D] text-white px-4 py-2 rounded-xl flex items-center gap-2"
            >
              {isUploading ? 'Uploading...' : 'Save Logo'}
            </button>
            <button 
              onClick={() => setActiveScreen('dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* IN-APP DELETE MATCH CONFIRMATION MODAL (No window.confirm!) */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-red-100 text-[#17211D]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FF263D] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-[#17211D]">
                Delete Match Fixture?
              </h3>
              <p className="text-xs text-[#68746F]">
                क्या आप वाकई इस मैच को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
              </p>
            </div>

            <div className="bg-[#F5F7F8] border border-[#E3EAE7] rounded-2xl p-3 text-xs space-y-1.5">
              <div className="font-bold text-[#17211D] truncate">
                {matchToDelete.title}
              </div>
              <div className="text-[#007A3D] font-semibold flex items-center justify-between">
                <span>{matchToDelete.teamA.name}</span>
                <span className="text-[#68746F] text-[10px]">VS</span>
                <span>{matchToDelete.teamB.name}</span>
              </div>
              <div className="text-[11px] text-[#68746F] flex items-center gap-2 pt-1 border-t border-[#E3EAE7]">
                <span>{matchToDelete.playersPerTeam}v{matchToDelete.playersPerTeam}</span>
                <span>•</span>
                <span>{matchToDelete.oversPerInnings} Overs</span>
                <span>•</span>
                <span className="uppercase font-bold text-[#168BFF]">{matchToDelete.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#17211D] font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteMatch}
                className="py-2.5 px-4 bg-[#FF263D] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हटाएं (Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
