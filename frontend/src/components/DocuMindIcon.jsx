import React from 'react';

export const DocuMindIcon = ({ size = 28, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="docuGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D5AE6" />
          <stop offset="0.6" stopColor="#5844D6" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
        <linearGradient id="sparkGrad" x1="14" y1="12" x2="26" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D5AE6" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      {/* Outer rounded container with subtle glow */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#docuGrad)" />
      {/* Document Silhouette */}
      <path 
        d="M9 8C9 7.44772 9.44772 7 10 7H18L23 12V23C23 23.5523 22.5523 24 22 24H10C9.44772 24 9 23.5523 9 23V8Z" 
        fill="#FFFFFF" 
        fillOpacity="0.96"
      />
      {/* Document Fold Accent */}
      <path d="M18 7V12H23L18 7Z" fill="#C7D2FE" />
      {/* AI Spark / Intelligent Node Symbol */}
      <circle cx="16" cy="17" r="2.5" fill="url(#sparkGrad)" />
      <path 
        d="M16 11V13M16 21V23M10 17H12M20 17H22" 
        stroke="url(#sparkGrad)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
    </svg>
  );
};
