import React from 'react';

interface RupIqLogoProps {
  className?: string; 
}

export const RupIqLogo: React.FC<RupIqLogoProps> = ({ className = "h-10 w-auto" }) => {
  return (
    <svg viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="RupIQ Logo">
      <defs>
        <linearGradient id="rupeeSymbolGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* Gradient from a vibrant green to a vibrant blue */}
          <stop offset="0%" style={{ stopColor: '#22C55E' }} /> 
          <stop offset="100%" style={{ stopColor: '#3B82F6' }} /> 
        </linearGradient>
      </defs>
      
      {/* Black background for the logo unit */}
      <rect width="100%" height="100%" fill="#0D1117" rx="8"/>

      {/* Rupee Symbol ₹ */}
      <text 
        x="45" // Positioned to the left
        y="30" // Vertically centered
        fontFamily="Arial, sans-serif" 
        fontSize="36" 
        fill="url(#rupeeSymbolGradient)" 
        textAnchor="middle"
        dominantBaseline="middle"
      >
        ₹
      </text>
      
      {/* Vertical Separator Line */}
      <line x1="85" y1="10" x2="85" y2="50" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      
      {/* RupIQ Text */}
      <text 
        x="150" // Positioned to the right of the separator
        y="30"  // Vertically centered
        fontFamily="Inter, Arial, sans-serif" 
        fontSize="28" 
        fontWeight="bold" 
        fill="white" 
        textAnchor="middle"
        dominantBaseline="middle"
      >
        RupIQ
      </text>
    </svg>
  );
};
