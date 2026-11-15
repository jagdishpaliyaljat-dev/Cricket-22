import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Logo } from './components/Logo';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { MatchCard } from './components/MatchCard';
import { ScoringPad } from './components/ScoringPad';
import { ScorecardModal } from './components/ScorecardModal';
import { AvailabilityModal } from './components/AvailabilityModal';
import { TeamBuilderModal } from './components/TeamBuilderModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PlayerDirectory } from './components/PlayerDirectory';
import { PlayerComparison } from './components/PlayerComparison';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminPanel } from './components/AdminPanel';
import { LoginScreen } from './components/LoginScreen';
import { HomeView } from './components/HomeView';
import { MatchesView } from './components/MatchesView';
import { MatchDetailsView } from './components/MatchDetailsView';
import { PlayerProfileView } from './components/PlayerProfileView';
import { MyProfileView } from './components/MyProfileView';
import { EditProfileView } from './components/EditProfileView';
import { SideDrawer } from './components/SideDrawer';
import { MatchesMenuView } from './components/MatchesMenuView';
import { ProfileMenuView } from './components/ProfileMenuView';
import { DeveloperIntroPopup } from './components/DeveloperIntroPopup';
import { NotificationManager } from './components/NotificationManager';
import { OfflineIndicator } from './components/OfflineIndicator';

import { CricketMatch, Player } from './types/cricket';
import { subscribeMatches, fetchMatches, deleteMatch } from './services/matchService';
import { subscribePlayers, fetchPlayers, updatePlayer } from './services/playerService';
import { useMatchReminders } from './hooks/useMatchReminders';
import { requestPushPermission, setupOnMessageListener } from './services/pushNotificationService';


import {
  loadActiveScoringMatchId,
  clearActiveScoringMatchId,
  isCreateMatchModalOpen,
} from './utils/draftStorage';
import { purgeAllDemoData } from './utils/seedData';
import { Activity, Calendar, Trophy, Users, Shield, PlusCircle, Sparkles, Bell, Clock, X } from 'lucide-react';

