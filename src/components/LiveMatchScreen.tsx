import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Compass,
  FastForward,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SkipForward,
  Sliders,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  BattingMindset,
  BowlingAggressiveness,
  BowlingDelivery,
  CustomFormationPreset,
  FieldPreset,
  GameSaveState,
  LiveMatchState,
  ScreenId,
} from '../types/cricket';
import {
  DEFAULT_FORMATION_PRESETS,
  getPresetFieldCoordinates,
} from '../data/realCricketers';
import { simulateNextDelivery } from '../engine/matchEngine';
import { audioEngine } from '../engine/audioEngine';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';

interface LiveMatchScreenProps {
  state: GameSaveState;
  onUpdateMatch: (nextMatch: LiveMatchState) => void;
  onResetMatch: () => void;
  onNavigate?: (screen: ScreenId) => void;
}

const BATTING_DIRECTIVES: BattingMindset[] = [
  'Defend',
  'Rotate Strike',
  'Balanced',
  'Attack',
  'Loft',
];

const BOWLING_DELIVERIES: BowlingDelivery[] = [
  'Yorker',
  'Bouncer',
  'Good Length',
  'Short Ball',
  'Slower Ball',
  'Wide Line',
  'Off-stump',
  'Leg-stump',
];

const BOWLING_AGGRESSIVENESS_LEVELS: BowlingAggressiveness[] = [
  'High Aggression',
  'Balanced Control',
  'Defensive Containment',
];

const FIELD_PRESETS: FieldPreset[] = [
  'Attacking',
  'Balanced',
  'Defensive',
  'Death Overs',
  'Custom',
];

