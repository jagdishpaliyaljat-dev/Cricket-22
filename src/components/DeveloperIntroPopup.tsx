import React, { useEffect } from 'react';
import { Logo } from './Logo';
import { Award } from 'lucide-react';

export const developerInfo = {
  name: "ZD",
  designation: "Founder & Developer",
  photoUrl: "",
  introduction: "Welcome to LocalXI! This platform is built to make local cricket more accessible by bringing players, matches, and live cricket scores together in one place. Thank you for being part of our cricket community.",
};

interface DeveloperIntroPopupProps {
  onClose: () => void;
}

export const DeveloperIntroPopup: React.FC<DeveloperIntroPopupProps> = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-white/15 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl relative overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#00F2FE]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex justify-center mb-1 bg-[#131E32]/90 border border-white/10 py-2 px-4 rounded-2xl max-w-fit mx-auto shadow-sm">
          <Logo variant="full" className="h-7 text-white" />
        </div>

        {/* Developer Avatar / Photo */}
        <div className="relative w-20 h-20 mx-auto">
          {developerInfo.photoUrl ? (
            <img
              src={developerInfo.photoUrl}
              alt={developerInfo.name}
              className="w-full h-full rounded-full object-cover border-2 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.3)] bg-slate-800"
              onError={(e) => {
                // Fallback on error
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-800 border-2 border-[#00F2FE] flex items-center justify-center text-[#00F2FE] font-bold text-xl shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              ZD
            </div>
          )}
          <div className="absolute bottom-0 right-0 bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] text-[#0B1120] p-1 rounded-full shadow-sm">
            <Award className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Developer Details */}
        <div className="space-y-1">
          <h3 className="font-display font-black text-lg text-white tracking-tight">
            {developerInfo.name}
          </h3>
          <p className="text-xs font-bold text-[#00F2FE] uppercase tracking-wider">
            {developerInfo.designation}
          </p>
        </div>

        {/* Welcome Message */}
        <p className="text-xs text-slate-300 leading-relaxed px-2">
          &ldquo;{developerInfo.introduction}&rdquo;
        </p>

        {/* Footer Brand Tag */}
        <div className="pt-3 border-t border-white/10 text-[10px] font-mono text-slate-400 tracking-widest uppercase">
          LOCALXI — YOUR LOCAL CRICKET COMMUNITY
        </div>
      </div>
    </div>
  );
};
