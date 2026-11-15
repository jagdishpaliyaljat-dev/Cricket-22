import React, { useState, useEffect, useRef } from 'react';
import { Player, PlayingRole, BattingStyle, BowlingStyle } from '../types/cricket';
import { updatePlayer } from '../services/playerService';
import { ArrowLeft, Camera, Phone, MapPin, ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';

interface EditProfileViewProps {
  player: Player;
  onBack: () => void;
  onSaveSuccess: (updatedPlayer: Player) => void;
  focusBio?: boolean;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  player,
  onBack,
  onSaveSuccess,
  focusBio = false,
}) => {
  // Form State initialized with player's existing values or reference defaults
  const [fullName, setFullName] = useState(player.fullName || 'Amit Patel');
  const [playingRole, setPlayingRole] = useState<PlayingRole>(
    player.playingRole || 'batting_allrounder'
  );
  const [battingStyle, setBattingStyle] = useState<BattingStyle>(
    player.battingStyle || 'right_hand_bat'
  );
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>(
    player.bowlingStyle || 'right_arm_spin'
  );
  const [mobileNumber, setMobileNumber] = useState(
    player.mobileNumber || '+91 98765 43210'
  );
  const [location, setLocation] = useState(player.location || 'Indore');
  const [bio, setBio] = useState(
    player.bio ||
      'A passionate cricketer who enjoys both batting and bowling. Always ready to play and contribute to the team.'
  );
  const [photoUrl, setPhotoUrl] = useState(
    player.photoUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&h=250&q=80'
  );

  // Status & modal states
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const bioInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusBio && bioInputRef.current) {
      bioInputRef.current.focus();
      bioInputRef.current.selectionStart = bioInputRef.current.value.length;
    }
  }, [focusBio]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const updates: Partial<Player> = {
      fullName: fullName.trim(),
      playingRole,
      battingStyle,
      bowlingStyle,
      mobileNumber: mobileNumber.trim(),
      location: location.trim(),
      bio: bio.trim(),
      photoUrl,
    };

    try {
      await updatePlayer(player.id, updates);
      const updatedPlayer: Player = {
        ...player,
        ...updates,
      };
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onSaveSuccess(updatedPlayer);
      }, 500);
    } catch (err: any) {
      console.warn('Could not save to Firebase, updating locally:', err);
      // Fallback update locally so the user experience is smooth even in offline preview
      const updatedPlayer: Player = {
        ...player,
        ...updates,
      };
      setSuccessMsg('Profile updated locally!');
      setTimeout(() => {
        onSaveSuccess(updatedPlayer);
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-12 text-slate-100 animate-in fade-in duration-150 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 pb-1 border-b border-white/10 pb-2">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-slate-100 hover:text-[#00F2FE] rounded-lg transition-colors cursor-pointer"
          title="Back to Profile"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="font-sans font-bold text-base sm:text-lg text-slate-100 text-center">
          Edit Profile
        </h1>

        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] font-black shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:opacity-95 text-white font-bold text-xs px-4 py-1.5 rounded-full cursor-pointer shadow-xs transition-all flex items-center gap-1 active:scale-95 disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save</span>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30/10 border border-[#D94343] text-[#EF4444] text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30/10 border border-[#21864A] text-emerald-400 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Photo */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="relative">
          <img
            src={photoUrl}
            alt={fullName}
            className="w-24 h-24 rounded-full object-cover border-2 border-[#00F2FE] shadow-md bg-[#00F2FE]/10"
          />
          <button
            type="button"
            onClick={() => setShowPhotoPicker(true)}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#00F2FE] text-[#0B1120] text-white flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-xs"
            title="Change Photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Form */}
      <form onSubmit={handleSave} className="space-y-3.5 text-xs">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium block">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Amit Patel"
            className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-[#718096] focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs"
          />
        </div>

        {/* Playing Role */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium block">
            Playing Role
          </label>
          <div className="relative">
            <select
              value={playingRole}
              onChange={(e) => setPlayingRole(e.target.value as PlayingRole)}
              className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 appearance-none pr-9 focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs cursor-pointer"
            >
              <option value="batting_allrounder">All Rounder</option>
              <option value="top_order_batter">Top Order Batter</option>
              <option value="middle_order_batter">Middle Order Batter</option>
              <option value="wicketkeeper_batter">Wicketkeeper Batter</option>
              <option value="pace_bowler">Pace Bowler</option>
              <option value="spin_bowler">Spin Bowler</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Batting & Bowling Style */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium block">
              Batting Style
            </label>
            <div className="relative">
              <select
                value={battingStyle}
                onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
                className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 appearance-none pr-8 focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs cursor-pointer truncate"
              >
                <option value="right_hand_bat">Right Hand Bat</option>
                <option value="left_hand_bat">Left Hand Bat</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium block">
              Bowling Style
            </label>
            <div className="relative">
              <select
                value={bowlingStyle}
                onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
                className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 appearance-none pr-8 focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs cursor-pointer truncate"
              >
                <option value="right_arm_spin">Right Arm Off Spin</option>
                <option value="right_arm_fast">Right Arm Fast</option>
                <option value="right_arm_medium">Right Arm Medium</option>
                <option value="left_arm_spin">Left Arm Spin</option>
                <option value="left_arm_fast">Left Arm Fast</option>
                <option value="none">None</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium block">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-[#718096] focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium block">
            Location
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Indore"
              className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-[#718096] focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs"
            />
          </div>
        </div>

        {/* About Me */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium block">
            About Me
          </label>
          <textarea
            ref={bioInputRef}
            rows={3}
            maxLength={200}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your cricket teammates about your style and passion..."
            className="w-full bg-[#131E32]/80 border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-[#718096] focus:outline-none focus:border-[#00F2FE] transition-colors shadow-xs leading-relaxed resize-none"
          />
          <div className="text-[10px] text-slate-400 text-right">
            {bio.length}/200
          </div>
        </div>
      </form>

      {/* Photo Picker Modal */}
      {showPhotoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#131E32]/80 border border-white/10 rounded-2xl w-full max-w-sm p-4 text-slate-100 space-y-3.5 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100">Select Profile Photo</h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Image Web URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-2">Preset Cricket Avatars:</span>
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
                    onClick={() => setPhotoUrl(preset)}
                    className={`rounded-full overflow-hidden border-2 cursor-pointer ${
                      photoUrl === preset ? 'border-[#00F2FE]' : 'border-transparent'
                    }`}
                  >
                    <img src={preset} alt="preset" className="w-11 h-11 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPhotoPicker(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-[#00F2FE]/10 border border-white/10 text-slate-100 rounded-xl cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
