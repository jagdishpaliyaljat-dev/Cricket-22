import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "w-8 h-8", 
  variant = 'full',
  showText
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'main-settings'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().logoUrl) {
        setLogoUrl(docSnap.data().logoUrl);
      }
    }, (error) => {
      console.warn('Logo settings fetch failed (network or permissions):', error);
      // Fallback is already handled by SVG rendering when logoUrl is null
    });
    return () => unsub();
  }, []);

  const renderText = showText ?? (variant === 'full');

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {logoUrl ? (
        <img src={logoUrl} alt="LocalXI Logo" className="w-full h-full object-contain shrink-0" referrerPolicy="no-referrer" />
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="h-full aspect-square shrink-0 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lxiBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            <linearGradient id="lxiSwoosh" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="60%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>

            <linearGradient id="lxiCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            <linearGradient id="lxiBallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>

            <filter id="lxiGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Shield / Badge Background */}
          <path
            d="M 50 4 L 88 18 C 88 56 74 84 50 96 C 26 84 12 56 12 18 Z"
            fill="url(#lxiBgGrad)"
            stroke="#60A5FA"
            strokeWidth="2.5"
          />

          {/* Inner Accent Ring Arc */}
          <path
            d="M 22 28 C 30 18, 70 18, 78 28 C 86 50, 72 78, 50 88 C 28 78, 14 50, 22 28 Z"
            fill="none"
            stroke="url(#lxiCyanGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />

          {/* Dynamic Speed Swoosh behind batsman */}
          <path
            d="M 18 68 Q 40 92 82 48 Q 52 74 24 62 Z"
            fill="url(#lxiSwoosh)"
            filter="url(#lxiGlow)"
          />

          {/* Batsman Figure Silhouette */}
          <g fill="#FFFFFF">
            {/* Helmet / Head */}
            <circle cx="48" cy="30" r="4.5" />
            
            {/* Visor / Helmet detail */}
            <path d="M 50 28 L 54 29 L 51 31 Z" fill="#38BDF8" />

            {/* Torso & Arms in Power Shot Swing */}
            <path
              d="M 46 35 L 56 37 L 62 46 L 56 48 L 48 40 L 44 45 L 42 38 Z"
            />

            {/* Legs - Front stride and back leg flex */}
            <path
              d="M 48 40 L 54 58 L 50 68 L 45 68 L 48 56 L 43 45 Z"
            />
            <path
              d="M 43 42 L 35 56 L 30 65 L 26 64 L 32 54 L 38 41 Z"
            />

            {/* Pads & Gloves Highlights */}
            <path d="M 50 58 L 54 58 L 51 68 L 47 68 Z" fill="#E0F2FE" />
          </g>

          {/* Cricket Bat in Swing */}
          <path
            d="M 60 44 L 78 26 L 82 29 L 63 48 Z"
            fill="url(#lxiCyanGrad)"
            stroke="#FFFFFF"
            strokeWidth="0.8"
          />

          {/* Bat Handle */}
          <path
            d="M 58 45 L 53 49"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Flying Cricket Ball */}
          <circle cx="82" cy="22" r="3.5" fill="url(#lxiBallGrad)" stroke="#FFFFFF" strokeWidth="0.8" />
          <path d="M 80 20 C 82 21 83 23 84 24" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" fill="none" />

          {/* Speed Particles / Stars */}
          <circle cx="72" cy="18" r="1" fill="#38BDF8" />
          <circle cx="88" cy="32" r="1.2" fill="#38BDF8" />
          <circle cx="80" cy="12" r="0.8" fill="#FFFFFF" />

          {/* "XI" Roman Numerals Emblem overlay at bottom */}
          <text
            x="50"
            y="85"
            fontSize="14"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="1"
          >
            XI
          </text>
        </svg>
      )}

      {renderText && (
        <span className="font-black text-white text-lg tracking-tight flex items-baseline font-display">
          LOCAL<span className="text-[#00F2FE] font-black ml-0.5">XI</span>
        </span>
      )}
    </div>
  );
};

