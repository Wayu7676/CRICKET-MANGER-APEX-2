import React from 'react';
import { RealCricketer, TeamInfo } from '../types/cricket';

interface PlayerPortraitProps {
  player: RealCricketer;
  team?: TeamInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showJersey?: boolean;
}

const COUNTRY_COLORS: Record<string, { primary: string; accent: string }> = {
  IND: { primary: '#00529B', accent: '#FF9933' },
  AUS: { primary: '#006A4E', accent: '#FFCD00' },
  ENG: { primary: '#11294B', accent: '#CE1124' },
  RSA: { primary: '#007749', accent: '#FFB81C' },
  NZ: { primary: '#111827', accent: '#38BDF8' },
  PAK: { primary: '#01411C', accent: '#D8B15B' },
  WI: { primary: '#7B0041', accent: '#FCD116' },
  AFG: { primary: '#0066B2', accent: '#D32011' },
  SL: { primary: '#1E3A8A', accent: '#F59E0B' },
  BAN: { primary: '#065F46', accent: '#EF4444' },
};

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  player,
  team,
  size = 'md',
  showJersey = true,
}) => {
  const palette = team
    ? { primary: team.primaryColor, accent: team.secondaryColor }
    : COUNTRY_COLORS[player.countryCode] || { primary: '#17283D', accent: '#D8B15B' };

  const dimensions =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
      ? 'w-11 h-11'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-24 h-24';

  return (
    <div
      className={`${dimensions} relative rounded-[6px] overflow-hidden shrink-0 border border-[#1F3552] bg-[#0B1728] flex items-end justify-center select-none`}
      title={`${player.fullName} (${player.nationality}) · Verified Athletic Silhouette`}
    >
      {/* Subtle radial stadium floodlight backlight */}
      <div
        className="absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at 50% 25%, ${palette.accent}, ${palette.primary} 70%, #07111F 100%)`,
        }}
      />

      {/* Neutral Professional Cricketer Silhouette SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10"
        aria-label={`${player.fullName} silhouette`}
      >
        {/* Helmet / Cap & Head Silhouette */}
        <circle cx="50" cy="31" r="15.5" fill="#1E2F47" stroke={palette.accent} strokeWidth="1.4" />
        {/* Cricket Cap Visor */}
        <path
          d="M 35 28 Q 50 21 65 28 L 68 31 Q 50 26 32 31 Z"
          fill={palette.primary}
        />
        {/* Jersey Shoulders & Torso */}
        <path
          d="M 16 98 C 17 69, 31 55, 50 55 C 69 55, 83 69, 84 98 Z"
          fill={palette.primary}
          stroke="#1F3552"
          strokeWidth="1.5"
        />
        {/* Jersey V-Neck Collar Trim */}
        <path
          d="M 39 56 L 50 69 L 61 56"
          fill="none"
          stroke={palette.accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Shoulder Stripes */}
        <path d="M 24 68 L 36 58" stroke={palette.accent} strokeWidth="2.5" />
        <path d="M 76 68 L 64 58" stroke={palette.accent} strokeWidth="2.5" />
      </svg>

      {/* Jersey Number Overlay */}
      {showJersey && (
        <span className="absolute bottom-0.5 right-1 z-20 font-mono text-[10px] font-bold text-[#F4F6FA] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tabular-nums">
          #{player.jerseyNumber}
        </span>
      )}
    </div>
  );
};

interface TeamBadgeProps {
  team: TeamInfo;
  size?: 'sm' | 'md' | 'lg';
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({ team, size = 'md' }) => {
  const dim =
    size === 'sm'
      ? 'w-7 h-7 text-[10px]'
      : size === 'md'
      ? 'w-10 h-10 text-xs'
      : 'w-14 h-14 text-base';

  return (
    <div
      className={`${dim} rounded-[6px] border border-[#1F3552] flex items-center justify-center font-display font-black tracking-tight shrink-0 select-none relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${team.primaryColor} 0%, #0B1728 90%)`,
        color: '#F4F6FA',
      }}
      title={team.name}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: team.secondaryColor }}
      />
      <span className="relative z-10 drop-shadow">{team.shortCode}</span>
    </div>
  );
};
