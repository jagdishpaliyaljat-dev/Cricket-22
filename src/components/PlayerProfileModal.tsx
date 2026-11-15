import React, { useState, useEffect } from 'react';
import { Player, PlayerMatchStat, BattingStyle, BowlingStyle, PlayingRole } from '../types/cricket';
import { useAuth } from '../context/AuthContext';
import { fetchPlayerMatchStats, updatePlayer } from '../services/playerService';
import { calculateStrikeRate, calculateEconomy } from '../lib/cricketEngine';
import { X, Award, Shield, Phone, Calendar, Edit3, Check } from 'lucide-react';

interface PlayerProfileModalProps {
  player: Player;
  onClose: () => void;
  onPlayerUpdated: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  onClose,
  onPlayerUpdated,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [matchHistory, setMatchHistory] = useState<PlayerMatchStat[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'batting' | 'bowling' | 'fielding' | 'matches' | 'edit'>('overview');

  // Edit form state
  const [fullName, setFullName] = useState(player.fullName);
  const [mobileNumber, setMobileNumber] = useState(player.mobileNumber || '');
  const [dob, setDob] = useState(player.dob || '');
  const [playingRole, setPlayingRole] = useState<PlayingRole>(player.playingRole);
  const [battingStyle, setBattingStyle] = useState<BattingStyle>(player.battingStyle);
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>(player.bowlingStyle);
  const [jerseyNumber, setJerseyNumber] = useState<string>(player.jerseyNumber ? String(player.jerseyNumber) : '');
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = currentUser?.uid === player.userId;
  const canEdit = isOwner || isAdmin;
  const canViewPII = isOwner || isAdmin;

  // Load match history
  useEffect(() => {
    async function loadHistory() {
      const history = await fetchPlayerMatchStats(player.id);
      setMatchHistory(history);
    }
    loadHistory();
  }, [player.id]);

  const career = player.career;
  const battingAvg =
    career.innings > 0
      ? (career.runs / Math.max(1, career.innings - career.notOuts)).toFixed(2)
      : '0.00';
  const strikeRate = calculateStrikeRate(career.runs, career.ballsFaced);
  const bowlingEcon = calculateEconomy(career.runsConceded, career.ballsBowled);
  const bowlingAvg =
    career.wickets > 0 ? (career.runsConceded / career.wickets).toFixed(2) : '0.00';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    try {
      await updatePlayer(player.id, {
        fullName,
        mobileNumber: mobileNumber || undefined,
        dob: dob || undefined,
        playingRole,
        battingStyle,
        bowlingStyle,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
      });
      onPlayerUpdated();
      setActiveTab('overview');
    } catch (err) {
      console.error('Error saving player profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0F172A] border border-white/15 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col text-slate-100">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#0F1E36] to-[#13284C] text-white p-3.5 sm:p-4.5 border-b border-white/10 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer border border-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 sm:gap-3.5 pr-7 sm:pr-8">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.fullName}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-[#00F2FE]/50 shadow-[0_0_15px_rgba(0,242,254,0.25)] shrink-0 bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 border-2 border-[#00F2FE]/50 flex items-center justify-center text-[#00F2FE] text-lg sm:text-xl font-bold shadow-md shrink-0">
                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.fullName.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1 truncate">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-sans font-bold text-base sm:text-lg text-white tracking-tight truncate max-w-[170px] xs:max-w-none">
                  {player.fullName}
                </h2>
                {player.career.potmAwards > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/25 shrink-0">
                    <Award className="w-3 h-3" />
                    {player.career.potmAwards} POTM
                  </span>
                )}
              </div>

              <div className="text-xs text-[#00F2FE] capitalize mt-0.5 truncate font-medium">
                {player.playingRole.replace(/_/g, ' ')}
              </div>

              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {player.battingStyle.replace(/_/g, ' ')} · {player.bowlingStyle.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto no-scrollbar text-xs font-semibold">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'batting', label: 'Batting' },
              { id: 'bowling', label: 'Bowling' },
              { id: 'fielding', label: 'Fielding' },
              { id: 'matches', label: `Matches (${matchHistory.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all whitespace-nowrap text-[11px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {canEdit && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1 text-[11px] font-bold ${
                  activeTab === 'edit'
                    ? 'bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs bg-[#0B1120]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="stadium-card p-2.5 sm:p-3 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Matches</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">{career.matches}</div>
                </div>
                <div className="stadium-card p-2.5 sm:p-3 rounded-xl border border-[#00F2FE]/30 shadow-sm">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Total Runs</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-[#00F2FE] mt-0.5">{career.runs}</div>
                </div>
                <div className="stadium-card p-2.5 sm:p-3 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wickets</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">{career.wickets}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="stadium-card p-2.5 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bat Avg</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-white mt-0.5">{battingAvg}</div>
                </div>
                <div className="stadium-card p-2.5 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Strike Rate</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#00F2FE] mt-0.5">{strikeRate}</div>
                </div>
                <div className="stadium-card p-2.5 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Economy</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-white mt-0.5">{bowlingEcon}</div>
                </div>
                <div className="stadium-card p-2.5 rounded-xl border border-white/10 shadow-sm">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Bowl Avg</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#00F2FE] mt-0.5">{bowlingAvg}</div>
                </div>
              </div>

              {canViewPII && (
                <div className="stadium-card p-3 rounded-xl border border-white/10 space-y-1.5 shadow-sm">
                  <div className="text-[11px] font-bold text-[#00F2FE] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#00F2FE]" /> Private Contact Details
                  </div>
                  <div className="flex flex-wrap gap-4 text-slate-200 font-mono text-xs pt-0.5">
                    {player.mobileNumber && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Phone className="w-3 h-3 text-[#00F2FE]" /> {player.mobileNumber}
                      </span>
                    )}
                    {player.dob && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3 h-3 text-[#00F2FE]" /> DOB: {player.dob}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATTING */}
          {activeTab === 'batting' && (
            <div className="stadium-card p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="text-xs uppercase tracking-wider text-[#00F2FE]">Career Batting Record</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {career.innings} Inns ({career.notOuts} NO)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Runs</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">{career.runs}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HS</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">{career.highestScore}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Average</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-[#00F2FE] mt-0.5">{battingAvg}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Strike Rate</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-[#00F2FE] mt-0.5">{strikeRate}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Balls: {career.ballsFaced}</span>
                <span>4s: {career.fours}</span>
                <span>6s: {career.sixes}</span>
              </div>
            </div>
          )}

          {/* TAB 3: BOWLING */}
          {activeTab === 'bowling' && (
            <div className="stadium-card p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="text-xs uppercase tracking-wider text-[#00F2FE]">Career Bowling Record</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {career.oversBowled} Overs ({career.ballsBowled} Balls)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wickets</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">{career.wickets}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Best Figures</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-white mt-0.5">
                    {career.bestBowlingWickets > 0 ? `${career.bestBowlingWickets}/${career.bestBowlingRuns}` : '—'}
                  </div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Economy</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-[#00F2FE] mt-0.5">{bowlingEcon}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Average</div>
                  <div className="font-mono font-black text-lg sm:text-xl text-[#00F2FE] mt-0.5">{bowlingAvg}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Runs Conceded: {career.runsConceded}</span>
                <span>Overs Bowled: {career.oversBowled}</span>
              </div>
            </div>
          )}

          {/* TAB 4: FIELDING */}
          {activeTab === 'fielding' && (
            <div className="stadium-card p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg">
              <div className="font-bold text-[#00F2FE] text-xs uppercase tracking-wider">Fielding Statistics</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Catches</div>
                  <div className="font-mono font-black text-xl text-white mt-0.5">{career.catches}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Run Outs</div>
                  <div className="font-mono font-black text-xl text-white mt-0.5">{career.runOuts}</div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-[#00F2FE] font-bold uppercase tracking-wider">Matches</div>
                  <div className="font-mono font-black text-xl text-[#00F2FE] mt-0.5">{career.matches}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MATCH HISTORY */}
          {activeTab === 'matches' && (
            <div className="space-y-2">
              {matchHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic text-xs stadium-card rounded-2xl border border-white/10">
                  No finalized matches recorded for this player yet.
                </div>
              ) : (
                matchHistory.map((stat) => (
                  <div
                    key={stat.id}
                    className="stadium-card p-3 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">
                        Match #{stat.matchId.replace('match_', '')}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {stat.dismissalStatus}
                      </div>
                    </div>

                    <div className="font-mono text-right text-xs">
                      <div>
                        Bat: <strong className="text-white">{stat.battingRuns}</strong> ({stat.ballsFaced})
                      </div>
                      <div className="text-[#00F2FE] text-[11px] font-bold">
                        Bowl: {stat.wickets}/{stat.runsConceded} ({stat.oversBowled} ov)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: EDIT PROFILE */}
          {activeTab === 'edit' && canEdit && (
            <form onSubmit={handleSaveProfile} className="space-y-3 stadium-card p-4 rounded-2xl border border-white/10 shadow-lg">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#00F2FE] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Playing Role</label>
                  <select
                    value={playingRole}
                    onChange={(e) => setPlayingRole(e.target.value as PlayingRole)}
                    className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white capitalize focus:outline-none focus:border-[#00F2FE] text-xs cursor-pointer"
                  >
                    <option value="top_order_batter" className="bg-[#0F172A] text-white">Top Order Batter</option>
                    <option value="middle_order_batter" className="bg-[#0F172A] text-white">Middle Order Batter</option>
                    <option value="wicketkeeper_batter" className="bg-[#0F172A] text-white">Wicketkeeper Batter</option>
                    <option value="batting_allrounder" className="bg-[#0F172A] text-white">Batting Allrounder</option>
                    <option value="bowling_allrounder" className="bg-[#0F172A] text-white">Bowling Allrounder</option>
                    <option value="pace_bowler" className="bg-[#0F172A] text-white">Pace Bowler</option>
                    <option value="spin_bowler" className="bg-[#0F172A] text-white">Spin Bowler</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Jersey Number</label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00F2FE] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Batting Style</label>
                  <select
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
                    className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white capitalize focus:outline-none focus:border-[#00F2FE] text-xs cursor-pointer"
                  >
                    <option value="right_hand_bat" className="bg-[#0F172A] text-white">Right Hand Bat</option>
                    <option value="left_hand_bat" className="bg-[#0F172A] text-white">Left Hand Bat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Bowling Style</label>
                  <select
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
                    className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white capitalize focus:outline-none focus:border-[#00F2FE] text-xs cursor-pointer"
                  >
                    <option value="right_arm_fast" className="bg-[#0F172A] text-white">Right Arm Fast</option>
                    <option value="right_arm_medium" className="bg-[#0F172A] text-white">Right Arm Medium</option>
                    <option value="right_arm_spin" className="bg-[#0F172A] text-white">Right Arm Spin</option>
                    <option value="left_arm_fast" className="bg-[#0F172A] text-white">Left Arm Fast</option>
                    <option value="left_arm_spin" className="bg-[#0F172A] text-white">Left Arm Spin</option>
                    <option value="none" className="bg-[#0F172A] text-white">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Mobile Number (Private)</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00F2FE] text-xs"
                  placeholder="+91 98765 43210"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full min-h-[42px] bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all active:scale-95"
              >
                <Check className="w-4 h-4" /> Save Profile Details
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
