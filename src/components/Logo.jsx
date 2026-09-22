import React from 'react';

export default function Logo({ size = 28, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#311042" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="logoOrbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="logoMicGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="128" fill="url(#logoBgGrad)" />
      <rect width="504" height="504" x="4" y="4" rx="124" fill="none" stroke="url(#logoOrbGrad)" strokeWidth="8" opacity="0.8" />

      {/* Soundwaves */}
      <path d="M 120 200 A 70 70 0 0 0 120 312" fill="none" stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
      <path d="M 88 170 A 110 110 0 0 0 88 342" fill="none" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" opacity="0.75" />
      <path d="M 392 200 A 70 70 0 0 1 392 312" fill="none" stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
      <path d="M 424 170 A 110 110 0 0 1 424 342" fill="none" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" opacity="0.75" />

      {/* Center Glowing Orb */}
      <circle cx="256" cy="256" r="92" fill="url(#logoOrbGrad)" />

      {/* Mic Capsule */}
      <rect x="226" y="155" width="60" height="110" rx="30" fill="url(#logoMicGrad)" />
      <line x1="242" y1="195" x2="270" y2="195" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
      <line x1="242" y1="210" x2="270" y2="210" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />

      {/* Mic Stand */}
      <path d="M 198 226 A 58 58 0 0 0 314 226" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />
      <line x1="256" y1="284" x2="256" y2="334" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />
      <line x1="214" y1="334" x2="298" y2="334" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />

      {/* Top Sparkle */}
      <path d="M 360 110 Q 360 135 385 135 Q 360 135 360 160 Q 360 135 335 135 Q 360 135 360 110 Z" fill="#FACC15" />
    </svg>
  );
}
