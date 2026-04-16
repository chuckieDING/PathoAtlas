// Lightweight inline SVG icon library
// No external dependencies - tree-shakeable
// All icons are 24x24, stroke-based (Lucide style)

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number = 20): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
}

// ── Navigation ──────────────────────────────────────────────
export const IconHome = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconMicroscope = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M6 18h8"/>
    <path d="M3 22h18"/>
    <path d="M14 22a7 7 0 1 0 0-14h-1"/>
    <path d="M9 14h2"/>
    <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/>
    <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
  </svg>
);

export const IconFlask = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M10 2v7.31"/>
    <path d="M14 9.3V1.99"/>
    <path d="M8.5 2h7"/>
    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>
    <path d="M5.58 16.5h12.85"/>
  </svg>
);

export const IconScale = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="M7 21h10"/>
    <path d="M12 3v18"/>
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
  </svg>
);

export const IconBrain = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

export const IconTrophy = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

// ── UI Controls ─────────────────────────────────────────────
export const IconSearch = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconX = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const IconMenu = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

export const IconChevronRight = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconChevronDown = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const IconArrowRight = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

// ── Theme ───────────────────────────────────────────────────
export const IconSun = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export const IconMoon = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// ── Progress / Gamification ────────────────────────────────
export const IconFlame = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

export const IconStar = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconTarget = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

export const IconCheck = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const IconCheckCircle = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export const IconLock = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export const IconZap = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

export const IconAward = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
);

export const IconBookOpen = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export const IconDna = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M2 15c6.667-6 13.333 0 20-6"/>
    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/>
    <path d="m17 6-2.5-2.5"/>
    <path d="m14 8-1-1"/>
    <path d="m7 18 2.5 2.5"/>
    <path d="m3.5 14.5.5.5"/>
    <path d="m20 9 .5.5"/>
    <path d="m6.5 12.5 1 1"/>
    <path d="m16.5 10.5 1 1"/>
    <path d="m10 16 1.5 1.5"/>
  </svg>
);

export const IconActivity = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export const IconGrid = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

export const IconInfo = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export const IconHelp = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconSettings = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const IconGithub = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);

export const IconSnowflake = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"/>
    <path d="m9 3 3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3"/>
  </svg>
);

export const IconScissors = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>
);

export const IconClipboard = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M9 14h6M9 18h6M9 10h6"/>
  </svg>
);

export const IconTrendingUp = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);

// ── Organ icons (anatomical, stylised) ─────────────────────
// Each is a stroke-based 24×24 SVG representing the organ.

export const IconOrganBreast = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M4 11c0-3.5 2.5-6 5.5-6 1.8 0 2.5 1 2.5 1s.7-1 2.5-1c3 0 5.5 2.5 5.5 6 0 5-4 8-8 8s-8-3-8-8Z"/>
    <circle cx="12" cy="12" r="1.3"/>
    <circle cx="12" cy="12" r="3" strokeDasharray="1 2"/>
  </svg>
);

export const IconOrganLung = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M12 4v10"/>
    <path d="M8 6H7a1 1 0 0 0-.95.68l-2 6a1 1 0 0 0 .3 1.09l3 2.5a1 1 0 0 0 1.62-.48l1-3.5a1 1 0 0 0-.05-.68l-1-2.5A1 1 0 0 0 8 8.5V6Z"/>
    <path d="M16 6h1a1 1 0 0 1 .95.68l2 6a1 1 0 0 1-.3 1.09l-3 2.5a1 1 0 0 1-1.62-.48l-1-3.5a1 1 0 0 1 .05-.68l1-2.5A1 1 0 0 1 16 8.5V6Z"/>
    <path d="M10 4h4"/>
    <path d="M12 14v4"/>
  </svg>
);

export const IconOrganGi = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M9 3v4a3 3 0 0 1-3 3 3 3 0 0 0-3 3v1a3 3 0 0 0 3 3h2"/>
    <path d="M15 3v3"/>
    <path d="M8 17h8a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3 3 3 0 0 1-3-3"/>
    <path d="M12 17v4"/>
    <path d="M9 21h6"/>
  </svg>
);

