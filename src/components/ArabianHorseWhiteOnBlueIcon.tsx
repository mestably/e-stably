import React from 'react';

interface ArabianHorseWhiteOnBlueIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded' | 'square';
  showBorder?: boolean;
}

/**
 * Lightweight SVG Icon of an authentic purebred Arabian horse in pure white
 * with a royal equestrian blue background.
 * 0ms loading time, zero network latency, sharp vector resolution at any scale.
 */
export const ArabianHorseWhiteOnBlueIcon: React.FC<ArabianHorseWhiteOnBlueIconProps> = ({
  className = '',
  size = 'md',
  shape = 'rounded',
  showBorder = true,
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const rxValue = shape === 'circle' ? 50 : shape === 'rounded' ? 22 : 8;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${
        sizeClasses[size]
      } ${
        shape === 'circle' ? 'rounded-full' : shape === 'rounded' ? 'rounded-2xl' : 'rounded-lg'
      } ${
        showBorder ? 'border border-blue-400/40 shadow-sm ring-1 ring-white/20' : ''
      } ${className}`}
      style={{
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 45%, #0F172A 100%)',
      }}
      title="شاشة توقف الخيول العربية الأصيلة"
      role="img"
      aria-label="حصان عربي أصيل أبيض بخلفية زرقاء"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-[10%]"
      >
        <defs>
          <linearGradient id="whiteHorseGrad" x1="20%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="maneLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <filter id="softHorseShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.5" floodColor="#091024" floodOpacity="0.45" />
          </filter>
        </defs>

        <g filter="url(#softHorseShadow)">
          {/* Authentic Purebred Arabian Horse Silhouette & Musculature in Pure White (Facing Left) */}
          
          {/* 1. Main Head, Arched Crest Neck, and Chest/Shoulder */}
          <path
            d="M 44,25 
               C 42,20 39,18 37,20 
               C 35,22 36,26 38,30 
               C 34,31 31,34 28,38 
               C 24,43 19,48 15,50 
               C 13,51 12,53 13,55 
               C 14,57 17,58 20,57 
               C 23,56 25,53 26,52 
               C 28,55 33,59 39,58 
               C 45,57 48,51 47,44 
               C 49,52 53,62 57,74 
               C 60,82 64,89 69,94 
               L 88,94 
               C 87,86 84,76 80,68 
               C 74,56 68,44 60,35 
               C 54,29 48,26 44,25 Z"
            fill="url(#whiteHorseGrad)"
          />

          {/* 2. Arabian Inward-Curving Alert Ears */}
          {/* Near Fore Ear */}
          <path
            d="M 42,26 C 41,20 40,15 38,13 C 36,15 37,21 39,28 Z"
            fill="#FFFFFF"
          />
          {/* Far Ear */}
          <path
            d="M 46,27 C 45,21 44,17 43,15 C 41,17 42,22 43,28 Z"
            fill="#E2E8F0"
          />

          {/* 3. Dished Arabian Profile Accents & Jowl / Cheek Definition */}
          {/* Eye - Large dark expressive Arabian eye with white highlight */}
          <ellipse cx="33" cy="38" rx="2.5" ry="3.2" transform="rotate(-15 33 38)" fill="#0F172A" />
          <circle cx="32" cy="37" r="1" fill="#FFFFFF" />

          {/* Nostril - Flared refined Arabian nostril */}
          <path
            d="M 17,52 C 16,51 17,53 18,54 C 19,54 18,53 17,52 Z"
            fill="#1E293B"
          />

          {/* Fine muzzle line */}
          <path
            d="M 14,53 C 17,54 19,54 21,53"
            stroke="#94A3B8"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Jowl line shading giving realistic 3D depth */}
          <path
            d="M 27,51 C 32,56 38,55 42,48 C 45,43 45,39 42,35"
            stroke="#CBD5E1"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* 4. Silky Flowing Arabian Mane (عرف الخيل الحريري الأبيض) */}
          <path
            d="M 41,27 C 45,31 46,38 43,44 C 47,41 49,36 47,30 Z"
            fill="url(#maneLightGrad)"
          />
          <path
            d="M 48,31 C 54,37 56,47 52,55 C 57,51 60,44 56,36 Z"
            fill="url(#maneLightGrad)"
          />
          <path
            d="M 57,41 C 64,50 67,61 63,70 C 68,64 71,56 66,47 Z"
            fill="url(#maneLightGrad)"
          />
          <path
            d="M 66,54 C 74,65 77,77 74,86 C 79,79 81,70 76,60 Z"
            fill="url(#maneLightGrad)"
          />
          {/* Forelock hair tuft between ears */}
          <path
            d="M 37,27 C 34,31 32,36 33,39 C 34,36 36,32 38,29 Z"
            fill="#FFFFFF"
          />
        </g>
      </svg>
    </div>
  );
};

export default ArabianHorseWhiteOnBlueIcon;
