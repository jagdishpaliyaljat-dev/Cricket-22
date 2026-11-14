import React, { useState } from 'react';
import { Player } from '../types/cricket';
import {
  User,
  BarChart2,
  Trophy,
  Award,
  Calendar,
  MapPin,
  Users,
  Edit3,
  Camera,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { NotificationsModal } from './NotificationsModal';
import { Logo } from './Logo';
import { requestPushPermission } from '../services/pushNotificationService';
import { Check, ShieldAlert } from 'lucide-react';


interface MyProfileViewProps {
  player: Player;
  onEditProfile: (focusBio?: boolean) => void;
  onOpenStats: (tab?: 'overview' | 'batting' | 'bowling' | 'recent') => void;
  onUpdatePhoto?: (photoUrl: string) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  player,
  onEditProfile,
  onOpenStats,
  onUpdatePhoto,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Real player career statistics (0 defaults for new player)
  const career = player.career || ({} as any);
  const matchesCount = career.matches ?? 0;
  const runsCount = career.runs ?? 0;
  const wicketsCount = career.wickets ?? 0;
  const fiftiesCount = career.fifties ?? 0;

  const fullName = player.fullName || 'Cricket Player';
  const roleDisplay = player.playingRole
    ? player.playingRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Club Player';

  const battingStyleDisplay = player.battingStyle?.includes('left')
    ? 'Left Hand Bat'
    : 'Right Hand Bat';

  const bowlingStyleDisplay = player.bowlingStyle?.includes('left_arm_spin')
    ? 'Left Arm Spin'
    : player.bowlingStyle?.includes('left_arm_fast')
    ? 'Left Arm Fast'
    : player.bowlingStyle?.includes('fast')
    ? 'Right Arm Fast'
    : player.bowlingStyle?.includes('medium')
    ? 'Right Arm Medium'
    : player.bowlingStyle?.includes('spin')
    ? 'Right Arm Spin'
    : 'Right Arm Medium';

  const joinedDisplay = player.registrationDate
    ? new Date(player.registrationDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Member';

  const locationDisplay = player.location || '—';
  const teamDisplay = player.teamName || '—';
  const bioDisplay =
    player.bio ||
    'No bio added yet. Tap Edit Profile to describe your cricketing role and playing journey.';

  const avatarUrl =
    player.photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&h=250&q=80';

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhotoUrl.trim() && onUpdatePhoto) {
      onUpdatePhoto(newPhotoUrl.trim());
      setShowPhotoModal(false);
      setNewPhotoUrl('');
    }
  };

  return (
    <div className="space-y-3.5 max-w-md mx-auto px-4 pb-12 text-[#172033] animate-in fade-in duration-150 font-sans">
      {/* ========================================================
          PROFILE HERO CARD (Primary Blue Brand Surface)
         ======================================================== */}
      <div className="relative bg-[#1554B8] text-white border border-[#0B3F91] rounded-2xl p-4.5 shadow-md overflow-hidden">
        {/* Atmospheric subtle glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2878E5]/30 via-[#1554B8]/80 to-[#0B3F91] pointer-events-none" />

        {/* Top-right badges & buttons */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
          <span className="bg-white text-[#1554B8] font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
            Available
          </span>
          <button
            onClick={() => onEditProfile()}
            className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shadow-xs"
            title="Edit Profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 flex items-center gap-3.5 pr-20">
          {/* Circular avatar with attached camera button */}
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md bg-[#EAF2FF]"
            />
            <button
              onClick={() => setShowPhotoModal(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-[#1554B8] border border-[#DFE7F2] flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-xs"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Name, Role & Style */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="font-sans font-bold text-lg text-white leading-tight truncate uppercase">
              {fullName}
            </h2>

            <div className="flex items-center gap-1 text-[#EAF2FF] text-xs font-semibold">
              <User className="w-3.5 h-3.5 shrink-0 stroke-[2.4]" />
              <span className="truncate">{roleDisplay}</span>
            </div>

            <p className="text-[11px] text-[#EAF2FF]/80 font-medium truncate pt-0.5">
              {battingStyleDisplay} • {bowlingStyleDisplay}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================
          C. CAREER STATISTICS (4 Equal Columns in Single Card)
         ======================================================== */}
      <div
        onClick={() => onOpenStats('batting')}
        className="bg-white hover:bg-[#F2F6FC] border border-[#DFE7F2] rounded-2xl p-3 shadow-xs grid grid-cols-4 gap-1 text-center transition-all cursor-pointer group hover:border-[#1554B8]"
        title="View Detailed Career Statistics"
      >
        {/* Column 1: Matches */}
        <div className="space-y-1">
          <User className="w-4 h-4 text-[#1554B8] mx-auto stroke-[2.2]" />
          <div className="font-sans font-bold text-lg sm:text-xl text-[#172033] leading-none">
            {matchesCount}
          </div>
          <div className="text-[10px] text-[#718096] font-medium leading-none">
            Matches
          </div>
        </div>

        {/* Column 2: Runs */}
        <div className="space-y-1">
          <BarChart2 className="w-4 h-4 text-[#1554B8] mx-auto stroke-[2.2]" />
          <div className="font-sans font-bold text-lg sm:text-xl text-[#172033] leading-none">
            {runsCount}
          </div>
          <div className="text-[10px] text-[#718096] font-medium leading-none">
            Runs
          </div>
        </div>

        {/* Column 3: Wickets */}
        <div className="space-y-1">
          <Trophy className="w-4 h-4 text-[#1554B8] mx-auto stroke-[2.2]" />
          <div className="font-sans font-bold text-lg sm:text-xl text-[#172033] leading-none">
            {wicketsCount}
          </div>
          <div className="text-[10px] text-[#718096] font-medium leading-none">
            Wickets
          </div>
        </div>

        {/* Column 4: Fifties */}
        <div className="space-y-1">
          <Award className="w-4 h-4 text-[#1554B8] mx-auto stroke-[2.2]" />
          <div className="font-sans font-bold text-lg sm:text-xl text-[#172033] leading-none">
            {fiftiesCount}
          </div>
          <div className="text-[10px] text-[#718096] font-medium leading-none">
            Fifties
          </div>
        </div>
      </div>

      {/* ========================================================
          D. BATTING AND BOWLING STYLE CARDS (Side by side)
         ======================================================== */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Batting Style Card */}
        <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center shrink-0 text-[#1554B8]">
            <svg
              className="w-4.5 h-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.5 4.5l-2-2a1.5 1.5 0 00-2.12 0L9.5 8.38l-4.24 4.24a3 3 0 000 4.24l1.41 1.41a3 3 0 004.24 0l4.24-4.24 5.88-5.88a1.5 1.5 0 000-2.12z" />
              <path d="M14 6l4 4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-[#718096] font-medium leading-tight">
              Batting Style
            </div>
            <div className="font-bold text-xs text-[#172033] truncate mt-0.5">
              {battingStyleDisplay}
            </div>
          </div>
        </div>

        {/* Bowling Style Card */}
        <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] border border-[#DFE7F2] flex items-center justify-center shrink-0 text-[#1554B8]">
            <svg
              className="w-4.5 h-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 000 18" strokeDasharray="2 2" />
              <path d="M7 6c2 3 2 9 0 12" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-[#718096] font-medium leading-tight">
              Bowling Style
            </div>
            <div className="font-bold text-xs text-[#172033] truncate mt-0.5">
              {bowlingStyleDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          E. PLAYER INFORMATION CARD (Joined, Location, Team)
         ======================================================== */}
      <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3 shadow-xs grid grid-cols-3 gap-2">
        {/* Joined */}
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-[#1554B8] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <div className="text-[10px] text-[#718096] font-medium leading-tight">
              Joined
            </div>
            <div className="font-bold text-xs text-[#172033] truncate mt-0.5">
              {joinedDisplay}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 min-w-0 border-l border-[#DFE7F2] pl-2">
          <MapPin className="w-4 h-4 text-[#1554B8] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <div className="text-[10px] text-[#718096] font-medium leading-tight">
              Location
            </div>
            <div className="font-bold text-xs text-[#172033] truncate mt-0.5">
              {locationDisplay}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="flex items-center gap-2 min-w-0 border-l border-[#DFE7F2] pl-2">
          <Users className="w-4 h-4 text-[#1554B8] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <div className="text-[10px] text-[#718096] font-medium leading-tight">
              Team
            </div>
            <div className="font-bold text-xs text-[#172033] truncate mt-0.5">
              {teamDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          F. ABOUT ME CARD (Heading, Person icon, Edit icon, Bio)
         ======================================================== */}
      <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3.5 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#1554B8] stroke-[2.2]" />
            <h3 className="font-sans font-bold text-xs text-[#172033]">
              About Me
            </h3>
          </div>
          <button
            onClick={() => onEditProfile(true)}
            className="text-[#718096] hover:text-[#1554B8] transition-colors p-1 cursor-pointer"
            title="Edit Biography"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-[#718096] leading-relaxed">
          {bioDisplay}
        </p>
      </div>

      {/* ========================================================
          G. SETTINGS & PREFERENCES
         ======================================================== */}
      <div className="bg-white border border-[#DFE7F2] rounded-2xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1554B8] stroke-[2.2]" />
          <h3 className="font-sans font-bold text-xs text-[#172033]">
            Preferences
          </h3>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-[#F2F6FC] rounded-xl border border-[#DFE7F2]/50">
          <div className="min-w-0">
            <div className="font-bold text-xs text-[#172033]">Push Notifications</div>
            <p className="text-[10px] text-[#718096] mt-0.5">Stay updated on match results and profile updates.</p>
          </div>
          <button
            onClick={() => requestPushPermission()}
            className="px-3 py-1.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold text-[10px] rounded-lg cursor-pointer shadow-xs transition-colors"
          >
            Enable
          </button>
        </div>
      </div>


      {/* Notifications Modal */}
      <NotificationsModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* Change Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#DFE7F2] rounded-2xl w-full max-w-sm p-4 text-[#172033] space-y-3.5 shadow-2xl">
            <h3 className="font-bold text-sm text-[#172033]">Change Profile Photo</h3>
            <form onSubmit={handleSavePhoto} className="space-y-3 text-xs">
              <div>
                <label className="text-[#718096] block mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="w-full bg-[#F2F6FC] border border-[#DFE7F2] rounded-xl px-3 py-2 text-[#172033] focus:outline-none focus:border-[#1554B8]"
                />
              </div>

              {/* Sample avatar presets */}
              <div>
                <span className="text-[10.5px] text-[#718096] block mb-1.5">Or choose a preset avatar:</span>
                <div className="flex gap-2">
                  {[
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&h=250&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&h=250&q=80',
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&h=250&q=80',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&h=250&q=80',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewPhotoUrl(preset)}
                      className="rounded-full overflow-hidden border-2 border-transparent hover:border-[#1554B8] cursor-pointer"
                    >
                      <img src={preset} alt="preset" className="w-10 h-10 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-3 py-1.5 bg-[#F2F6FC] hover:bg-[#EAF2FF] border border-[#DFE7F2] text-[#172033] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#1554B8] hover:bg-[#0B3F91] text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