export const IconOrganLiver = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M3 9c0-2 2-4 5-4h9a4 4 0 0 1 4 4v4a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6Z"/>
    <path d="M14 5v4"/>
    <path d="M14 9h6"/>
    <path d="M17 13.5c.5.5 1.5.5 2 0"/>
    <path d="M8 13.5c.5.5 1.5.5 2 0"/>
  </svg>
);

export const IconOrganKidney = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M8 4c-3 0-5 3-5 6.5S5 21 9 21c2 0 3-1 3-3s-1-2-1-3.5S13 12 13 9s-2-5-5-5Z"/>
    <path d="M16 4c3 0 5 3 5 6.5S19 21 15 21c-2 0-3-1-3-3"/>
    <path d="M9 10c0 .8.5 1.5 1 2"/>
    <path d="M17 10c0 .8-.5 1.5-1 2"/>
  </svg>
);

export const IconOrganThyroid = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M12 4v4"/>
    <path d="M12 8c-2 0-4 1-5 3s-1 5 1 6 4 0 4-2v-3"/>
    <path d="M12 8c2 0 4 1 5 3s1 5-1 6-4 0-4-2v-3"/>
    <path d="M10 4h4"/>
  </svg>
);

export const IconOrganLymph = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <circle cx="6" cy="7" r="2.5"/>
    <circle cx="17" cy="7" r="2.5"/>
    <circle cx="12" cy="14" r="3"/>
    <circle cx="6" cy="19" r="1.8"/>
    <circle cx="18" cy="19" r="1.8"/>
    <path d="M7.6 8.5 10 12"/>
    <path d="M15.5 8.8 14 12"/>
    <path d="M10 16 7.2 18"/>
    <path d="M14 16l2.8 2"/>
  </svg>
);

export const IconOrganSkin = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M3 6h18"/>
    <path d="M3 10h18"/>
    <path d="M3 14h18"/>
    <path d="M3 18h18"/>
    <path d="M7 6v-.5a2 2 0 1 1 3 0V6"/>
    <path d="M15 6v-.5a2 2 0 1 1 3 0V6"/>
    <circle cx="8" cy="12" r=".6" fill="currentColor"/>
    <circle cx="14" cy="12" r=".6" fill="currentColor"/>
    <circle cx="11" cy="16" r=".6" fill="currentColor"/>
  </svg>
);

export const IconOrganGyn = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M7 5c-1.5 1.5-2 3-2 5a7 7 0 0 0 7 7 7 7 0 0 0 7-7c0-2-.5-3.5-2-5"/>
    <circle cx="6" cy="5" r="1.8"/>
    <circle cx="18" cy="5" r="1.8"/>
    <path d="M12 17v4"/>
    <path d="M10 21h4"/>
  </svg>
);

export const IconOrganUrology = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M5 10a7 7 0 0 1 14 0c0 4-3 7-7 7s-7-3-7-7Z"/>
    <path d="M9 6V4"/>
    <path d="M15 6V4"/>
    <path d="M12 17v4"/>
    <path d="M10 21h4"/>
  </svg>
);

export const IconOrganCns = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M8 4a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0Z"/>
    <path d="M6 8h12"/>
    <path d="M6 12h12"/>
    <path d="M10 16h4"/>
  </svg>
);

export const IconOrganSoftTissue = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M6 6a6 6 0 0 1 12 0v12a6 6 0 0 1-12 0Z"/>
    <path d="M10 10h4"/>
    <path d="M8 14h8"/>
    <path d="M12 6v4"/>
  </svg>
);

export const IconOrganBone = ({ size, ...p }: IconProps) => (
  <svg {...baseProps(size)} {...p}>
    <path d="M8 4a4 4 0 0 1 8 0v16a4 4 0 0 1-8 0Z"/>
    <path d="M6 8h12"/>
    <path d="M6 16h12"/>
    <path d="M10 12h4"/>
  </svg>
);
