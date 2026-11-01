import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'crest-only' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CosmopolitanCrest({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cosmopolitan University Official Crest"
    >
      {/* Outer Golden Border & University Shield */}
      <circle cx="60" cy="60" r="56" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="4" />
      <circle cx="60" cy="60" r="50" fill="#142742" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* University Inner Shield */}
      <path
        d="M60 22 C42 22 34 32 34 50 C34 76 60 92 60 92 C60 92 86 76 86 50 C86 32 78 22 60 22 Z"
        fill="#1e3a5f"
        stroke="#f59e0b"
        strokeWidth="2.5"
      />

      {/* Open Book of Knowledge / Academia */}
      <path
        d="M45 48 C51 46 56 47 60 50 C64 47 69 46 75 48 V66 C69 64 64 65 60 68 C56 65 51 64 45 66 Z"
        fill="#ffffff"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      <line x1="60" y1="50" x2="60" y2="68" stroke="#1e3a5f" strokeWidth="1.5" />
      <line x1="49" y1="54" x2="57" y2="55" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="49" y1="58" x2="57" y2="59" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="63" y1="55" x2="71" y2="54" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="63" y1="59" x2="71" y2="58" stroke="#1e3a5f" strokeWidth="1" />

      {/* Academic Star of Excellence */}
      <polygon
        points="60,28 62,34 68,34 63,38 65,44 60,40 55,44 57,38 52,34 58,34"
        fill="#f59e0b"
      />

      {/* University Laurel Wreath Leaves */}
      <path
        d="M38 72 C35 64 36 56 38 48 M82 72 C85 64 84 56 82 48"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Foundation Year / Latin Banner Motif */}
      <path d="M42 82 Q60 88 78 82" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <text
        x="60"
        y="108"
        textAnchor="middle"
        fill="#f59e0b"
        fontSize="7.5"
        fontWeight="bold"
        letterSpacing="0.08em"
        fontFamily="serif"
      >
        COSMOPOLITAN
      </text>
    </svg>
  );
}

export function Logo({ variant = 'full', className = '', size = 'md' }: LogoProps) {
  const crestSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  if (variant === 'crest-only') {
    return <CosmopolitanCrest className={`${crestSizes[size]} ${className}`} />;
  }

  const isWhite = variant === 'white';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CosmopolitanCrest className={crestSizes[size]} />
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-serif tracking-wider font-bold text-xs uppercase ${
              isWhite ? 'text-amber-300' : 'text-brand-900'
            }`}
          >
            Cosmopolitan University
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-black tracking-tight text-lg ${
              isWhite ? 'text-white' : 'text-brand-600'
            }`}
          >
            MealPass
          </span>
          <span
            className={`text-[10px] font-medium hidden sm:inline ${
              isWhite ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Digital Feeding Platform
          </span>
        </div>
      </div>
    </div>
  );
}

export function NextGenAttribution({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs text-slate-400 flex items-center justify-center gap-1.5 ${className}`}>
      <span>Powered by</span>
      <span className="font-semibold text-slate-600 tracking-wide">NextGen Technologies</span>
    </div>
  );
}

