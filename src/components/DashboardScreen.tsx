import React, { useState } from 'react';
import {
  Activity,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  DollarSign,
  Flame,
  Layers,
  Newspaper,
  Play,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { GameSaveState, ManagementDecision, RealCricketer, ScreenId } from '../types/cricket';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';
import { audioEngine } from '../engine/audioEngine';

interface DashboardScreenProps {
  state: GameSaveState;
  onNavigate: (screen: ScreenId) => void;
  onResolveDecision: (decisionId: string, optionId: string) => void;
  onInspectPlayer: (playerId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  state,
  onNavigate,
  onResolveDecision,
  onInspectPlayer,
}) => {
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  const userTeam = state.teams[state.userTeamId];
  const oppTeam = state.teams[state.liveMatch.opponentTeamId] || Object.values(state.teams)[1];

  const sortedTeams = Object.values(state.teams).sort((a, b) => {
    if (b.standings.points !== a.standings.points) return b.standings.points - a.standings.points;
    return b.standings.nrr - a.standings.nrr;
  });

  const leaguePosition = sortedTeams.findIndex((t) => t.id === userTeam.id) + 1;

  const squadPlayers: RealCricketer[] = userTeam.playingXIIds
    .map((id) => state.players[id])
    .filter(Boolean);

  const squadOvr = Math.round(
    squadPlayers.reduce((sum, p) => sum + p.gameAttributes.ovr, 0) / Math.max(1, squadPlayers.length)
  );

  // Compute 5-axis Squad Strength Radar values (0-100)
  const battingDepth = Math.min(
    98,
    Math.round(
      squadPlayers.reduce((acc, p) => acc + (p.gameAttributes.battingTiming + p.gameAttributes.battingPower) / 2, 0) /
        Math.max(1, squadPlayers.length) +
        12
    )
  );
  const paceBowlers = squadPlayers.filter((p) => p.role === 'Fast Bowler' || p.bowlingStyle.toLowerCase().includes('fast'));
  const paceAttack = paceBowlers.length
    ? Math.round(paceBowlers.reduce((a, p) => a + p.gameAttributes.bowlingSkill, 0) / paceBowlers.length)
    : 82;

  const spinBowlers = squadPlayers.filter(
    (p) => p.role === 'Spin Bowler' || p.bowlingStyle.toLowerCase().includes('orth') || p.bowlingStyle.toLowerCase().includes('legbreak') || p.bowlingStyle.toLowerCase().includes('offbreak')
  );
  const spinAttack = spinBowlers.length
    ? Math.round(spinBowlers.reduce((a, p) => a + p.gameAttributes.bowlingSkill, 0) / spinBowlers.length)
    : 84;

  const fieldingCohesion = Math.round(
    squadPlayers.reduce((a, p) => a + p.gameAttributes.fieldingReflexes, 0) / Math.max(1, squadPlayers.length)
  );
  const bowlingVariations = Math.round(
    squadPlayers.reduce((a, p) => a + p.gameAttributes.variations, 0) / Math.max(1, squadPlayers.length) + 14
  );

  const radarAxes = [
    { label: 'Batting Depth', value: battingDepth, angle: -90 },
    { label: 'Pace Attack', value: paceAttack, angle: -18 },
    { label: 'Spin Attack', value: spinAttack, angle: 54 },
    { label: 'Fielding Cohesion', value: fieldingCohesion, angle: 126 },
    { label: 'Bowling Variations', value: Math.min(96, bowlingVariations), angle: 198 },
  ];

  const getRadarPoint = (val: number, angleDeg: number, radius = 76) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = (val / 100) * radius;
    return `${110 + r * Math.cos(rad)},${105 + r * Math.sin(rad)}`;
  };

  const radarPolygonPoints = radarAxes.map((ax) => getRadarPoint(ax.value, ax.angle)).join(' ');

  const keyPerformers = [...squadPlayers]
    .sort((a, b) => b.gameAttributes.ovr - a.gameAttributes.ovr)
    .slice(0, 4);

  return (
    <div className="space-y-5">
      {/* 1. WELCOME & CLUB KPI TELEMETRY BAR */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamBadge team={userTeam} size="lg" />
          <div>
            <div className="flex items-center gap-2 text-xs text-[#9BAABD]">
              <span>TACTICAL COMMAND CENTRE</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#D8B15B] font-medium">
                {state.mode === 'FRANCHISE_T20' ? `IPL ${state.season} Season` : `ICC International ${state.season}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>{userTeam.homeVenue}</span>
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-[#F4F6FA] tracking-tight mt-0.5">
              Welcome back, {state.managerName} — {userTeam.name}
            </h1>
          </div>
        </div>

        {/* 6 Required Welcome Metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">League Pos</div>
            <div className="font-mono text-base font-bold text-[#D8B15B] tabular-nums">
              #{leaguePosition} <span className="text-xs font-normal text-[#9BAABD]">/ {sortedTeams.length}</span>
            </div>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">Reputation</div>
            <div className="font-mono text-base font-bold text-[#F4F6FA] tabular-nums">
              {userTeam.reputation}<span className="text-xs text-[#23B875]">/100</span>
            </div>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">Squad OVR</div>
            <div className="font-mono text-base font-bold text-[#38BDF8] tabular-nums">
              {squadOvr} <span className="text-[10px] text-[#9BAABD]">CALC</span>
            </div>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">Wage Bill</div>
            <div className="font-mono text-base font-bold text-[#F4F6FA] tabular-nums">
              ₹{state.finances.wageBillCr.toFixed(1)}Cr
            </div>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">Board Trust</div>
            <div className="font-mono text-base font-bold text-[#23B875] tabular-nums">
              {state.boardTrust}%
            </div>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-2">
            <div className="text-[11px] text-[#9BAABD]">Squad Morale</div>
            <div className="font-mono text-base font-bold text-[#23B875] tabular-nums">
              {state.squadMorale}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOP BENTO ROW: NEXT MATCH HERO (7 COLS) + SQUAD RADAR & MOMENTUM (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* NEXT MATCH HERO PANEL */}
        <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] overflow-hidden relative flex flex-col justify-between min-h-[340px]">
          {/* Stadium Night Photograph with Measured Dark Navy Broadcast Scrim */}
          <img
            src="/src/assets/images/stadium_night_hero_1793957400239.jpg"
            alt="Night Cricket Stadium Broadcast View"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/80 to-[#0B1728]/60" />

          <div className="relative z-10 p-5 flex flex-col justify-between h-full gap-5">
            {/* Top Match Metadata Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552]/80 pb-3">
              <div className="flex items-center gap-2 text-xs text-[#F4F6FA]">
                <span className="font-mono font-semibold text-[#D8B15B]">UPCOMING FIXTURE · MATCH #{state.liveMatch.matchNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{state.liveMatch.competitionName}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#38BDF8] tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>T-MINUS 03H : 42M : 18S</span>
              </div>
            </div>

            {/* Center Matchup Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-2">
              <div className="flex items-center gap-3.5">
                <TeamBadge team={userTeam} size="lg" />
                <div>
                  <div className="text-[11px] text-[#9BAABD]">HOME CLUB</div>
                  <div className="font-display text-lg font-bold text-[#F4F6FA]">{userTeam.name}</div>
                  <div className="font-mono text-xs text-[#23B875] tabular-nums">
                    {userTeam.standings.won}W - {userTeam.standings.lost}L · NRR +{userTeam.standings.nrr.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-block font-display text-xs font-bold tracking-widest text-[#D8B15B] px-3 py-1 bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px]">
                  VS · 20 OVERS
                </div>
                <div className="text-xs text-[#9BAABD] mt-1.5">{state.currentDate} · 19:30 IST</div>
              </div>

              <div className="flex items-center sm:justify-end gap-3.5">
                <div className="sm:text-right">
                  <div className="text-[11px] text-[#9BAABD]">AWAY CHALLENGER</div>
                  <div className="font-display text-lg font-bold text-[#F4F6FA]">{oppTeam.name}</div>
                  <div className="font-mono text-xs text-[#9BAABD] tabular-nums">
                    {oppTeam.standings.won}W - {oppTeam.standings.lost}L · NRR {oppTeam.standings.nrr >= 0 ? '+' : ''}{oppTeam.standings.nrr.toFixed(3)}
                  </div>
                </div>
                <TeamBadge team={oppTeam} size="lg" />
              </div>
            </div>

            {/* Pitch, Weather & Action Buttons */}
            <div className="pt-3 border-t border-[#1F3552]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#9BAABD]">
                <span>Venue: <strong className="text-[#F4F6FA] font-medium">{state.liveMatch.venue}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Weather: <strong className="text-[#38BDF8] font-medium">{state.liveMatch.weather}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Pitch: <strong className="text-[#D8B15B] font-medium">{state.liveMatch.pitchCondition}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    audioEngine.playClick();
                    setShowBriefingModal(true);
                  }}
                  className="px-3 py-2 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#1F3552] text-xs font-medium text-[#F4F6FA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Tactical Briefing
                </button>
                <button
                  onClick={() => {
                    audioEngine.playNavigate();
                    onNavigate('matchprep');
                  }}
                  className="px-3.5 py-2 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#D8B15B] text-xs font-bold text-[#D8B15B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Match Prep & Toss
                </button>
                <button
                  onClick={() => {
                    audioEngine.playNavigate();
                    onNavigate('match');
                  }}
                  className="px-4 py-2 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] text-[#07111F] text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Match Centre</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SQUAD STRENGTH RADAR & RECENT MOMENTUM (5 COLS) */}
        <div className="lg:col-span-5 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2.5">
            <div>
              <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                TACTICAL SQUAD TELEMETRY & MOMENTUM
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Calculated from Playing XI verified statistics
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#38BDF8] tabular-nums">
              XI OVR {squadOvr}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center my-auto py-2">
            {/* 5-Axis Radar SVG */}
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 220 210" className="w-48 h-44 overflow-visible">
                {/* Radar concentric rings */}
                {[25, 50, 75, 100].map((lvl) => (
                  <polygon
                    key={lvl}
                    points={radarAxes.map((ax) => getRadarPoint(lvl, ax.angle)).join(' ')}
                    fill="none"
                    stroke="#1F3552"
                    strokeWidth="1"
                    strokeDasharray={lvl === 100 ? 'none' : '2,2'}
                  />
                ))}
                {/* Radar spokes */}
                {radarAxes.map((ax) => {
                  const endPt = getRadarPoint(100, ax.angle).split(',');
                  return (
                    <line
                      key={ax.label}
                      x1="110"
                      y1="105"
                      x2={endPt[0]}
                      y2={endPt[1]}
                      stroke="#1F3552"
                      strokeWidth="1"
                    />
                  );
                })}
                {/* Active Squad Polygon */}
                <polygon
                  points={radarPolygonPoints}
                  fill="rgba(56, 189, 248, 0.22)"
                  stroke="#38BDF8"
                  strokeWidth="2"
                />
                {radarAxes.map((ax) => {
                  const pt = getRadarPoint(ax.value, ax.angle).split(',');
                  const labelPt = getRadarPoint(122, ax.angle).split(',');
                  return (
                    <g key={ax.label}>
                      <circle cx={pt[0]} cy={pt[1]} r="3.5" fill="#D8B15B" />
                      <text
                        x={labelPt[0]}
                        y={labelPt[1]}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-[#9BAABD] text-[9px] font-mono"
                      >
                        {ax.label.split(' ')[0]} ({ax.value})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Radar Breakdown + Last 5 Matches W/L Momentum */}
            <div className="space-y-2.5">
              {radarAxes.map((ax) => (
                <div key={ax.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9BAABD]">{ax.label}</span>
                    <span className="font-mono font-semibold text-[#F4F6FA] tabular-nums">{ax.value}/100</span>
                  </div>
                  <div className="h-1.5 bg-[#0B1728] rounded-full overflow-hidden border border-[#1F3552]/60">
                    <div
                      className="h-full bg-gradient-to-r from-[#38BDF8] to-[#23B875]"
                      style={{ width: `${ax.value}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Last 5 Matches W/L Momentum */}
              <div className="pt-2 border-t border-[#1F3552]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#9BAABD]">Last 5 Matches Form</span>
                  <span className="font-mono text-[#23B875] text-[11px]">Momentum: High</span>
                </div>
                <div className="flex items-center gap-2">
                  {userTeam.recentForm.map((res, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-7 rounded-[4px] font-mono text-xs font-bold flex items-center justify-center border ${
                        res === 'W'
                          ? 'bg-[#23B875]/15 border-[#23B875] text-[#23B875]'
                          : 'bg-[#E45B63]/15 border-[#E45B63] text-[#E45B63]'
                      }`}
                    >
                      {res}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: KEY PERFORMERS (6 COLS) + LEAGUE STANDINGS (6 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* KEY PERFORMERS */}
        <div className="lg:col-span-6 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-3 mb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                KEY SQUAD PERFORMERS (VERIFIED RECORDS)
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Click any player to open full career & tactical profile
              </p>
            </div>
            <button
              onClick={() => onNavigate('database')}
              className="text-xs text-[#D8B15B] hover:underline flex items-center gap-1"
            >
              <span>Player Database</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {keyPerformers.map((player) => {
              const isCapt = userTeam.captainId === player.id;
              const isWk = userTeam.wicketkeeperId === player.id;
              return (
                <div
                  key={player.id}
                  onClick={() => {
                    audioEngine.playClick();
                    onInspectPlayer(player.id);
                    onNavigate('squad');
                  }}
                  className="bg-[#0B1728] hover:bg-[#17283D] border border-[#1F3552] rounded-[6px] p-3 cursor-pointer transition-colors flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <PlayerPortrait player={player} team={userTeam} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-[#F4F6FA]">
                            {player.fullName}
                          </span>
                          {isCapt && (
                            <span className="font-mono text-[10px] font-bold text-[#D8B15B]">[C]</span>
                          )}
                          {isWk && (
                            <span className="font-mono text-[10px] font-bold text-[#38BDF8]">[WK]</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#9BAABD]">
                          {player.role} · {player.nationality}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-[#D8B15B] tabular-nums">
                        {player.gameAttributes.ovr}
                      </div>
                      <div className="text-[9px] font-mono text-[#9BAABD]">OVR</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F3552]/70 text-[11px]">
                    <div>
                      <span className="text-[#9BAABD] block">Career Runs</span>
                      <span className="font-mono font-semibold text-[#F4F6FA] tabular-nums">
                        {player.verifiedStats.runs.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9BAABD] block">Avg / SR</span>
                      <span className="font-mono font-semibold text-[#23B875] tabular-nums">
                        {player.verifiedStats.battingAvg} / {player.verifiedStats.strikeRate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9BAABD] block">Wickets / Econ</span>
                      <span className="font-mono font-semibold text-[#38BDF8] tabular-nums">
                        {player.verifiedStats.wickets} / {player.verifiedStats.economy ?? '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#9BAABD] flex items-center justify-between pt-1">
                    <span>Recent:</span>
                    <span className="font-mono text-[#F4F6FA] tabular-nums">
                      {player.recentPerformances.slice(0, 2).join(' · ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEAGUE STANDINGS TABLE */}
        <div className="lg:col-span-6 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-3 mb-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                OFFICIAL STANDINGS TELEMETRY
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Top 4 qualify for Championship Playoffs
              </p>
            </div>
            <button
              onClick={() => onNavigate('fixtures')}
              className="text-xs text-[#D8B15B] hover:underline flex items-center gap-1"
            >
              <span>Full Schedule</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F3552] text-[11px] font-mono text-[#9BAABD]">
                  <th className="py-2 px-2">POS</th>
                  <th className="py-2 px-2">CLUB</th>
                  <th className="py-2 px-2 text-right">M</th>
                  <th className="py-2 px-2 text-right">W</th>
                  <th className="py-2 px-2 text-right">L</th>
                  <th className="py-2 px-2 text-right">NRR</th>
                  <th className="py-2 px-2 text-right">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F3552]/50 text-xs">
                {sortedTeams.slice(0, 7).map((team, index) => {
                  const isUser = team.id === userTeam.id;
                  return (
                    <tr
                      key={team.id}
                      className={`h-9 transition-colors ${
                        isUser ? 'bg-[#17283D] font-semibold' : 'hover:bg-[#0B1728]/60'
                      }`}
                    >
                      <td className="px-2 font-mono tabular-nums">
                        <span className={index < 4 ? 'text-[#23B875] font-bold' : 'text-[#9BAABD]'}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: team.primaryColor }}
                          />
                          <span className={isUser ? 'text-[#D8B15B] font-bold' : 'text-[#F4F6FA]'}>
                            {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 text-right font-mono text-[#9BAABD] tabular-nums">
                        {team.standings.played}
                      </td>
                      <td className="px-2 text-right font-mono text-[#23B875] tabular-nums">
                        {team.standings.won}
                      </td>
                      <td className="px-2 text-right font-mono text-[#E45B63] tabular-nums">
                        {team.standings.lost}
                      </td>
                      <td className="px-2 text-right font-mono text-[#F4F6FA] tabular-nums">
                        {team.standings.nrr >= 0 ? `+${team.standings.nrr.toFixed(3)}` : team.standings.nrr.toFixed(3)}
                      </td>
                      <td className="px-2 text-right font-mono font-bold text-[#D8B15B] tabular-nums">
                        {team.standings.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: MANAGEMENT DECISIONS (7 COLS) + TREASURY & FISCAL (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* INTERACTIVE MANAGEMENT DECISIONS */}
        <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2.5">
            <div>
              <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                EXECUTIVE MANAGEMENT DECISIONS INBOX
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Directives immediately update pitch preparation, squad morale, and club budget
              </p>
            </div>
            <span className="font-mono text-xs text-[#D8B15B] tabular-nums">
              {state.decisions.filter((d) => !d.resolvedOptionId).length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {state.decisions.map((dec: ManagementDecision) => {
              const resolved = dec.options.find((o) => o.id === dec.resolvedOptionId);
              return (
                <div
                  key={dec.id}
                  className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#38BDF8]">{dec.category}</span>
                      <span aria-hidden="true" className="text-[#9BAABD]">·</span>
                      <span className="font-display font-bold text-[#F4F6FA]">{dec.title}</span>
                    </div>
                    <span className="font-mono text-xs text-[#9BAABD] tabular-nums">
                      Est. Impact: {dec.impactText}
                    </span>
                  </div>
                  <p className="text-xs text-[#9BAABD] leading-relaxed">{dec.description}</p>

                  {resolved ? (
                    <div className="flex items-center gap-2 text-xs text-[#23B875] font-medium pt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Directive Executed: {resolved.label} ({resolved.effectSummary})</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {dec.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            audioEngine.playClick();
                            onResolveDecision(dec.id, opt.id);
                          }}
                          className="px-3 py-1.5 rounded-[4px] bg-[#17283D] hover:bg-[#D8B15B] hover:text-[#07111F] border border-[#1F3552] text-xs font-medium text-[#F4F6FA] transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TREASURY & FISCAL OVERVIEW */}
        <div className="lg:col-span-5 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2.5">
            <div>
              <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                TREASURY & FISCAL LEDGER
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Real-time commercial revenue and auction purse reserve
              </p>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs text-[#D8B15B] hover:underline flex items-center gap-1"
            >
              <span>Sponsors & Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between h-9 px-3 bg-[#0B1728] border border-[#1F3552] rounded-[6px] text-xs">
              <span className="text-[#9BAABD]">Central Broadcast Rights Share</span>
              <span className="font-mono font-semibold text-[#23B875] tabular-nums">
                +₹{state.finances.broadcastRightsCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="flex items-center justify-between h-9 px-3 bg-[#0B1728] border border-[#1F3552] rounded-[6px] text-xs">
              <span className="text-[#9BAABD]">Commercial & Title Sponsorships</span>
              <span className="font-mono font-semibold text-[#23B875] tabular-nums">
                +₹{state.finances.sponsorshipsCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="flex items-center justify-between h-9 px-3 bg-[#0B1728] border border-[#1F3552] rounded-[6px] text-xs">
              <span className="text-[#9BAABD]">Matchday Gate & Hospitality Receipts</span>
              <span className="font-mono font-semibold text-[#38BDF8] tabular-nums">
                +₹{state.finances.gateReceiptsCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="flex items-center justify-between h-9 px-3 bg-[#0B1728] border border-[#1F3552] rounded-[6px] text-xs">
              <span className="text-[#9BAABD]">Available Auction & Transfer Purse</span>
              <span className="font-mono font-bold text-[#D8B15B] tabular-nums">
                ₹{userTeam.purseRemainingCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="flex items-center justify-between h-10 px-3 bg-[#17283D] border border-[#D8B15B]/40 rounded-[6px] text-xs">
              <span className="font-semibold text-[#F4F6FA]">Net Club Financial Balance</span>
              <span className="font-mono text-sm font-bold text-[#F4F6FA] tabular-nums">
                ₹{state.finances.totalBalanceCr.toFixed(2)} Cr
              </span>
            </div>
          </div>

          {/* NEWS & PRESS TICKER */}
          <div className="pt-2 border-t border-[#1F3552] space-y-2">
            <div className="text-[11px] font-mono text-[#D8B15B] uppercase tracking-wider">
              VERIFIED COMPETITION PRESS WIRE
            </div>
            {state.news.slice(0, 2).map((item) => (
              <div key={item.id} className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#9BAABD]">
                  <span className="text-[#38BDF8]">{item.category}</span>
                  <span>·</span>
                  <span>{item.date}</span>
                </div>
                <div className="text-xs font-semibold text-[#F4F6FA] mt-0.5">{item.headline}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TACTICAL BRIEFING MODAL */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-3">
              <div>
                <div className="text-xs font-mono text-[#D8B15B]">MATCH #34 PRE-MATCH DOSSIER</div>
                <h3 className="font-display text-lg font-bold text-[#F4F6FA]">
                  {userTeam.name} vs {oppTeam.name} — Tactical Briefing
                </h3>
              </div>
              <button
                onClick={() => setShowBriefingModal(false)}
                className="px-3 py-1 rounded-[4px] bg-[#17283D] text-xs text-[#9BAABD] hover:text-[#F4F6FA]"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#9BAABD] leading-relaxed">
              <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
                <div className="font-semibold text-[#F4F6FA] mb-1">1. Pitch & Dew Telemetry</div>
                Surface is rated as <strong className="text-[#D8B15B]">{state.liveMatch.pitchCondition}</strong> with{' '}
                <strong className="text-[#38BDF8]">{state.liveMatch.dewFactor}</strong> expected in the second innings.
                Pace bowlers bowling hard lengths in Overs 1–6 and yorkers in Overs 16–20 carry a +14% wicket probability bonus.
              </div>
              <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
                <div className="font-semibold text-[#F4F6FA] mb-1">2. Opposition Key Threat</div>
                Watch out for <strong className="text-[#F4F6FA]">{ state.players[oppTeam.captainId]?.fullName }</strong> in the Powerplay.
                Deploying an <strong className="text-[#23B875]">Attacking</strong> slip/gully cordon early or a{' '}
                <strong className="text-[#38BDF8]">Death Overs</strong> boundary rope ring in the final 4 overs will restrict boundary flow.
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowBriefingModal(false);
                  onNavigate('squad');
                }}
                className="px-4 py-2 rounded-[4px] bg-[#17283D] border border-[#1F3552] text-xs font-medium text-[#F4F6FA]"
              >
                Review Playing XI
              </button>
              <button
                onClick={() => {
                  setShowBriefingModal(false);
                  onNavigate('match');
                }}
                className="px-4 py-2 rounded-[4px] bg-[#D8B15B] text-[#07111F] text-xs font-bold"
              >
                Enter Live Match Centre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