function LocalXIContent() {
  console.log('[LocalXI] LocalXIContent rendering...');
  const { currentUser, isAdmin, isScorer, loading: authLoading } = useAuth();
  console.log('[LocalXI] Auth state:', { currentUser, authLoading });
  const [currentTab, setCurrentTab] = useState<'home' | 'matches' | 'live' | 'players' | 'compare' | 'leaderboard' | 'admin' | 'profile'>(() => {
    try {
      if (isCreateMatchModalOpen()) {
        return 'admin';
      }
    } catch {}
    return 'home';
  });
  const [compareInitialPlayerId, setCompareInitialPlayerId] = useState<string | undefined>(undefined);
  const [matchFilter, setMatchFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');

  // Application Data State
  const [matches, setMatches] = useState<CricketMatch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  // Active Modals & Views
  const [detailedMatch, setDetailedMatch] = useState<CricketMatch | null>(null);
  const [activeScoringMatch, setActiveScoringMatch] = useState<CricketMatch | null>(null);
  const [activeScorecardMatch, setActiveScorecardMatch] = useState<CricketMatch | null>(null);
  const [activeAvailabilityMatch, setActiveAvailabilityMatch] = useState<CricketMatch | null>(null);
  const [activeTeamBuilderMatch, setActiveTeamBuilderMatch] = useState<CricketMatch | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [matchToEditInAdmin, setMatchToEditInAdmin] = useState<CricketMatch | null>(null);
  const [profileSubMode, setProfileSubMode] = useState<'main' | 'edit' | 'stats'>('main');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [subMenuView, setSubMenuView] = useState<null | 'matches_menu' | 'profile_menu'>(null);
  const [showDevPopup, setShowDevPopup] = useState(false);
  const [hasShownDevPopupThisSession, setHasShownDevPopupThisSession] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && currentTab === 'home' && !hasShownDevPopupThisSession) {
      setShowDevPopup(true);
      setHasShownDevPopupThisSession(true);
    }
  }, [authLoading, currentUser, currentTab, hasShownDevPopupThisSession]);

  // Subscribe to real-time collections
  useEffect(() => {
    const unsubMatches = subscribeMatches((data) => {
      setMatches(data);
      // Keep active modal match in sync if updated
      if (activeScoringMatch) {
        const updated = data.find((m) => m.id === activeScoringMatch.id);
        if (updated) setActiveScoringMatch(updated);
      }
      if (activeScorecardMatch) {
        const updated = data.find((m) => m.id === activeScorecardMatch.id);
        if (updated) setActiveScorecardMatch(updated);
      }
    });

    const unsubPlayers = subscribePlayers((data) => {
      setPlayers(data);
      if (selectedPlayer) {
        const updatedP = data.find((p) => p.id === selectedPlayer.id);
        if (updatedP) setSelectedPlayer(updatedP);
      }
    });

    return () => {
      unsubMatches();
      unsubPlayers();
    };
  }, []);



  // Restore active scoring session if user accidentally refreshed the browser
  useEffect(() => {
    if (!activeScoringMatch && matches.length > 0) {
      const savedScoringMatchId = loadActiveScoringMatchId();
      if (savedScoringMatchId) {
        const found = matches.find((m) => m.id === savedScoringMatchId);
        if (found && found.status !== 'completed') {
          setActiveScoringMatch(found);
        } else if (found && found.status === 'completed') {
          clearActiveScoringMatchId();
        }
      }
    }
    
    // Handle deep linking via matchId query param
    if (!detailedMatch && matches.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const matchId = params.get('matchId');
      if (matchId) {
        const found = matches.find((m) => m.id === matchId);
        if (found) {
          setDetailedMatch(found);
          // Optional: clear param from URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [matches, activeScoringMatch, detailedMatch]);


  const handleRefreshData = async () => {
    const [mList, pList] = await Promise.all([fetchMatches(), fetchPlayers()]);
    setMatches(mList);
    setPlayers(pList);
  };

  const displayPlayers = players;
  const currentUserPlayer = displayPlayers.find(
    (p) => p.userId === currentUser?.uid || p.id === currentUser?.uid
  );
  const displayMatches = matches;

  const { activeAlert, dismissAlert } = useMatchReminders(displayMatches, displayPlayers, currentUserPlayer);

  const liveMatches = displayMatches.filter((m) => m.status === 'live');
  const filteredMatches = displayMatches.filter((m) => {
    if (matchFilter === 'all') return true;
    return m.status === matchFilter;
  });

  // Reset profile submode when leaving profile tab
  useEffect(() => {
    if (currentTab !== 'profile') {
      setProfileSubMode('main');
    }
  }, [currentTab]);

  // Handle Push Notifications
  useEffect(() => {
    if (currentUser) {
      setupOnMessageListener();
      // Only auto-request if not already denied or granted? 
      // Actually browser will handle the prompt. 
      // But we might want to do it after a small delay or user interaction.
      // For now, let's just setup the listener.
    }
  }, [currentUser]);

  const [isGuest, setIsGuest] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mb-6 flex items-center justify-center animate-bounce">
          <Logo variant="icon" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-white font-black text-xl tracking-tight">LocalXI Cricket</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00F2FE] animate-pulse" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest font-mono">Initializing Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return <LoginScreen onContinueAsGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8 relative overflow-x-hidden">
      {/* Automated In-App Notifications */}
      <NotificationManager />
      <OfflineIndicator />

      {/* 30-Minute Match Reminder Toast / Banner */}
      {activeAlert && (
        <div className="stadium-card-glow border border-[#00F2FE]/40 text-white px-4 py-3 shadow-xl relative z-50 flex items-center justify-between gap-3 font-sans animate-in slide-in-from-top duration-200 rounded-2xl mx-3 mt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#00F2FE]">Match Starting Soon</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse" />
              </div>
              <p className="text-xs font-semibold truncate text-white mt-0.5">{activeAlert.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setDetailedMatch(activeAlert.match);
                dismissAlert();
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black text-xs rounded-xl cursor-pointer hover:opacity-95 shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all"
            >
              View
            </button>
            <button
              onClick={dismissAlert}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Atmospheric stadium lighting backdrop */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00F2FE]/15 via-[#0B1120]/40 to-transparent z-0" />

      {/* Display global header ONLY on the Home page */}
      {currentTab === 'home' && !detailedMatch && !selectedPlayer && !subMenuView && (
        <Header
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setDetailedMatch(null);
            setSelectedPlayer(null);
            setSubMenuView(null);
            setCurrentTab(tab);
          }}
          liveMatchCount={liveMatches.length}
          matches={displayMatches}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenProfile={() => {
            setSubMenuView('profile_menu');
          }}
        />
      )}

      {/* Live Match Broadcast Ticker (Visible on other tabs when not viewing match or player details) */}
      {!detailedMatch && !selectedPlayer && currentTab !== 'home' && currentTab !== 'matches' && liveMatches.length > 0 && (() => {
        const liveMatch = liveMatches[0];
        const activeInnings = liveMatch.currentInnings === 2 ? liveMatch.innings2 : liveMatch.innings1;
        const scoreStr = activeInnings ? `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.legalOvers}.${activeInnings.legalBalls} ov)` : null;
        return (
          <div className="bg-[#111A2E]/90 border-b border-white/10 px-3 sm:px-4 py-2 transition-all relative z-10 text-white shadow-md backdrop-blur-md">
            <div className="max-w-md mx-auto flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                <span className="flex items-center gap-1 shrink-0 bg-[#EF4444] text-white font-mono font-bold text-[9.5px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_#EF4444]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
                <span className="text-slate-200 font-semibold truncate text-[11px] sm:text-xs">
                  {liveMatch.title}
                </span>
                {scoreStr && (
                  <span className="font-mono text-[#00F2FE] font-bold text-[11px] shrink-0">
                    · {scoreStr}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDetailedMatch(liveMatch)}
                className="text-[#00F2FE] font-bold text-[11px] hover:underline shrink-0 cursor-pointer flex items-center gap-1 touch-press"
              >
                <span>Scorecard</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Container */}
      <main className={`${currentTab === 'compare' && !detailedMatch && !selectedPlayer && !subMenuView ? 'max-w-4xl' : 'max-w-md'} mx-auto py-3 flex-1 w-full min-w-0 relative z-10`}>
        {subMenuView === 'matches_menu' ? (
          <MatchesMenuView
            onBack={() => setSubMenuView(null)}
            onSelectFilter={(filter) => {
              setMatchFilter(filter);
              setSubMenuView(null);
              setCurrentTab('matches');
            }}
          />
        ) : subMenuView === 'profile_menu' ? (
          <ProfileMenuView
            onBack={() => setSubMenuView(null)}
            onSelectOption={(opt) => {
              setSubMenuView(null);
              if (opt === 'my_profile') {
                setCurrentTab('profile');
                setProfileSubMode('main');
              } else if (opt === 'edit_profile') {
                setCurrentTab('profile');
                setProfileSubMode('edit');
              } else if (opt === 'availability') {
                if (displayMatches.length > 0) {
                  setActiveAvailabilityMatch(displayMatches[0]);
                }
              } else if (opt === 'stats') {
                setCurrentTab('profile');
                setProfileSubMode('stats');
              } else if (opt === 'matches') {
                setCurrentTab('matches');
              }
            }}
          />
        ) : detailedMatch ? (
          <MatchDetailsView
            match={detailedMatch}
            players={displayPlayers}
            onBack={() => setDetailedMatch(null)}
            onOpenScorecardModal={(m) => setActiveScorecardMatch(m)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onEditMatch={isAdmin || isScorer ? (m) => {
              setDetailedMatch(null);
              setMatchToEditInAdmin(m);
              setCurrentTab('admin');
            } : undefined}
            onDeleteMatch={isAdmin || isScorer ? async (m) => {
              try {
                await deleteMatch(m.id);
                setDetailedMatch(null);
                handleRefreshData();
              } catch (e) {
                console.error('Delete error:', e);
              }
            } : undefined}
          />
        ) : selectedPlayer ? (
          <PlayerProfileView
            player={selectedPlayer}
            onBack={() => {
              setSelectedPlayer(null);
              if (currentTab === 'profile') setCurrentTab('players');
            }}
            onSelectMatchDetails={(matchId) => {
              const m = displayMatches.find((x) => x.id === matchId);
              if (m) {
                setSelectedPlayer(null);
                setDetailedMatch(m);
              }
            }}
            onEditPlayer={(p) => setEditingPlayer(p)}
            onComparePlayer={(p) => {
              setSelectedPlayer(null);
              setCompareInitialPlayerId(p.id);
              setCurrentTab('compare');
            }}
          />
        ) : (
          <>
            {/* TAB 0: HOME DASHBOARD */}
            {currentTab === 'home' && (
              <HomeView
                matches={displayMatches}
                players={displayPlayers}
                onNavigateTab={(tab) => {
                  setDetailedMatch(null);
                  setCurrentTab(tab);
                }}
                onOpenScorecard={(m) => setDetailedMatch(m)}
                onOpenScoringPad={(m) => setActiveScoringMatch(m)}
                onOpenAvailability={(m) => setActiveAvailabilityMatch(m)}
                onOpenTeamBuilder={(m) => setActiveTeamBuilderMatch(m)}
                onSelectPlayer={(p) => setSelectedPlayer(p)}
                onOpenProfile={() => {
                  const p = displayPlayers.find((x) => currentUser && (x.userId === currentUser.uid || x.id === currentUser.uid)) || displayPlayers[0];
                  if (p) setSelectedPlayer(p);
                }}
              />
            )}

            {/* TAB 1: MATCHES (SCREEN ONE OF REFERENCE) */}
            {currentTab === 'matches' && (
              <MatchesView
                matches={displayMatches}
                players={displayPlayers}
                onOpenMatchDetails={(m) => setDetailedMatch(m)}
                onOpenAvailability={(m) => setActiveAvailabilityMatch(m)}
                onOpenTeamBuilder={(m) => setActiveTeamBuilderMatch(m)}
                onOpenCreateMatch={() => {
                  setMatchToEditInAdmin(null);
                  setCurrentTab('admin');
                }}
                onEditMatch={(m) => {
                  setMatchToEditInAdmin(m);
                  setCurrentTab('admin');
                }}
                onDeleteMatch={async (m) => {
                  try {
                    await deleteMatch(m.id);
                    handleRefreshData();
                  } catch (e) {
                    console.error('Delete error:', e);
                  }
                }}
                canCreateMatch={isAdmin || isScorer}
              />
            )}

        {/* TAB 2: LIVE SCORING VIEW */}
        {currentTab === 'live' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-xl text-[#172033] tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#D94343] animate-pulse" />
                  Live Match Center
                </h2>
                <p className="text-xs text-[#718096]">
                  Real-time ball-by-ball commentary and active live scorecards.
                </p>
              </div>
            </div>

            {liveMatches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#DFE7F2] p-7 text-center space-y-2.5 shadow-xs">
                <Activity className="w-6 h-6 text-[#718096] mx-auto opacity-70" />
                <h3 className="font-bold text-sm text-[#172033]">No Live Matches in Progress</h3>
                <p className="text-xs text-[#718096] max-w-sm mx-auto">
                  Active cricket matches will stream ball-by-ball score updates right here.
                </p>
                <button
                  onClick={() => setCurrentTab('matches')}
                  className="mt-2 px-4 py-2 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors inline-block"
                >
                  View Upcoming Matches
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onOpenScorecard={(m) => setActiveScorecardMatch(m)}
                    onOpenScoringPad={(m) => setActiveScoringMatch(m)}
                    onOpenAvailability={(m) => setActiveAvailabilityMatch(m)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLAYERS DIRECTORY */}
        {currentTab === 'players' && (
          <PlayerDirectory
            players={displayPlayers}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onRefresh={handleRefreshData}
            onOpenCompare={() => {
              setCompareInitialPlayerId(undefined);
              setCurrentTab('compare');
            }}
          />
        )}

        {/* TAB 3B: PLAYER COMPARISON */}
        {currentTab === 'compare' && (
          <PlayerComparison
            players={displayPlayers}
            initialPlayerAId={compareInitialPlayerId}
            onBack={() => setCurrentTab('players')}
            onSelectPlayerProfile={(p) => setSelectedPlayer(p)}
          />
        )}

        {/* TAB 4: LEADERBOARDS */}
        {currentTab === 'leaderboard' && (
          <LeaderboardView
            players={displayPlayers}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {/* TAB 5: ADMIN PANEL */}
        {currentTab === 'admin' && (
          <AdminPanel
            matches={displayMatches}
            players={displayPlayers}
            onOpenTeamBuilder={(m) => setActiveTeamBuilderMatch(m)}
            onOpenScoringPad={(m) => setActiveScoringMatch(m)}
            onOpenAvailability={(m) => setActiveAvailabilityMatch(m)}
            onRefreshData={handleRefreshData}
            initialEditingMatch={matchToEditInAdmin}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {/* TAB 6: PROFILE (MY PROFILE / EDIT PROFILE / BATTING STATS) */}
        {currentTab === 'profile' && (() => {
          const myPlayer =
            displayPlayers.find(
              (p) => currentUser && (p.userId === currentUser.uid || p.id === currentUser.uid)
            ) || displayPlayers[0];

          if (!myPlayer) {
            return (
              <div className="bg-white border border-[#DFE7F2] rounded-2xl p-6 text-center space-y-3 mt-4 shadow-xs">
                <Users className="w-8 h-8 text-[#1554B8] mx-auto opacity-80" />
                <h3 className="font-bold text-base text-[#172033]">No Player Profile Found</h3>
                <p className="text-xs text-[#718096] max-w-xs mx-auto">
                  You do not have a player record registered yet. Register in the Player Directory to track your batting runs, bowling wickets, and matches.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('players')}
                  className="px-4 py-2 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Go to Player Directory</span>
                </button>
              </div>
            );
          }

          if (profileSubMode === 'edit') {
            return (
              <EditProfileView
                player={myPlayer}
                onBack={() => setProfileSubMode('main')}
                onSaveSuccess={(updated) => {
                  handleRefreshData();
                  setProfileSubMode('main');
                }}
              />
            );
          }

          if (profileSubMode === 'stats') {
            return (
              <PlayerProfileView
                player={myPlayer}
                onBack={() => setProfileSubMode('main')}
                initialTab="batting"
                onEditPlayer={() => setProfileSubMode('edit')}
              />
            );
          }

          return (
            <MyProfileView
              player={myPlayer}
              onEditProfile={(focusBio) => setProfileSubMode('edit')}
              onOpenStats={(tab) => setProfileSubMode('stats')}
              onUpdatePhoto={async (url) => {
                await updatePlayer(myPlayer.id, { photoUrl: url });
                handleRefreshData();
              }}
            />
          );
        })()}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setDetailedMatch(null);
          setSelectedPlayer(null);
          setProfileSubMode('main');
          setCurrentTab(tab);
        }}
        liveMatchCount={liveMatches.length}
      />

      {/* ACTIVE MODALS */}
      {/* 1. Live Scoring Pad */}
      {activeScoringMatch && (
        <ScoringPad
          match={activeScoringMatch}
          players={displayPlayers}
          onClose={() => {
            clearActiveScoringMatchId();
            setActiveScoringMatch(null);
          }}
          onRefreshMatch={handleRefreshData}
        />
      )}

      {/* 2. Scorecard Viewer */}
      {activeScorecardMatch && (
        <ScorecardModal
          match={activeScorecardMatch}
          players={displayPlayers}
          onClose={() => setActiveScorecardMatch(null)}
        />
      )}

      {/* 3. Availability RSVP & Review */}
      {activeAvailabilityMatch && (
        <AvailabilityModal
          match={activeAvailabilityMatch}
          players={displayPlayers}
          onClose={() => setActiveAvailabilityMatch(null)}
          onOpenTeamBuilder={(m) => {
            setActiveAvailabilityMatch(null);
            setActiveTeamBuilderMatch(m);
          }}
        />
      )}

      {/* 4. Automatic Team Builder */}
      {activeTeamBuilderMatch && (
        <TeamBuilderModal
          match={activeTeamBuilderMatch}
          players={displayPlayers}
          onClose={() => setActiveTeamBuilderMatch(null)}
          onSuccess={handleRefreshData}
        />
      )}

      {/* 5. Player Profile & Career Record Editor */}
      {editingPlayer && (
        <PlayerProfileModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onPlayerUpdated={() => {
            handleRefreshData();
            setEditingPlayer(null);
          }}
        />
      )}

      {/* 6. Side Navigation Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentTab={currentTab}
        onNavigate={(tab) => {
          setDetailedMatch(null);
          setSelectedPlayer(null);
          setSubMenuView(null);
          setCurrentTab(tab);
        }}
        onOpenMatchesMenu={() => {
          setSubMenuView('matches_menu');
        }}
        onOpenProfileMenu={() => {
          setSubMenuView('profile_menu');
        }}
        currentUserPlayer={currentUserPlayer}
      />

      {/* Developer Introduction Popup */}
      {showDevPopup && (
        <DeveloperIntroPopup onClose={() => setShowDevPopup(false)} />
      )}
    </div>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocalXIContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
