import React from 'react';

export type TeamLogoType =
  | 'metro-challengers'
  | 'local-xi'
  | 'local-panthers'
  | 'coastal-titans'
  | 'youngsters-xi'
  | 'wolves-indore'
  | 'royal-strikers'
  | 'city-xi'
  | 'rising-stars'
  | 'thunder-xi';

interface TeamBadgeProps {
  teamNameOrKey: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const normalizeTeamKey = (name: string): TeamLogoType => {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('metro') || lower.includes('challenger')) return 'metro-challengers';
  if (lower.includes('panther')) return 'local-panthers';
  if (lower.includes('titan') || lower.includes('coastal')) return 'coastal-titans';
  if (lower.includes('youngster')) return 'youngsters-xi';
  if (lower.includes('wolf') || lower.includes('wolves')) return 'wolves-indore';
  if (lower.includes('royal') || lower.includes('striker')) return 'royal-strikers';
  if (lower.includes('city')) return 'city-xi';
  if (lower.includes('rising') || lower.includes('star')) return 'rising-stars';
  if (lower.includes('thunder')) return 'thunder-xi';
  return 'local-xi';
};

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  teamNameOrKey,
  size = 'md',
  className = '',
}) => {
  const key = normalizeTeamKey(teamNameOrKey);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  switch (key) {
    case 'metro-challengers':
    case 'local-panthers':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#001D14] border border-[#00D889]/60 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#04281E" stroke="#00D889" strokeWidth="2.5" />
            <path
              d="M26 38 C32 24, 46 22, 60 25 C72 28, 78 38, 76 52 C74 64, 62 76, 48 76 C36 76, 26 66, 24 54 C23 46, 25 41, 26 38 Z"
              fill="#063D2E"
            />
            {/* Glowing Panther Head Profile */}
            <path
              d="M74 38 L65 31 L58 35 L48 29 L42 35 L34 33 L30 42 L36 45 L28 50 L34 54 L26 60 L38 65 L46 62 L52 70 L60 66 L66 70 L72 60 L68 54 L76 48 Z"
              fill="#00D889"
              stroke="#A8FF00"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Snarl details & eye */}
            <circle cx="48" cy="40" r="3" fill="#FFFFFF" />
            <circle cx="49" cy="40" r="1.5" fill="#002A1D" />
            {/* Fangs */}
            <path d="M38 52 L35 58 L42 54 Z" fill="#FFFFFF" />
            <path d="M48 54 L46 60 L52 56 Z" fill="#FFFFFF" />
            <path d="M58 56 L60 62 L64 57 Z" fill="#FFFFFF" />
          </svg>
        </div>
      );

    case 'local-xi':
      return (
        <div className={`relative shrink-0 flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
            {/* Crest Shield */}
            <path
              d="M50 8 L84 20 C84 55, 68 78, 50 92 C32 78, 16 55, 16 20 Z"
              fill="#181308"
              stroke="#EAB308"
              strokeWidth="2.5"
            />
            {/* Inner Shield */}
            <path
              d="M50 14 L78 24 C78 52, 64 72, 50 84 C36 72, 22 52, 22 24 Z"
              fill="#0A0804"
            />
            {/* Crossed Cricket Bats */}
            <path
              d="M32 24 L68 64 L64 68 L28 28 Z"
              fill="#D97706"
              stroke="#FDE68A"
              strokeWidth="1"
            />
            <path
              d="M68 24 L28 64 L32 68 L72 28 Z"
              fill="#D97706"
              stroke="#FDE68A"
              strokeWidth="1"
            />
            {/* Cricket Ball */}
            <circle cx="50" cy="46" r="13" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
            <path
              d="M40 46 C44 41, 56 41, 60 46"
              stroke="#FEF08A"
              strokeWidth="1.5"
              strokeDasharray="2,2"
            />
            {/* LOCAL XI Banner */}
            <rect x="22" y="68" width="56" height="15" rx="3" fill="#D97706" stroke="#FEF08A" strokeWidth="1" />
            <text
              x="50"
              y="79"
              textAnchor="middle"
              fill="#181308"
              fontSize="8.5"
              fontFamily="sans-serif"
              fontWeight="900"
              letterSpacing="0.5"
            >
              LOCAL XI
            </text>
          </svg>
        </div>
      );

    case 'coastal-titans':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#031525] border border-[#38BDF8]/60 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Outer Blue Shield */}
            <path
              d="M50 10 L82 24 C82 58, 66 78, 50 90 C34 78, 18 58, 18 24 Z"
              fill="#082F49"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
            {/* Spartan Helmet Head */}
            <path
              d="M50 20 C62 20, 72 28, 72 44 L70 66 L58 66 L56 50 L44 50 L42 66 L30 66 L28 44 C28 28, 38 20, 50 20 Z"
              fill="#0284C7"
              stroke="#BAE6FD"
              strokeWidth="1.5"
            />
            {/* Crest Plume */}
            <path
              d="M48 12 C48 12, 50 18, 50 22 C50 18, 52 12, 52 12 C52 12, 60 14, 64 24 L36 24 C40 14, 48 12, 48 12 Z"
              fill="#38BDF8"
            />
            {/* Visor & T-Slit */}
            <path d="M38 42 L62 42 L52 56 L48 56 Z" fill="#0C4A6E" />
            {/* Eye glow */}
            <rect x="42" y="44" width="6" height="2" rx="1" fill="#FFFFFF" />
            <rect x="52" y="44" width="6" height="2" rx="1" fill="#FFFFFF" />
          </svg>
        </div>
      );

    case 'youngsters-xi':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#2A1502] border border-[#F59E0B]/70 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#451A03" stroke="#F59E0B" strokeWidth="2.5" />
            {/* Lion Mane */}
            <path
              d="M50 16 L58 24 L68 20 L72 30 L82 34 L80 44 L86 52 L80 60 L82 70 L72 74 L68 84 L58 80 L50 88 L42 80 L32 84 L28 74 L18 70 L20 60 L14 52 L20 44 L18 34 L28 30 L32 20 L42 24 Z"
              fill="#D97706"
            />
            {/* Lion Face */}
            <path
              d="M34 40 C34 32, 66 32, 66 40 C66 56, 58 68, 50 72 C42 68, 34 56, 34 40 Z"
              fill="#FDE68A"
            />
            {/* Eyes */}
            <polygon points="40,44 46,46 42,48" fill="#78350F" />
            <polygon points="60,44 54,46 58,48" fill="#78350F" />
            {/* Snout & Nose */}
            <polygon points="47,56 53,56 50,60" fill="#78350F" />
            <path d="M50 60 L50 64 M46 64 C48 66, 52 66, 54 64" stroke="#78350F" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'wolves-indore':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#05192D] border border-[#60A5FA]/70 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#0F172A" stroke="#60A5FA" strokeWidth="2.5" />
            {/* Wolf Ears & Head */}
            <path
              d="M50 20 L62 30 L74 22 L70 42 L80 50 L72 62 L74 76 L60 74 L50 84 L40 74 L26 76 L28 62 L20 50 L30 42 L26 22 L38 30 Z"
              fill="#1E293B"
              stroke="#93C5FD"
              strokeWidth="1.5"
            />
            {/* Inner Face & Fur */}
            <path
              d="M50 36 L62 46 L58 64 L50 72 L42 64 L38 46 Z"
              fill="#E2E8F0"
            />
            {/* Glowing Eyes */}
            <polygon points="42,48 48,50 44,53" fill="#38BDF8" />
            <polygon points="58,48 52,50 56,53" fill="#38BDF8" />
            {/* Nose */}
            <polygon points="47,62 53,62 50,66" fill="#0F172A" />
          </svg>
        </div>
      );

    case 'royal-strikers':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#200508] border border-[#EF4444]/70 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#1C0A0D" stroke="#EF4444" strokeWidth="2.5" />
            {/* Red Crest / Plume */}
            <path
              d="M50 10 C56 10, 62 14, 64 22 L36 22 C38 14, 44 10, 50 10 Z"
              fill="#EF4444"
            />
            {/* Red Spartan Helmet */}
            <path
              d="M50 22 C64 22, 74 32, 74 48 L72 68 L60 68 L56 52 L44 52 L40 68 L28 68 L26 48 C26 32, 36 22, 50 22 Z"
              fill="#991B1B"
              stroke="#FCA5A5"
              strokeWidth="1.5"
            />
            {/* Eye Slits Glowing Red */}
            <polygon points="38,44 48,46 48,48 38,46" fill="#FEE2E2" />
            <polygon points="62,44 52,46 52,48 62,46" fill="#FEE2E2" />
            {/* Nose guard */}
            <path d="M48 42 L52 42 L51 54 L49 54 Z" fill="#7F1D1D" />
          </svg>
        </div>
      );

    case 'city-xi':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#271502] border border-[#F59E0B]/70 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#1C1004" stroke="#F59E0B" strokeWidth="2.5" />
            {/* Tiger Face Circular badge */}
            <circle cx="50" cy="50" r="38" fill="#D97706" />
            {/* Black Tiger Stripes */}
            <path d="M50 18 L48 28 L52 28 Z" fill="#18181B" />
            <path d="M38 24 L44 32 L40 34 Z" fill="#18181B" />
            <path d="M62 24 L56 32 L60 34 Z" fill="#18181B" />
            <path d="M24 40 L36 44 L34 48 Z" fill="#18181B" />
            <path d="M76 40 L64 44 L66 48 Z" fill="#18181B" />
            {/* Cheeks and Muzzle */}
            <path
              d="M36 56 C36 48, 64 48, 64 56 C64 68, 56 74, 50 74 C44 74, 36 68, 36 56 Z"
              fill="#FEF3C7"
            />
            {/* Piercing Green Eyes */}
            <polygon points="38,44 46,46 42,48" fill="#10B981" />
            <polygon points="62,44 54,46 58,48" fill="#10B981" />
            {/* Snout & Whiskers */}
            <polygon points="46,60 54,60 50,64" fill="#18181B" />
            <path d="M30 64 L44 63 M70 64 L56 63" stroke="#FEF3C7" strokeWidth="1" />
          </svg>
        </div>
      );

    case 'rising-stars':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#1A180E] border border-[#F59E0B]/80 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#29200B" stroke="#FBBF24" strokeWidth="2.5" />
            {/* Eagle Head with White Crest & Golden Beak */}
            <path
              d="M32 64 C32 40, 44 26, 68 24 C72 34, 76 44, 82 50 L68 54 L60 66 Z"
              fill="#FFFFFF"
            />
            {/* Golden Beak */}
            <path
              d="M68 46 L86 52 C84 62, 74 66, 66 64 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1"
            />
            {/* Eagle Eye */}
            <circle cx="56" cy="42" r="3.5" fill="#F59E0B" />
            <circle cx="57" cy="42" r="2" fill="#000000" />
            {/* Feathers */}
            <path d="M30 60 L38 68 L28 72 Z" fill="#D97706" />
            <path d="M40 68 L48 76 L38 80 Z" fill="#D97706" />
          </svg>
        </div>
      );

    case 'thunder-xi':
      return (
        <div className={`relative shrink-0 flex items-center justify-center rounded-full bg-[#03152B] border border-[#38BDF8]/80 p-0.5 shadow-md ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" fill="#0C2548" stroke="#38BDF8" strokeWidth="2.5" />
            {/* Electric Glow */}
            <circle cx="50" cy="50" r="36" fill="#0369A1" opacity="0.4" />
            {/* Neon Yellow Lightning Bolt */}
            <polygon
              points="54,16 32,52 48,52 40,84 68,44 52,44"
              fill="#FACC15"
              stroke="#FEF08A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
  }
};
