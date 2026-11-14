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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#DFE7F2] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col text-[#172033]">
        {/* Profile Header */}
        <div className="bg-[#1554B8] text-white p-3.5 sm:p-4.5 border-b border-[#0B3F91] relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer border border-white/20 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 sm:gap-3.5 pr-7 sm:pr-8">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.fullName}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white shadow-md shrink-0 bg-[#EAF2FF]"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-white flex items-center justify-center text-[#1554B8] text-lg sm:text-xl font-bold shadow-md shrink-0">
                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.fullName.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1 truncate">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-sans font-bold text-base sm:text-lg text-white tracking-tight truncate max-w-[170px] xs:max-w-none">
                  {player.fullName}
                </h2>
                {player.career.potmAwards > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/20 shrink-0">
                    <Award className="w-3 h-3" />
                    {player.career.potmAwards} POTM
                  </span>
                )}
              </div>

              <div className="text-xs text-[#EAF2FF] capitalize mt-0.5 truncate font-medium">
                {player.playingRole.replace(/_/g, ' ')}
              </div>

              <div className="text-[11px] text-[#EAF2FF]/80 font-mono mt-0.5 truncate">
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
                    ? 'bg-white text-[#1554B8] shadow-xs'
                    : 'bg-white/10 text-[#EAF2FF] hover:text-white border border-white/15'
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
                    ? 'bg-white text-[#1554B8] shadow-xs'
                    : 'bg-white/10 text-[#EAF2FF] hover:text-white border border-white/15'
                }`}
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs bg-[#F2F6FC]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Matches</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">{career.matches}</div>
                </div>
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#1554B8] font-bold uppercase tracking-wider">Total Runs</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#1554B8] mt-0.5">{career.runs}</div>
                </div>
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Wickets</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">{career.wickets}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Bat Avg</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#172033] mt-0.5">{battingAvg}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Strike Rate</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#1554B8] mt-0.5">{strikeRate}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Economy</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#172033] mt-0.5">{bowlingEcon}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#DFE7F2] shadow-xs">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Bowl Avg</div>
                  <div className="font-mono font-bold text-sm sm:text-base text-[#1554B8] mt-0.5">{bowlingAvg}</div>
                </div>
              </div>

              {canViewPII && (
                <div className="bg-white p-3 rounded-xl border border-[#DFE7F2] space-y-1.5 shadow-xs">
                  <div className="text-[11px] font-bold text-[#1554B8] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#1554B8]" /> Private Contact Details
                  </div>
                  <div className="flex flex-wrap gap-4 text-[#172033] font-mono text-xs pt-0.5">
                    {player.mobileNumber && (
                      <span className="flex items-center gap-1 text-[#718096]">
                        <Phone className="w-3 h-3 text-[#1554B8]" /> {player.mobileNumber}
                      </span>
                    )}
                    {player.dob && (
                      <span className="flex items-center gap-1 text-[#718096]">
                        <Calendar className="w-3 h-3 text-[#1554B8]" /> DOB: {player.dob}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATTING */}
          {activeTab === 'batting' && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#DFE7F2] space-y-3 shadow-xs">
              <div className="flex items-center justify-between font-bold text-[#172033]">
                <span className="text-xs uppercase tracking-wider text-[#1554B8]">Career Batting Record</span>
                <span className="font-mono text-[11px] text-[#718096]">
                  {career.innings} Inns ({career.notOuts} NO)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Runs</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">{career.runs}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">HS</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">{career.highestScore}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Average</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#1554B8] mt-0.5">{battingAvg}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Strike Rate</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#1554B8] mt-0.5">{strikeRate}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#DFE7F2] flex items-center justify-between text-xs text-[#718096] font-mono">
                <span>Balls: {career.ballsFaced}</span>
                <span>4s: {career.fours}</span>
                <span>6s: {career.sixes}</span>
              </div>
            </div>
          )}

          {/* TAB 3: BOWLING */}
          {activeTab === 'bowling' && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#DFE7F2] space-y-3 shadow-xs">
              <div className="flex items-center justify-between font-bold text-[#172033]">
                <span className="text-xs uppercase tracking-wider text-[#1554B8]">Career Bowling Record</span>
                <span className="font-mono text-[11px] text-[#718096]">
                  {career.oversBowled} Overs ({career.ballsBowled} Balls)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Wickets</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">{career.wickets}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Best Figures</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#172033] mt-0.5">
                    {career.bestBowlingWickets > 0 ? `${career.bestBowlingWickets}/${career.bestBowlingRuns}` : '—'}
                  </div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Economy</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#1554B8] mt-0.5">{bowlingEcon}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Average</div>
                  <div className="font-mono font-bold text-lg sm:text-xl text-[#1554B8] mt-0.5">{bowlingAvg}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#DFE7F2] flex items-center justify-between text-xs text-[#718096] font-mono">
                <span>Runs Conceded: {career.runsConceded}</span>
                <span>Overs Bowled: {career.oversBowled}</span>
              </div>
            </div>
          )}

          {/* TAB 4: FIELDING */}
          {activeTab === 'fielding' && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#DFE7F2] space-y-3 shadow-xs">
              <div className="font-bold text-[#1554B8] text-xs uppercase tracking-wider">Fielding Statistics</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Catches</div>
                  <div className="font-mono font-bold text-xl text-[#172033] mt-0.5">{career.catches}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Run Outs</div>
                  <div className="font-mono font-bold text-xl text-[#172033] mt-0.5">{career.runOuts}</div>
                </div>
                <div className="bg-[#F2F6FC] p-2.5 rounded-xl border border-[#DFE7F2]">
                  <div className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Matches</div>
                  <div className="font-mono font-bold text-xl text-[#1554B8] mt-0.5">{career.matches}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MATCH HISTORY */}
          {activeTab === 'matches' && (
            <div className="space-y-2">
              {matchHistory.length === 0 ? (
                <div className="text-center py-8 text-[#718096] italic text-xs bg-white rounded-2xl border border-[#DFE7F2]">
                  No finalized matches recorded for this player yet.
                </div>
              ) : (
                matchHistory.map((stat) => (
                  <div
                    key={stat.id}
                    className="bg-white p-3 rounded-2xl border border-[#DFE7F2] flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-[#172033] text-xs">
                        Match #{stat.matchId.replace('match_', '')}
                      </div>
                      <div className="text-[11px] text-[#718096] font-mono">
                        {stat.dismissalStatus}
                      </div>
                    </div>

                    <div className="font-mono text-right text-xs">
                      <div>
                        Bat: <strong className="text-[#172033]">{stat.battingRuns}</strong> ({stat.ballsFaced})
                      </div>
                      <div className="text-[#1554B8] text-[11px] font-bold">
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
            <form onSubmit={handleSaveProfile} className="space-y-3 bg-white p-4 rounded-2xl border border-[#DFE7F2] shadow-xs">
              <div>
                <label className="text-xs text-[#718096] font-medium block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] focus:outline-none focus:border-[#1554B8] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#718096] font-medium block mb-1">Playing Role</label>
                  <select
                    value={playingRole}
                    onChange={(e) => setPlayingRole(e.target.value as PlayingRole)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] capitalize focus:outline-none focus:border-[#1554B8] text-xs cursor-pointer"
                  >
                    <option value="top_order_batter">Top Order Batter</option>
                    <option value="middle_order_batter">Middle Order Batter</option>
                    <option value="wicketkeeper_batter">Wicketkeeper Batter</option>
                    <option value="batting_allrounder">Batting Allrounder</option>
                    <option value="bowling_allrounder">Bowling Allrounder</option>
                    <option value="pace_bowler">Pace Bowler</option>
                    <option value="spin_bowler">Spin Bowler</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#718096] font-medium block mb-1">Jersey Number</label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono focus:outline-none focus:border-[#1554B8] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#718096] font-medium block mb-1">Batting Style</label>
                  <select
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] capitalize focus:outline-none focus:border-[#1554B8] text-xs cursor-pointer"
                  >
                    <option value="right_hand_bat">Right Hand Bat</option>
                    <option value="left_hand_bat">Left Hand Bat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#718096] font-medium block mb-1">Bowling Style</label>
                  <select
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
                    className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] capitalize focus:outline-none focus:border-[#1554B8] text-xs cursor-pointer"
                  >
                    <option value="right_arm_fast">Right Arm Fast</option>
                    <option value="right_arm_medium">Right Arm Medium</option>
                    <option value="right_arm_spin">Right Arm Spin</option>
                    <option value="left_arm_fast">Left Arm Fast</option>
                    <option value="left_arm_spin">Left Arm Spin</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#718096] font-medium block mb-1">Mobile Number (Private)</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] font-mono focus:outline-none focus:border-[#1554B8] text-xs"
                  placeholder="+91 98765 43210"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full min-h-[42px] bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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