export const LiveMatchScreen: React.FC<LiveMatchScreenProps> = ({
  state,
  onUpdateMatch,
  onResetMatch,
  onNavigate,
}) => {
  const match = state.liveMatch;
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [autoPauseWicket, setAutoPauseWicket] = useState(true);
  const [autoPauseMilestone, setAutoPauseMilestone] = useState(true);
  const [draggingFielderId, setDraggingFielderId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const battingTeam = state.teams[match.battingTeamId] || state.teams[state.userTeamId];
  const bowlingTeam = state.teams[match.bowlingTeamId] || Object.values(state.teams)[1];

  const striker = state.players[match.strikerId] || Object.values(state.players)[0];
  const nonStriker = state.players[match.nonStrikerId] || Object.values(state.players)[1];
  const bowler = state.players[match.currentBowlerId] || Object.values(state.players)[2];

  const strikerStat = match.battingStats[striker.id] || {
    playerId: striker.id,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissalText: 'not out',
    fatigue: 12,
    confidence: 80,
  };
  const nonStrikerStat = match.battingStats[nonStriker.id] || {
    playerId: nonStriker.id,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissalText: 'not out',
    fatigue: 10,
    confidence: 76,
  };
  const bowlerStat = match.bowlingStats[bowler.id] || {
    playerId: bowler.id,
    ballsBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    fatigue: 15,
    confidence: 78,
  };

  // Trigger audio reactions when a ball is bowled
  const triggerBallAudio = (updated: LiveMatchState) => {
    const latest = updated.commentaryLog[0];
    if (!latest) return;
    if (updated.isCompleted) {
      if (updated.winnerTeamId === state.userTeamId) {
        audioEngine.setMode('victory');
        audioEngine.triggerCrowdReaction('VICTORY');
      } else {
        audioEngine.triggerCrowdReaction('DEFEAT');
      }
    } else if (updated.lastCelebration === 'INNINGS_BREAK') {
      audioEngine.triggerCrowdReaction('INNINGS_BREAK');
    } else if (
      updated.totalOvers * 6 - updated.ballsBowled === 6 &&
      updated.ballsBowled > 0
    ) {
      audioEngine.triggerCrowdReaction('LAST_OVER');
    } else if (latest.isWicket) {
      audioEngine.triggerCrowdReaction('WICKET');
    } else if (latest.isBoundarySix) {
      audioEngine.triggerCrowdReaction('SIX');
    } else if (latest.isBoundaryFour) {
      audioEngine.triggerCrowdReaction('FOUR');
    } else if (latest.runs >= 1) {
      audioEngine.triggerCrowdReaction('SINGLE');
    } else {
      audioEngine.triggerCrowdReaction('DOT');
    }
  };

  const formations =
    state.customFormations && state.customFormations.length > 0
      ? state.customFormations
      : DEFAULT_FORMATION_PRESETS;

  const handleApplyFormationPreset = (preset: CustomFormationPreset) => {
    audioEngine.playClick();
    const updatedFielders = match.fielders.map((f, idx) => ({
      ...f,
      label: preset.fielderCoordinates[idx]?.label || f.label,
      x: preset.fielderCoordinates[idx]?.x ?? f.x,
      y: preset.fielderCoordinates[idx]?.y ?? f.y,
    }));
    onUpdateMatch({
      ...match,
      activeFormationId: preset.id,
      fieldPreset: preset.fieldPreset,
      bowlingAggressiveness: preset.bowlingAggressiveness,
      bowlingDelivery: preset.defaultDelivery,
      battingMindset: preset.defaultBattingMindset,
      fielders: updatedFielders,
    });
  };

  const handleNextBall = () => {
    if (match.isCompleted) return;
    audioEngine.ensureStarted();
    const updated = simulateNextDelivery(match, state.players, state.teams);
    triggerBallAudio(updated);
    onUpdateMatch(updated);
  };

  const handleSimulateOver = () => {
    if (match.isCompleted) return;
    audioEngine.ensureStarted();
    let cur = match;
    const startOver = Math.floor(cur.ballsBowled / 6);
    let safety = 0;
    while (!cur.isCompleted && Math.floor(cur.ballsBowled / 6) === startOver && safety < 10) {
      cur = simulateNextDelivery(cur, state.players, state.teams);
      safety++;
      if (autoPauseWicket && cur.lastCelebration === 'WICKET') break;
      if (autoPauseMilestone && cur.lastCelebration === 'MILESTONE') break;
    }
    triggerBallAudio(cur);
    onUpdateMatch(cur);
  };

  const handleSimulateToEnd = () => {
    if (match.isCompleted) return;
    audioEngine.ensureStarted();
    let cur = match;
    let safety = 0;
    while (!cur.isCompleted && safety < 260) {
      cur = simulateNextDelivery(cur, state.players, state.teams);
      safety++;
    }
    triggerBallAudio(cur);
    onUpdateMatch(cur);
  };

  // Auto-play interval controller
  useEffect(() => {
    if (!isAutoPlaying || match.isCompleted) {
      if (match.isCompleted) setIsAutoPlaying(false);
      return;
    }

    const delayMs = playbackSpeed === 4 ? 320 : playbackSpeed === 2 ? 650 : 1250;
    const timer = window.setTimeout(() => {
      const updated = simulateNextDelivery(match, state.players, state.teams);
      triggerBallAudio(updated);
      onUpdateMatch(updated);

      if (autoPauseWicket && updated.lastCelebration === 'WICKET') {
        setIsAutoPlaying(false);
      } else if (autoPauseMilestone && updated.lastCelebration === 'MILESTONE') {
        setIsAutoPlaying(false);
      } else if (updated.isCompleted) {
        setIsAutoPlaying(false);
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [isAutoPlaying, match, playbackSpeed, autoPauseWicket, autoPauseMilestone]);

  // Scoreboard telemetry calculations
  const oversCompleted = `${Math.floor(match.ballsBowled / 6)}.${match.ballsBowled % 6}`;
  const totalBalls = match.totalOvers * 6;
  const ballsRemaining = Math.max(0, totalBalls - match.ballsBowled);
  const crr = match.ballsBowled > 0 ? ((match.score / match.ballsBowled) * 6).toFixed(2) : '0.00';
  const targetScore = match.target ?? (match.firstInningsScore ?? 186) + 1;
  const runsRequired = match.innings === 2 ? Math.max(0, targetScore - match.score) : 0;
  const rrr =
    match.innings === 2 && ballsRemaining > 0
      ? ((runsRequired / ballsRemaining) * 6).toFixed(2)
      : '0.00';
  const projectedTotal = Math.round(
    match.score + (parseFloat(crr) * ballsRemaining) / 6
  );

  // Apply Field Preset
  const handleSelectFieldPreset = (preset: FieldPreset) => {
    audioEngine.playClick();
    if (preset === 'Custom') {
      onUpdateMatch({ ...match, fieldPreset: 'Custom' });
      return;
    }
    const coords = getPresetFieldCoordinates(preset);
    const updatedFielders = match.fielders.map((f, idx) => ({
      ...f,
      label: coords[idx]?.label || f.label,
      x: coords[idx]?.x ?? f.x,
      y: coords[idx]?.y ?? f.y,
    }));
    onUpdateMatch({
      ...match,
      fieldPreset: preset,
      fielders: updatedFielders,
    });
  };

  // Dragging Fielder Tokens on Hawk-Eye SVG
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingFielderId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Keep fielder inside the boundary rope (radius 44 around 50,50)
    const dx = rawX - 50;
    const dy = rawY - 50;
    const dist = Math.hypot(dx, dy);
    const maxR = 43.5;
    const clampedX = dist > maxR ? 50 + (dx / dist) * maxR : rawX;
    const clampedY = dist > maxR ? 50 + (dy / dist) * maxR : rawY;

    const updatedFielders = match.fielders.map((f) =>
      f.id === draggingFielderId
        ? { ...f, x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 }
        : f
    );

    onUpdateMatch({
      ...match,
      fieldPreset: 'Custom',
      fielders: updatedFielders,
    });
  };

  const latestDelivery = match.commentaryLog[0];
  const recentDeliveries = match.commentaryLog.slice(0, 6);

  const getBallBadgeStyle = (label: string) => {
    switch (label) {
      case '4':
        return 'bg-[#23B875] text-[#07111F] border-[#23B875] font-bold';
      case '6':
        return 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B] font-bold';
      case 'W':
        return 'bg-[#E45B63] text-[#F4F6FA] border-[#E45B63] font-bold';
      case 'WD':
        return 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]';
      case '1':
      case '2':
      case '3':
        return 'bg-[#17283D] text-[#F4F6FA] border-[#38BDF8]/50';
      default:
        return 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552]';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. STADIUM BROADCAST HEADER & SCOREBOARD */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] overflow-hidden relative">
        {/* Night Stadium Aerial Backdrop with Floodlight Glow */}
        <img
          src="/src/assets/images/stadium_broadcast_aerial_1793957402211.jpg"
          alt="Live Stadium Broadcast Atmosphere"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111F]/95 via-[#07111F]/85 to-[#07111F]/95 pointer-events-none" />

        <div className="relative z-10 p-4 space-y-3">
          {/* Match Metadata Top Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552] pb-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-[#E45B63] tracking-wider">
                LIVE SIMULATION
              </span>
              <span aria-hidden="true" className="text-[#9BAABD]">·</span>
              <span className="font-semibold text-[#F4F6FA]">{match.competitionName}</span>
              <span aria-hidden="true" className="text-[#9BAABD]">·</span>
              <span className="font-mono text-[#D8B15B]">MATCH #{match.matchNumber}</span>
              <span aria-hidden="true" className="text-[#9BAABD]">·</span>
              <span className="text-[#9BAABD]">{match.venue}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9BAABD]">
              <span>Weather: <strong className="text-[#F4F6FA]">{match.weather}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Pitch: <strong className="text-[#D8B15B]">{match.pitchCondition}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Dew Factor: <strong className="text-[#38BDF8]">{match.dewFactor}</strong></span>
            </div>
          </div>

          {/* Broadcast Scorebug & Win Probability */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
            {/* Batting Team & Primary Score */}
            <div className="xl:col-span-5 flex items-center justify-between bg-[#0B1728]/90 border border-[#1F3552] rounded-[6px] p-3">
              <div className="flex items-center gap-3">
                <TeamBadge team={battingTeam} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-[#F4F6FA]">
                      {battingTeam.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#D8B15B] uppercase">
                      Batting · Inn {match.innings}
                    </span>
                  </div>
                  <div className="text-xs text-[#9BAABD]">
                    vs {bowlingTeam.name} {match.firstInningsScore !== null ? `(${match.firstInningsScore}/${match.firstInningsWickets})` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F4F6FA] tabular-nums tracking-tight">
                  {match.score}/{match.wickets}
                </div>
                <div className="font-mono text-xs text-[#38BDF8] tabular-nums">
                  {oversCompleted} <span className="text-[#9BAABD]">/ {match.totalOvers}.0 OVS</span>
                </div>
              </div>
            </div>

            {/* Telemetry Metrics (Target, Req Runs, Balls Rem, CRR, RRR, Proj) */}
            <div className="xl:col-span-4 grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-3 gap-2">
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">TARGET</div>
                <div className="font-mono text-sm font-bold text-[#D8B15B] tabular-nums">
                  {match.innings === 2 ? targetScore : '1st Inn'}
                </div>
              </div>
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">RUNS REQ</div>
                <div className="font-mono text-sm font-bold text-[#F4F6FA] tabular-nums">
                  {match.innings === 2 ? runsRequired : '-'}
                </div>
              </div>
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">BALLS REM</div>
                <div className="font-mono text-sm font-bold text-[#38BDF8] tabular-nums">
                  {ballsRemaining}
                </div>
              </div>
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">CURR RR</div>
                <div className="font-mono text-sm font-bold text-[#23B875] tabular-nums">
                  {crr}
                </div>
              </div>
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">REQ RR</div>
                <div className="font-mono text-sm font-bold text-[#E45B63] tabular-nums">
                  {match.innings === 2 ? rrr : '-'}
                </div>
              </div>
              <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
                <div className="text-[10px] text-[#9BAABD]">PROJECTED</div>
                <div className="font-mono text-sm font-bold text-[#F4F6FA] tabular-nums">
                  {projectedTotal}
                </div>
              </div>
            </div>

            {/* THIS OVER (6 Deliveries) + Dynamic Win Probability Bar */}
            <div className="xl:col-span-3 bg-[#0B1728]/90 border border-[#1F3552] rounded-[6px] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#9BAABD]">THIS OVER</span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const ball = match.currentOverBalls[idx];
                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded-[4px] border font-mono text-xs flex items-center justify-center tabular-nums ${
                          ball ? getBallBadgeStyle(ball) : 'bg-[#07111F] border-[#1F3552]/60 text-[#9BAABD]/30'
                        }`}
                      >
                        {ball || '·'}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Win Probability */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-[#23B875]">
                    {battingTeam.shortCode} WIN {match.winProbabilityBattingTeam}%
                  </span>
                  <span className="text-[#38BDF8]">
                    {bowlingTeam.shortCode} WIN {100 - match.winProbabilityBattingTeam}%
                  </span>
                </div>
                <div className="h-2 bg-[#07111F] rounded-full overflow-hidden flex border border-[#1F3552]">
                  <div
                    className="h-full bg-[#23B875] transition-all duration-300"
                    style={{ width: `${match.winProbabilityBattingTeam}%` }}
                  />
                  <div
                    className="h-full bg-[#38BDF8] transition-all duration-300"
                    style={{ width: `${100 - match.winProbabilityBattingTeam}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Match Celebration / Result Banner when triggered */}
          {(match.isCompleted || match.lastCelebration !== 'NONE') && (
            <div
              className={`px-4 py-2 rounded-[6px] border flex items-center justify-between text-xs font-mono ${
                match.isCompleted
                  ? 'bg-[#D8B15B]/20 border-[#D8B15B] text-[#D8B15B]'
                  : match.lastCelebration === 'WICKET'
                  ? 'bg-[#E45B63]/20 border-[#E45B63] text-[#E45B63]'
                  : match.lastCelebration === 'SIX'
                  ? 'bg-[#D8B15B]/20 border-[#D8B15B] text-[#D8B15B]'
                  : 'bg-[#23B875]/20 border-[#23B875] text-[#23B875]'
              }`}
            >
              <span className="font-bold tracking-wider">
                {match.isCompleted
                  ? `MATCH COMPLETED · ${match.resultText.toUpperCase()}`
                  : match.lastCelebration === 'WICKET'
                  ? `WICKET CELEBRATION! ${latestDelivery?.batsmanName} dismissed — Stadium Roar Peak!`
                  : match.lastCelebration === 'SIX'
                  ? `MAXIMUM SIX CELEBRATION! Crowd erupts as ${latestDelivery?.batsmanName} clears the ropes!`
                  : match.lastCelebration === 'MILESTONE'
                  ? `BATSMAN MILESTONE! ${striker.fullName} raises the bat to the pavilion!`
                  : `BOUNDARY FOUR! Precision placement to the fence!`}
              </span>
              <span className="text-[#F4F6FA]">{latestDelivery?.overLabel} OVS</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN BROADCAST WAR ROOM: LEFT (BATTING/BOWLING) · CENTRE (HAWK-EYE OVAL) · RIGHT (TACTICAL DIRECTIVES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT PANEL: BATTING & BOWLING TELEMETRY (3 COLS) */}
        <div className="lg:col-span-3 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-[#1F3552] pb-2 flex items-center justify-between">
              <h2 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
                ACTIVE MATCHUP TELEMETRY
              </h2>
              <span className="font-mono text-[11px] text-[#D8B15B] tabular-nums">
                P&apos;SHIP {match.partnershipRuns} ({match.partnershipBalls})
              </span>
            </div>

            {/* Striker Card */}
            <div className="bg-[#17283D] border border-[#D8B15B]/60 rounded-[6px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#D8B15B]">STRIKER ★</span>
                <span className="font-mono text-xs font-bold text-[#F4F6FA] tabular-nums">
                  SR {strikerStat.balls > 0 ? ((strikerStat.runs / strikerStat.balls) * 100).toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PlayerPortrait player={striker} team={battingTeam} size="sm" />
                  <div>
                    <div className="font-display text-sm font-bold text-[#F4F6FA]">
                      {striker.fullName}
                    </div>
                    <div className="text-[11px] text-[#9BAABD]">{striker.battingHand}</div>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-lg font-extrabold text-[#D8B15B]">
                    {strikerStat.runs}* <span className="text-xs font-normal text-[#9BAABD]">({strikerStat.balls})</span>
                  </div>
                  <div className="text-[10px] text-[#9BAABD]">
                    4s: {strikerStat.fours} · 6s: {strikerStat.sixes}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                <div>
                  <div className="flex justify-between text-[#9BAABD]">
                    <span>Confidence</span>
                    <span className="text-[#23B875]">{Math.round(strikerStat.confidence)}%</span>
                  </div>
                  <div className="h-1 bg-[#07111F] rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-[#23B875]" style={{ width: `${strikerStat.confidence}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[#9BAABD]">
                    <span>Fatigue</span>
                    <span className="text-[#38BDF8]">{Math.round(strikerStat.fatigue)}%</span>
                  </div>
                  <div className="h-1 bg-[#07111F] rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-[#38BDF8]" style={{ width: `${strikerStat.fatigue}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Striker Card */}
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#9BAABD]">NON-STRIKER</span>
                <span className="font-mono text-xs text-[#9BAABD] tabular-nums">
                  SR {nonStrikerStat.balls > 0 ? ((nonStrikerStat.runs / nonStrikerStat.balls) * 100).toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PlayerPortrait player={nonStriker} team={battingTeam} size="sm" />
                  <div>
                    <div className="font-display text-sm font-bold text-[#F4F6FA]">
                      {nonStriker.fullName}
                    </div>
                    <div className="text-[11px] text-[#9BAABD]">{nonStriker.battingHand}</div>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-base font-bold text-[#F4F6FA]">
                    {nonStrikerStat.runs}* <span className="text-xs font-normal text-[#9BAABD]">({nonStrikerStat.balls})</span>
                  </div>
                  <div className="text-[10px] text-[#9BAABD]">
                    4s: {nonStrikerStat.fours} · 6s: {nonStrikerStat.sixes}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Bowler Card */}
            <div className="bg-[#0B1728] border border-[#38BDF8]/50 rounded-[6px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#38BDF8]">CURRENT BOWLER</span>
                <span className="font-mono text-xs text-[#38BDF8] tabular-nums">
                  ECON{' '}
                  {bowlerStat.ballsBowled > 0
                    ? ((bowlerStat.runsConceded / bowlerStat.ballsBowled) * 6).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PlayerPortrait player={bowler} team={bowlingTeam} size="sm" />
                  <div>
                    <div className="font-display text-sm font-bold text-[#F4F6FA]">
                      {bowler.fullName}
                    </div>
                    <div className="text-[11px] text-[#9BAABD]">{bowler.bowlingStyle}</div>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-base font-bold text-[#38BDF8]">
                    {bowlerStat.wickets}/{bowlerStat.runsConceded}
                  </div>
                  <div className="text-[10px] text-[#9BAABD]">
                    {Math.floor(bowlerStat.ballsBowled / 6)}.{bowlerStat.ballsBowled % 6} Overs
                  </div>
                </div>
              </div>

              {/* Bowler Fatigue & Confidence */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                <div>
                  <div className="flex justify-between text-[#9BAABD]">
                    <span>Rhythm</span>
                    <span className="text-[#23B875]">{Math.round(bowlerStat.confidence)}%</span>
                  </div>
                  <div className="h-1 bg-[#07111F] rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-[#23B875]" style={{ width: `${bowlerStat.confidence}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[#9BAABD]">
                    <span>Spell Fatigue</span>
                    <span className="text-[#E45B63]">{Math.round(bowlerStat.fatigue)}%</span>
                  </div>
                  <div className="h-1 bg-[#07111F] rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-[#E45B63]" style={{ width: `${bowlerStat.fatigue}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Switch Active Bowler Dropdown */}
          <div className="pt-2 border-t border-[#1F3552]">
            <label className="block text-[11px] text-[#9BAABD] mb-1">
              Tactical Bowling Change (Select Bowler)
            </label>
            <select
              value={match.currentBowlerId}
              onChange={(e) => {
                audioEngine.playClick();
                onUpdateMatch({ ...match, currentBowlerId: e.target.value });
              }}
              className="w-full h-9 px-2.5 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA] font-medium focus:outline-none focus:border-[#D8B15B]"
            >
              {match.bowlingOptionsIds.map((id) => {
                const p = state.players[id];
                if (!p) return null;
                const st = match.bowlingStats[id];
                const ov = st ? `${Math.floor(st.ballsBowled / 6)}.${st.ballsBowled % 6}` : '0.0';
                return (
                  <option key={id} value={id}>
                    {p.fullName} ({p.role}) — {st ? `${st.wickets}/${st.runsConceded} (${ov})` : '0/0 (0.0)'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* CENTRE PANEL: HAWK-EYE PITCH & FIELD VIEW (6 COLS) */}
        <div className="lg:col-span-6 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552] pb-2.5 mb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
                HAWK-EYE 360° OVAL FIELD & TRAJECTORY RADAR
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Drag any fielder token on the turf to customize defensive angles
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-[#38BDF8]">
                <span className="w-2.5 h-0.5 bg-[#38BDF8] inline-block" /> Ball Path
              </span>
              <span className="flex items-center gap-1 text-[#23B875]">
                <span className="w-2.5 h-0.5 bg-[#23B875] inline-block" /> Shot Vector
              </span>
              <span className="text-[#D8B15B]">Field: {match.fieldPreset}</span>
            </div>
          </div>

          {/* Interactive Top-Down Oval Cricket Field SVG */}
          <div className="relative flex items-center justify-center my-auto py-1">
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={() => setDraggingFielderId(null)}
              onPointerLeave={() => setDraggingFielderId(null)}
              className="w-full max-w-[440px] aspect-square select-none touch-none rounded-full border border-[#1F3552] bg-[#07111F] shadow-inner"
            >
              <defs>
                <radialGradient id="turfGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#144330" />
                  <stop offset="55%" stopColor="#0E3324" />
                  <stop offset="92%" stopColor="#092218" />
                  <stop offset="100%" stopColor="#07111F" />
                </radialGradient>
              </defs>

              {/* Lush Stadium Turf Oval */}
              <circle cx="50" cy="50" r="48" fill="url(#turfGrad)" />

              {/* Concentric Mowed Turf Stripes */}
              {[12, 20, 28, 36, 44].map((r) => (
                <circle
                  key={r}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="3"
                />
              ))}

              {/* Boundary Rope (Radius 44) */}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#F4F6FA"
                strokeWidth="0.7"
                strokeOpacity="0.75"
              />

              {/* 30-Yard Fielding Restriction Circle (Radius 24) */}
              <ellipse
                cx="50"
                cy="50"
                rx="23"
                ry="25"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="0.45"
                strokeDasharray="1.8,1.5"
                strokeOpacity="0.75"
              />

              {/* Central Cricket Pitch Strip */}
              <rect
                x="47.2"
                y="34"
                width="5.6"
                height="32"
                rx="0.6"
                fill="#C4A472"
                stroke="#D8B15B"
                strokeWidth="0.35"
              />
              {/* Popping Crease Lines */}
              <line x1="47.2" y1="37" x2="52.8" y2="37" stroke="#F4F6FA" strokeWidth="0.35" />
              <line x1="47.2" y1="63" x2="52.8" y2="63" stroke="#F4F6FA" strokeWidth="0.35" />

              {/* Previous Deliveries Subtle Wagon Wheel */}
              {recentDeliveries.slice(1).map((del) => (
                <line
                  key={del.id}
                  x1="50"
                  y1="37.5"
                  x2={del.shotEnd.x}
                  y2={del.shotEnd.y}
                  stroke="#38BDF8"
                  strokeWidth="0.35"
                  strokeOpacity="0.28"
                />
              ))}

              {/* Active Delivery Ball Trajectory (Bowler -> Pitch Bounce -> Shot Vector) */}
              {latestDelivery && (
                <g>
                  {/* Bowler release to pitch bounce (Cyan Telemetry) */}
                  <line
                    x1="50"
                    y1="63"
                    x2={latestDelivery.pitchBounce.x}
                    y2={latestDelivery.pitchBounce.y}
                    stroke="#38BDF8"
                    strokeWidth="0.85"
                  />
                  {/* Pitch bounce to Striker bat */}
                  <line
                    x1={latestDelivery.pitchBounce.x}
                    y1={latestDelivery.pitchBounce.y}
                    x2="50"
                    y2="37.5"
                    stroke="#38BDF8"
                    strokeWidth="0.85"
                  />
                  {/* Pitch Bounce Impact Ring */}
                  <circle
                    cx={latestDelivery.pitchBounce.x}
                    cy={latestDelivery.pitchBounce.y}
                    r="1.3"
                    fill="#38BDF8"
                  />
                  {/* Shot Direction Vector (Emerald / Gold / Danger) */}
                  <line
                    x1="50"
                    y1="37.5"
                    x2={latestDelivery.shotEnd.x}
                    y2={latestDelivery.shotEnd.y}
                    stroke={
                      latestDelivery.isWicket
                        ? '#E45B63'
                        : latestDelivery.isBoundarySix
                        ? '#D8B15B'
                        : '#23B875'
                    }
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={latestDelivery.shotEnd.x}
                    cy={latestDelivery.shotEnd.y}
                    r="1.7"
                    fill={
                      latestDelivery.isWicket
                        ? '#E45B63'
                        : latestDelivery.isBoundarySix
                        ? '#D8B15B'
                        : '#23B875'
                    }
                  />
                </g>
              )}

              {/* Striker Token (Top Crease) */}
              <circle cx="50" cy="37" r="1.9" fill="#D8B15B" stroke="#07111F" strokeWidth="0.5" />
              {/* Non-Striker Token (Bottom Crease Side) */}
              <circle cx="54.2" cy="62.5" r="1.6" fill="#D8B15B" stroke="#07111F" strokeWidth="0.5" />
              {/* Bowler Token (Bottom Run-up) */}
              <circle cx="50" cy="67.5" r="1.9" fill="#E45B63" stroke="#F4F6FA" strokeWidth="0.5" />

              {/* 9 Movable Fielder Tokens */}
              {match.fielders.map((fielder, index) => {
                const isCaptainToken = index === 4; // Mid-Off Captain indicator
                return (
                  <g
                    key={fielder.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDraggingFielderId(fielder.id);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <circle
                      cx={fielder.x}
                      cy={fielder.y}
                      r={isCaptainToken ? '2.4' : '2.0'}
                      fill={isCaptainToken ? '#D8B15B' : '#0B1728'}
                      stroke="#38BDF8"
                      strokeWidth="0.65"
                    />
                    <text
                      x={fielder.x}
                      y={fielder.y - 3}
                      textAnchor="middle"
                      className="fill-[#F4F6FA] text-[2.4px] font-mono pointer-events-none"
                    >
                      {isCaptainToken ? `${fielder.label} (C)` : fielder.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Last Ball Hawk-Eye Speed & Telemetry Footer */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F3552] text-xs font-mono">
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
              <span className="text-[#9BAABD] block text-[10px]">RELEASE SPEED</span>
              <span className="text-[#38BDF8] font-bold tabular-nums">
                {latestDelivery ? `${latestDelivery.speedKph} KPH` : '141.2 KPH'}
              </span>
            </div>
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
              <span className="text-[#9BAABD] block text-[10px]">PITCH LINE / LENGTH</span>
              <span className="text-[#F4F6FA] font-bold">
                {match.bowlingDelivery}
              </span>
            </div>
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[4px] px-2.5 py-1.5">
              <span className="text-[#9BAABD] block text-[10px]">BATTER INTENT</span>
              <span className="text-[#D8B15B] font-bold">
                {match.battingMindset}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: TACTICAL DIRECTIVES (3 COLS) */}
        <div className="lg:col-span-3 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3.5">
          {/* 0. Saved Tactical Formation Presets (Auto-adjusts Field + Bowling Aggression) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-1">
              <span className="font-display text-xs font-bold text-[#D8B15B] tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> FORMATION PRESET
              </span>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('matchprep')}
                  className="text-[10px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
                >
                  Match Prep & Toss →
                </button>
              )}
            </div>
            <select
              value={match.activeFormationId || formations[0]?.id}
              onChange={(e) => {
                const found = formations.find((f) => f.id === e.target.value);
                if (found) handleApplyFormationPreset(found);
              }}
              className="w-full h-8 px-2 rounded-[4px] bg-[#0B1728] border border-[#D8B15B]/50 text-xs text-[#F4F6FA] font-medium cursor-pointer"
            >
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.formatTag} · {f.bowlingAggressiveness})
                </option>
              ))}
            </select>
          </div>

          {/* 1. Batting Directives */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-1">
              <span className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider">
                1. BATTING MINDSET
              </span>
              <span className="font-mono text-[10px] text-[#D8B15B]">{match.battingMindset}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BATTING_DIRECTIVES.map((dir) => {
                const active = match.battingMindset === dir;
                return (
                  <button
                    key={dir}
                    onClick={() => {
                      audioEngine.playClick();
                      onUpdateMatch({ ...match, battingMindset: dir });
                    }}
                    className={`h-7 px-2.5 rounded-[4px] font-medium text-xs border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B] font-bold'
                        : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA] hover:bg-[#17283D]'
                    }`}
                  >
                    {dir}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Bowling Aggressiveness & Delivery */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-1">
              <span className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider">
                2. BOWLING AGGRESSION & LINE
              </span>
              <span className="font-mono text-[10px] text-[#38BDF8]">
                {match.bowlingAggressiveness || 'Balanced Control'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 pb-1">
              {BOWLING_AGGRESSIVENESS_LEVELS.map((agg) => {
                const isAct =
                  (match.bowlingAggressiveness || 'Balanced Control') === agg;
                const shortLabel =
                  agg === 'High Aggression'
                    ? 'Aggressive'
                    : agg === 'Balanced Control'
                    ? 'Balanced'
                    : 'Contain';
                return (
                  <button
                    key={agg}
                    onClick={() => {
                      audioEngine.playClick();
                      onUpdateMatch({ ...match, bowlingAggressiveness: agg });
                    }}
                    className={`h-7 px-1.5 rounded-[4px] font-mono text-[10px] border transition-colors cursor-pointer ${
                      isAct
                        ? 'bg-[#E45B63] text-[#F4F6FA] border-[#E45B63] font-bold'
                        : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA]'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BOWLING_DELIVERIES.map((del) => {
                const active = match.bowlingDelivery === del;
                return (
                  <button
                    key={del}
                    onClick={() => {
                      audioEngine.playClick();
                      onUpdateMatch({ ...match, bowlingDelivery: del });
                    }}
                    className={`h-7 px-2 rounded-[4px] font-medium text-xs border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#38BDF8] text-[#07111F] border-[#38BDF8] font-bold'
                        : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA] hover:bg-[#17283D]'
                    }`}
                  >
                    {del}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Field Setup Directives */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-1">
              <span className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider">
                3. FIELD PLACEMENT
              </span>
              <span className="font-mono text-[10px] text-[#23B875]">{match.fieldPreset}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_PRESETS.map((preset) => {
                const active = match.fieldPreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleSelectFieldPreset(preset)}
                    className={`h-7 px-2.5 rounded-[4px] font-medium text-xs border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#23B875] text-[#07111F] border-[#23B875] font-bold'
                        : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA] hover:bg-[#17283D]'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stadium Crowd Intensity Readout */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#9BAABD] flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[#D8B15B]" />
                <span>Stadium Crowd Decibels</span>
              </span>
              <span className="font-mono text-[#D8B15B] font-bold tabular-nums">
                {Math.round(82 + audioEngine.getCrowdIntensity() * 28)} dB
              </span>
            </div>
            <div className="h-1.5 bg-[#07111F] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#23B875] via-[#D8B15B] to-[#E45B63] transition-all duration-300"
                style={{ width: `${Math.min(100, audioEngine.getCrowdIntensity() * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIMULATION PLAYBACK CONTROLLER & LIVE COMMENTARY STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PLAYBACK CONTROLLER (5 COLS) */}
        <div className="lg:col-span-5 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
            <h3 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
              SIMULATION PLAYBACK CONTROLLER
            </h3>
            <button
              onClick={() => {
                audioEngine.playClick();
                setIsAutoPlaying(false);
                onResetMatch();
              }}
              className="text-xs text-[#9BAABD] hover:text-[#F4F6FA] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Match</span>
            </button>
          </div>

          {/* Primary Simulation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleNextBall}
              disabled={match.isCompleted}
              className="h-10 px-3 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] disabled:opacity-40 text-[#07111F] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Next Ball</span>
            </button>

            <button
              onClick={handleSimulateOver}
              disabled={match.isCompleted}
              className="h-10 px-3 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] disabled:opacity-40 border border-[#1F3552] text-[#F4F6FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <SkipForward className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Sim Over</span>
            </button>

            <button
              onClick={() => {
                audioEngine.ensureStarted();
                setIsAutoPlaying(!isAutoPlaying);
              }}
              disabled={match.isCompleted}
              className={`h-10 px-3 rounded-[4px] font-semibold text-xs flex items-center justify-center gap-1.5 border transition-colors whitespace-nowrap ${
                isAutoPlaying
                  ? 'bg-[#E45B63] text-[#F4F6FA] border-[#E45B63]'
                  : 'bg-[#17283D] text-[#23B875] border-[#23B875]/50 hover:bg-[#1F3552]'
              }`}
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Auto-Play</span>
                </>
              )}
            </button>

            <button
              onClick={handleSimulateToEnd}
              disabled={match.isCompleted}
              className="h-10 px-3 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] disabled:opacity-40 border border-[#1F3552] text-[#F4F6FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FastForward className="w-3.5 h-3.5 text-[#D8B15B]" />
              <span>Sim to End</span>
            </button>
          </div>

          {/* Speed & Auto-Pause Checkboxes */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F3552] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#9BAABD]">Speed:</span>
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-[4px] font-mono text-xs border ${
                    playbackSpeed === spd
                      ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B] font-bold'
                      : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#9BAABD]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPauseWicket}
                  onChange={(e) => setAutoPauseWicket(e.target.checked)}
                  className="accent-[#D8B15B]"
                />
                <span>Pause on Wicket</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPauseMilestone}
                  onChange={(e) => setAutoPauseMilestone(e.target.checked)}
                  className="accent-[#D8B15B]"
                />
                <span>Pause on 50/100</span>
              </label>
            </div>
          </div>
        </div>

        {/* BALL-BY-BALL COMMENTARY STREAM (7 COLS) */}
        <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2 mb-2.5">
            <h3 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
              LIVE BROADCAST BALL-BY-BALL TELEMETRY FEED
            </h3>
            <span className="font-mono text-[11px] text-[#9BAABD] tabular-nums">
              Showing last {match.commentaryLog.length} deliveries
            </span>
          </div>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {match.commentaryLog.map((item) => (
              <div
                key={item.id}
                className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5 flex items-start gap-3 text-xs"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-[#9BAABD] w-9 tabular-nums">
                    {item.overLabel}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-[4px] border font-mono text-xs flex items-center justify-center tabular-nums ${getBallBadgeStyle(
                      item.badgeLabel
                    )}`}
                  >
                    {item.badgeLabel}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9BAABD]">
                    <span>
                      <strong className="text-[#F4F6FA]">{item.bowlerName}</strong> to{' '}
                      <strong className="text-[#F4F6FA]">{item.batsmanName}</strong>
                    </span>
                    <span className="font-mono text-[#38BDF8] tabular-nums">
                      {item.speedKph} kph · {item.matchContextNote}
                    </span>
                  </div>
                  <p className="text-[#F4F6FA] mt-0.5 leading-snug">{item.commentary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
