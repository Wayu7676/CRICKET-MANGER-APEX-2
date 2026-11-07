import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  CheckCircle2,
  GripVertical,
  Plus,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  BattingMindset,
  BowlingAggressiveness,
  BowlingDelivery,
  CustomFormationPreset,
  FieldPreset,
  GameSaveState,
  MatchFormat,
  PlayerRole,
  RealCricketer,
  TeamInfo,
} from '../types/cricket';
import {
  DEFAULT_FORMATION_PRESETS,
  getPresetFieldCoordinates,
  smartAutoSelectBestXI,
} from '../data/realCricketers';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';
import { audioEngine } from '../engine/audioEngine';

interface SquadScreenProps {
  state: GameSaveState;
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  onUpdateTeam: (updatedTeam: TeamInfo) => void;
  onUpdatePlayerInstruction: (
    playerId: string,
    instruction: RealCricketer['tacticalInstruction']
  ) => void;
  onSaveFormationPreset?: (preset: CustomFormationPreset) => void;
  onApplyFormationPreset?: (preset: CustomFormationPreset) => void;
  onDeleteFormationPreset?: (presetId: string) => void;
}

type FilterCategory =
  | 'All'
  | 'Batsmen'
  | 'Bowlers'
  | 'All-rounders'
  | 'Wicketkeepers'
  | 'Academy';

export const SquadScreen: React.FC<SquadScreenProps> = ({
  state,
  selectedPlayerId,
  onSelectPlayer,
  onUpdateTeam,
  onUpdatePlayerInstruction,
  onSaveFormationPreset,
  onApplyFormationPreset,
  onDeleteFormationPreset,
}) => {
  const userTeam = state.teams[state.userTeamId];
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [confirmBanner, setConfirmBanner] = useState<string | null>(null);
  const [autoSelectReasons, setAutoSelectReasons] = useState<string[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Custom Formation Preset Builder State
  const formations =
    state.customFormations && state.customFormations.length > 0
      ? state.customFormations
      : DEFAULT_FORMATION_PRESETS;
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetFormat, setNewPresetFormat] = useState<MatchFormat>('T20');
  const [newPresetField, setNewPresetField] = useState<FieldPreset>(
    state.liveMatch.fieldPreset || 'Attacking'
  );
  const [newPresetAggression, setNewPresetAggression] =
    useState<BowlingAggressiveness>(
      state.liveMatch.bowlingAggressiveness || 'High Aggression'
    );
  const [newPresetDelivery, setNewPresetDelivery] = useState<BowlingDelivery>(
    state.liveMatch.bowlingDelivery || 'Yorker'
  );
  const [newPresetMindset, setNewPresetMindset] = useState<BattingMindset>(
    state.liveMatch.battingMindset || 'Attack'
  );

  const playingXIPlayers: RealCricketer[] = userTeam.playingXIIds
    .map((id) => state.players[id])
    .filter(Boolean);

  const benchIds = userTeam.squadPlayerIds.filter(
    (id) => !userTeam.playingXIIds.includes(id)
  );
  const benchPlayers: RealCricketer[] = benchIds
    .map((id) => state.players[id])
    .filter(Boolean);

  const allSquadPlayers = [...playingXIPlayers, ...benchPlayers];

  const activePlayer: RealCricketer =
    (selectedPlayerId && state.players[selectedPlayerId]) ||
    playingXIPlayers[0] ||
    Object.values(state.players)[0];

  // Calculate Top 9 Squad Metrics
  const squadStrength = Math.round(
    playingXIPlayers.reduce((s, p) => s + p.gameAttributes.ovr, 0) /
      Math.max(1, playingXIPlayers.length)
  );
  const totalPlayers = allSquadPlayers.length;
  const overseasInXI = playingXIPlayers.filter((p) => p.isOverseasInIPL).length;
  const maxOverseasXI = state.mode === 'FRANCHISE_T20' ? 4 : 11;
  const avgAge = (
    allSquadPlayers.reduce((s, p) => s + p.age, 0) / Math.max(1, allSquadPlayers.length)
  ).toFixed(1);
  const fitnessReserve = Math.round(
    allSquadPlayers.reduce((s, p) => s + p.gameAttributes.fitness, 0) /
      Math.max(1, allSquadPlayers.length)
  );
  const battingDepth = Math.min(
    99,
    Math.round(
      playingXIPlayers.reduce(
        (s, p) => s + (p.gameAttributes.battingTiming + p.gameAttributes.battingPower) / 2,
        0
      ) /
        Math.max(1, playingXIPlayers.length) +
        11
    )
  );
  const deathBowling = Math.round(
    playingXIPlayers
      .slice(-5)
      .reduce((s, p) => s + p.gameAttributes.deathBowling, 0) / 5
  );
  const spinChoke = Math.round(
    playingXIPlayers
      .filter((p) => p.role === 'Spin Bowler' || p.role === 'All-Rounder')
      .reduce((s, p) => s + p.gameAttributes.control, 0) /
      Math.max(
        1,
        playingXIPlayers.filter((p) => p.role === 'Spin Bowler' || p.role === 'All-Rounder').length
      )
  );
  const fieldingAgility = Math.round(
    playingXIPlayers.reduce((s, p) => s + p.gameAttributes.fieldingReflexes, 0) /
      Math.max(1, playingXIPlayers.length)
  );

  // Filter helper
  const matchesFilter = (p: RealCricketer) => {
    switch (activeFilter) {
      case 'Batsmen':
        return p.role === 'Batsman';
      case 'Bowlers':
        return p.role === 'Fast Bowler' || p.role === 'Spin Bowler';
      case 'All-rounders':
        return p.role === 'All-Rounder';
      case 'Wicketkeepers':
        return p.role === 'Wicketkeeper';
      case 'Academy':
        return Boolean(p.isAcademyProspect || p.age <= 24);
      default:
        return true;
    }
  };

  const filteredXI = playingXIPlayers.filter(matchesFilter);
  const filteredBench = benchPlayers.filter(matchesFilter);

  // Validation rules for Playing XI
  const hasWicketkeeper = playingXIPlayers.some(
    (p) => p.id === userTeam.wicketkeeperId || p.role === 'Wicketkeeper'
  );
  const bowlingOptionsCount = playingXIPlayers.filter(
    (p) => p.role === 'Fast Bowler' || p.role === 'Spin Bowler' || p.role === 'All-Rounder'
  ).length;
  const isOverseasValid = overseasInXI <= maxOverseasXI;
  const isXIValid =
    userTeam.playingXIIds.length === 11 &&
    hasWicketkeeper &&
    bowlingOptionsCount >= 5 &&
    isOverseasValid;

  // Move batting order up/down
  const handleMoveOrder = (indexInXI: number, direction: -1 | 1) => {
    const targetIdx = indexInXI + direction;
    if (targetIdx < 0 || targetIdx >= userTeam.playingXIIds.length) return;
    audioEngine.playClick();
    const nextXI = [...userTeam.playingXIIds];
    const temp = nextXI[indexInXI];
    nextXI[indexInXI] = nextXI[targetIdx];
    nextXI[targetIdx] = temp;
    onUpdateTeam({ ...userTeam, playingXIIds: nextXI });
  };

  // Drag & Drop reorder in Playing XI
  const handleDropOnIndex = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    audioEngine.playClick();
    const nextXI = [...userTeam.playingXIIds];
    const [moved] = nextXI.splice(draggedIdx, 1);
    nextXI.splice(targetIdx, 0, moved);
    setDraggedIdx(null);
    onUpdateTeam({ ...userTeam, playingXIIds: nextXI });
  };

  // Swap between Playing XI and Bench or within XI
  const handleSwapClick = (clickedId: string) => {
    audioEngine.playClick();
    if (!swapSourceId) {
      setSwapSourceId(clickedId);
      return;
    }
    if (swapSourceId === clickedId) {
      setSwapSourceId(null);
      return;
    }

    const nextXI = [...userTeam.playingXIIds];
    const idxA = nextXI.indexOf(swapSourceId);
    const idxB = nextXI.indexOf(clickedId);

    if (idxA !== -1 && idxB !== -1) {
      nextXI[idxA] = clickedId;
      nextXI[idxB] = swapSourceId;
    } else if (idxA !== -1 && idxB === -1) {
      nextXI[idxA] = clickedId;
    } else if (idxA === -1 && idxB !== -1) {
      nextXI[idxB] = swapSourceId;
    }

    setSwapSourceId(null);
    onUpdateTeam({ ...userTeam, playingXIIds: nextXI });
  };

  // Smart 10-Factor Auto-Select Best XI
  const handleAutoSwapBestXI = () => {
    audioEngine.playNavigate();
    const oppTeam =
      state.teams[state.liveMatch.opponentTeamId] || Object.values(state.teams)[1];
    const result = smartAutoSelectBestXI({
      squadPlayers: allSquadPlayers,
      format: state.liveMatch.format || 'T20',
      pitch: state.liveMatch.pitchCondition,
      mode: state.mode,
      opponentReputation: oppTeam?.reputation || 90,
      currentCaptainId: userTeam.captainId,
    });

    onUpdateTeam({
      ...userTeam,
      playingXIIds: result.playingXIIds,
      captainId: result.captainId,
      viceCaptainId: result.viceCaptainId,
      wicketkeeperId: result.wicketkeeperId,
    });
    setAutoSelectReasons(result.explanations);
    setConfirmBanner(
      `Smart Auto-Select Best XI deployed for ${state.liveMatch.format || 'T20'} on ${state.liveMatch.pitchCondition}!`
    );
  };

  const handleCreateCustomPreset = () => {
    if (!newPresetName.trim()) return;
    audioEngine.playClick();
    const coords =
      newPresetField === 'Custom'
        ? state.liveMatch.fielders.map((f) => ({ label: f.label, x: f.x, y: f.y }))
        : getPresetFieldCoordinates(newPresetField);

    const created: CustomFormationPreset = {
      id: `preset_custom_${Date.now()}`,
      name: newPresetName.trim(),
      formatTag: newPresetFormat,
      description: `Custom ${newPresetFormat} formation (${newPresetField} field · ${newPresetAggression} · ${newPresetDelivery} delivery).`,
      fieldPreset: newPresetField,
      bowlingAggressiveness: newPresetAggression,
      defaultDelivery: newPresetDelivery,
      defaultBattingMindset: newPresetMindset,
      fielderCoordinates: coords,
      isBuiltIn: false,
    };

    if (onSaveFormationPreset) {
      onSaveFormationPreset(created);
    }
    setNewPresetName('');
    setShowPresetForm(false);
    setConfirmBanner(
      `Saved & applied custom formation preset "${created.name}" to Match Engine!`
    );
  };

  const handleConfirmXI = () => {
    audioEngine.playClick();
    if (!isXIValid) {
      setConfirmBanner(
        `Invalid Playing XI: Check overseas quota (${overseasInXI}/${maxOverseasXI}) and minimum 5 bowling options (${bowlingOptionsCount}/5).`
      );
      return;
    }
    audioEngine.playBroadcastSting([440, 554.37, 659.25]);
    setConfirmBanner(
      `Playing XI Confirmed & Locked for Match #${state.liveMatch.matchNumber}! Live Match Centre lineup synchronized.`
    );
  };

  // Player Detail Attribute Radar (5 axes)
  const playerRadarAxes = [
    { label: 'Power', value: activePlayer.gameAttributes.battingPower, angle: -90 },
    { label: 'Timing', value: activePlayer.gameAttributes.battingTiming, angle: -18 },
    { label: 'Control', value: activePlayer.gameAttributes.control, angle: 54 },
    { label: 'Variations', value: activePlayer.gameAttributes.variations, angle: 126 },
    { label: 'Fielding', value: activePlayer.gameAttributes.fieldingReflexes, angle: 198 },
  ];

  const getPt = (val: number, angleDeg: number, rMax = 58) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = (val / 100) * rMax;
    return `${85 + r * Math.cos(rad)},${80 + r * Math.sin(rad)}`;
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP 9 SQUAD TELEMETRY METRICS BAR */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-3.5">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {[
            { label: 'Squad Strength', val: `${squadStrength} OVR`, color: 'text-[#D8B15B]' },
            { label: 'Total Players', val: `${totalPlayers}`, color: 'text-[#F4F6FA]' },
            {
              label: 'Overseas Slots',
              val: `${overseasInXI} / ${maxOverseasXI} XI`,
              color: isOverseasValid ? 'text-[#38BDF8]' : 'text-[#E45B63]',
            },
            { label: 'Average Age', val: `${avgAge} Yrs`, color: 'text-[#F4F6FA]' },
            { label: 'Fitness Reserve', val: `${fitnessReserve}%`, color: 'text-[#23B875]' },
            { label: 'Batting Depth', val: `${battingDepth}/100`, color: 'text-[#23B875]' },
            { label: 'Death Bowling', val: `${deathBowling}/100`, color: 'text-[#38BDF8]' },
            { label: 'Spin Choke', val: `${spinChoke}/100`, color: 'text-[#38BDF8]' },
            { label: 'Fielding Agility', val: `${fieldingAgility}/100`, color: 'text-[#D8B15B]' },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-2.5 py-2"
            >
              <div className="text-[10px] text-[#9BAABD] truncate">{m.label}</div>
              <div className={`font-mono text-sm font-bold tabular-nums mt-0.5 ${m.color}`}>
                {m.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FILTER CONTROLS + AUTO-SWAP & CONFIRM XI ACTION BAR */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            ['All', 'Batsmen', 'Bowlers', 'All-rounders', 'Wicketkeepers', 'Academy'] as FilterCategory[]
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                audioEngine.playClick();
                setActiveFilter(cat);
              }}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === cat
                  ? 'bg-[#D8B15B] text-[#07111F] font-bold'
                  : 'bg-[#0B1728] text-[#9BAABD] border border-[#1F3552] hover:text-[#F4F6FA]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Auto-Swap & Confirm XI */}
        <div className="flex items-center gap-2.5">
          {swapSourceId && (
            <span className="text-xs font-mono text-[#38BDF8]">
              Select target player to swap with {state.players[swapSourceId]?.shortName}
            </span>
          )}
          <button
            onClick={handleAutoSwapBestXI}
            className="px-3.5 py-1.5 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#D8B15B]/50 text-xs font-bold text-[#D8B15B] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D8B15B]" />
            <span>AUTO SELECT BEST XI</span>
          </button>
          <button
            onClick={handleConfirmXI}
            className="px-4 py-1.5 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] text-[#07111F] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm XI</span>
          </button>
        </div>
      </div>

      {/* 2B. TACTICAL FORMATION PRESETS DEPLOYMENT & CUSTOM PRESET SAVER */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552] pb-2.5">
          <div>
            <h2 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D8B15B]" />
              TACTICAL FORMATION PRESETS — FIELDING & BOWLING AGGRESSIVENESS
            </h2>
            <p className="text-[11px] text-[#9BAABD]">
              Select a tactical preset or save a custom formation to automatically adjust Hawk-Eye fielding coordinates and bowling aggressiveness in the match engine
            </p>
          </div>
          <button
            onClick={() => {
              audioEngine.playClick();
              setShowPresetForm(!showPresetForm);
            }}
            className="px-3 py-1.5 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#38BDF8]/50 text-xs font-semibold text-[#38BDF8] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showPresetForm ? 'Close Preset Builder' : 'Save Custom Formation Preset'}</span>
          </button>
        </div>

        {/* Custom Formation Builder Form */}
        {showPresetForm && (
          <div className="bg-[#0B1728] border border-[#38BDF8]/40 rounded-[6px] p-3.5 space-y-3">
            <div className="text-xs font-display font-bold text-[#38BDF8] uppercase tracking-wider">
              Create & Save New Custom Tactical Formation Preset
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div className="lg:col-span-2">
                <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g., Powerplay Pace Blitz"
                  className="w-full h-8 px-2.5 rounded bg-[#101F32] border border-[#1F3552] text-xs text-[#F4F6FA]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                  Format Tag
                </label>
                <select
                  value={newPresetFormat}
                  onChange={(e) => setNewPresetFormat(e.target.value as MatchFormat)}
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-xs text-[#F4F6FA]"
                >
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                  Fielding Ring
                </label>
                <select
                  value={newPresetField}
                  onChange={(e) => setNewPresetField(e.target.value as FieldPreset)}
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-xs text-[#23B875]"
                >
                  <option value="Attacking">Attacking</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Defensive">Defensive</option>
                  <option value="Death Overs">Death Overs</option>
                  <option value="Custom">Current Custom Oval</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                  Bowling Aggression
                </label>
                <select
                  value={newPresetAggression}
                  onChange={(e) =>
                    setNewPresetAggression(e.target.value as BowlingAggressiveness)
                  }
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-xs text-[#D8B15B]"
                >
                  <option value="High Aggression">High Aggression</option>
                  <option value="Balanced Control">Balanced Control</option>
                  <option value="Defensive Containment">Defensive Containment</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                  Default Delivery
                </label>
                <select
                  value={newPresetDelivery}
                  onChange={(e) =>
                    setNewPresetDelivery(e.target.value as BowlingDelivery)
                  }
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-xs text-[#38BDF8]"
                >
                  <option value="Yorker">Yorker</option>
                  <option value="Bouncer">Bouncer</option>
                  <option value="Good Length">Good Length</option>
                  <option value="Short Ball">Short Ball</option>
                  <option value="Slower Ball">Slower Ball</option>
                  <option value="Wide Line">Wide Line</option>
                  <option value="Off-stump">Off-stump</option>
                  <option value="Leg-stump">Leg-stump</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#9BAABD]">Default Batting Mindset:</span>
                {(['Defend', 'Rotate Strike', 'Balanced', 'Attack', 'Loft'] as BattingMindset[]).map(
                  (m) => (
                    <button
                      key={m}
                      onClick={() => setNewPresetMindset(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        newPresetMindset === m
                          ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B] font-bold'
                          : 'bg-[#101F32] text-[#9BAABD] border-[#1F3552]'
                      }`}
                    >
                      {m}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleCreateCustomPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 rounded-[4px] bg-[#23B875] hover:bg-[#2ad185] disabled:opacity-40 text-[#07111F] font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Save & Deploy Preset
              </button>
            </div>
          </div>
        )}

        {/* Saved Formation Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {formations.map((preset) => {
            const isActive = state.liveMatch.activeFormationId === preset.id;
            return (
              <div
                key={preset.id}
                className={`p-3 rounded-[6px] border flex flex-col justify-between transition-colors ${
                  isActive
                    ? 'bg-[#17283D] border-[#D8B15B]'
                    : 'bg-[#0B1728] border-[#1F3552] hover:border-[#38BDF8]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-xs text-[#F4F6FA]">
                      {preset.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#101F32] border border-[#1F3552] font-mono text-[10px] text-[#38BDF8]">
                        {preset.formatTag}
                      </span>
                      {!preset.isBuiltIn && onDeleteFormationPreset && (
                        <button
                          onClick={() => onDeleteFormationPreset(preset.id)}
                          title="Delete Custom Preset"
                          className="p-1 text-[#9BAABD] hover:text-[#E45B63] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9BAABD] mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#1F3552]/70 space-y-2">
                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#23B875]">
                      Field: {preset.fieldPreset}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#D8B15B]">
                      {preset.bowlingAggressiveness}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#38BDF8]">
                      {preset.defaultDelivery}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      audioEngine.playClick();
                      if (onApplyFormationPreset) {
                        onApplyFormationPreset(preset);
                      }
                      setConfirmBanner(
                        `Deployed "${preset.name}" — Match Engine set to ${preset.fieldPreset} field, ${preset.bowlingAggressiveness}, & ${preset.defaultDelivery}!`
                      );
                    }}
                    className={`w-full py-1.5 rounded-[4px] font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#D8B15B] text-[#07111F]'
                        : 'bg-[#101F32] hover:bg-[#17283D] text-[#F4F6FA] border border-[#1F3552]'
                    }`}
                  >
                    {isActive ? 'ACTIVE IN MATCH ENGINE ✓' : 'Deploy Formation Preset'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmBanner && (
        <div
          className={`px-4 py-2.5 rounded-[6px] border text-xs font-mono flex items-center justify-between ${
            isXIValid
              ? 'bg-[#23B875]/15 border-[#23B875] text-[#23B875]'
              : 'bg-[#E45B63]/15 border-[#E45B63] text-[#E45B63]'
          }`}
        >
          <span>{confirmBanner}</span>
          <button onClick={() => setConfirmBanner(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {autoSelectReasons.length > 0 && (
        <div className="bg-[#101F32] border border-[#23B875]/40 rounded-[6px] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#23B875]">
              SMART AUTO-SELECT 10-FACTOR ANALYSIS (MANAGER OVERRIDE ENABLED)
            </span>
            <button
              onClick={() => setAutoSelectReasons([])}
              className="text-[10px] text-[#9BAABD] hover:text-[#F4F6FA] underline"
            >
              Hide Report
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-[#F4F6FA]">
            {autoSelectReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[#D8B15B] font-mono">•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MAIN SPLIT: PLAYING XI & BENCH SHEET (8 COLS) + PLAYER DETAIL INSPECTOR (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: PLAYING XI IN BATTING ORDER + BENCH POOL (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* PLAYING XI SHEET */}
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552] pb-2.5">
              <div>
                <h2 className="font-display text-sm font-bold text-[#F4F6FA] tracking-wide">
                  STARTING PLAYING XI — BATTING ORDER DEPLOYMENT
                </h2>
                <p className="text-[11px] text-[#9BAABD]">
                  Drag rows or use arrows to reorder batting lineup · Click Swap to rotate with Bench
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className={bowlingOptionsCount >= 5 ? 'text-[#23B875]' : 'text-[#E45B63]'}>
                  Bowlers: {bowlingOptionsCount}/5+
                </span>
                <span className={isOverseasValid ? 'text-[#38BDF8]' : 'text-[#E45B63]'}>
                  Overseas: {overseasInXI}/{maxOverseasXI}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {filteredXI.map((player) => {
                const actualOrderIdx = userTeam.playingXIIds.indexOf(player.id);
                const isSelected = activePlayer.id === player.id;
                const isSwapSource = swapSourceId === player.id;
                const isCapt = userTeam.captainId === player.id;
                const isWk = userTeam.wicketkeeperId === player.id;

                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => setDraggedIdx(actualOrderIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnIndex(actualOrderIdx)}
                    onClick={() => {
                      audioEngine.playClick();
                      onSelectPlayer(player.id);
                    }}
                    className={`min-h-[44px] px-3 py-1.5 rounded-[6px] border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSwapSource
                        ? 'bg-[#17283D] border-[#38BDF8]'
                        : isSelected
                        ? 'bg-[#17283D] border-[#D8B15B]'
                        : 'bg-[#0B1728] border-[#1F3552] hover:bg-[#17283D]/60'
                    }`}
                  >
                    {/* Left: Batting Order # + Drag Handle + Portrait + Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-[#9BAABD] cursor-grab shrink-0" />
                      <span className="font-mono text-xs font-bold text-[#D8B15B] w-6 tabular-nums">
                        #{actualOrderIdx + 1}
                      </span>
                      <PlayerPortrait player={player} team={userTeam} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-xs sm:text-sm font-bold text-[#F4F6FA] truncate">
                            {player.fullName}
                          </span>
                          <span className="font-mono text-[10px] text-[#9BAABD] tabular-nums">
                            #{player.jerseyNumber}
                          </span>
                          {isCapt && (
                            <span className="font-mono text-[10px] font-bold text-[#D8B15B]">
                              [C]
                            </span>
                          )}
                          {isWk && (
                            <span className="font-mono text-[10px] font-bold text-[#38BDF8]">
                              [WK]
                            </span>
                          )}
                          {player.isOverseasInIPL && (
                            <span className="font-mono text-[10px] text-[#9BAABD]">
                              · OS
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#9BAABD] truncate">
                          {player.role} · {player.battingHand} · {player.nationality}
                        </div>
                      </div>
                    </div>

                    {/* Right: OVR, Fitness, Form, Role Badges & Reorder Controls */}
                    <div className="flex items-center gap-3 ml-auto shrink-0">
                      <div className="text-right font-mono text-xs tabular-nums">
                        <span className="text-[#9BAABD] text-[10px] block">OVR</span>
                        <span className="font-bold text-[#D8B15B]">{player.gameAttributes.ovr}</span>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums hidden sm:block">
                        <span className="text-[#9BAABD] text-[10px] block">FIT</span>
                        <span className="font-bold text-[#23B875]">{player.gameAttributes.fitness}%</span>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums hidden sm:block">
                        <span className="text-[#9BAABD] text-[10px] block">FORM</span>
                        <span className="font-bold text-[#38BDF8]">{player.gameAttributes.form}</span>
                      </div>

                      {/* Reorder & Swap Action Buttons */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveOrder(actualOrderIdx, -1)}
                          disabled={actualOrderIdx === 0}
                          title="Move Up Batting Order"
                          className="p-1 rounded bg-[#101F32] hover:bg-[#1F3552] disabled:opacity-30 border border-[#1F3552] text-[#F4F6FA]"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(actualOrderIdx, 1)}
                          disabled={actualOrderIdx === userTeam.playingXIIds.length - 1}
                          title="Move Down Batting Order"
                          className="p-1 rounded bg-[#101F32] hover:bg-[#1F3552] disabled:opacity-30 border border-[#1F3552] text-[#F4F6FA]"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleSwapClick(player.id)}
                          className={`px-2 py-1 rounded text-[10px] font-mono border ${
                            isSwapSource
                              ? 'bg-[#38BDF8] text-[#07111F] border-[#38BDF8] font-bold'
                              : 'bg-[#101F32] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA]'
                          }`}
                        >
                          {isSwapSource ? 'Cancel' : 'Swap'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BENCH & RESERVE DEPTH POOL */}
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
              <div>
                <h3 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
                  BENCH, RESERVES & ACADEMY PROSPECTS ({filteredBench.length})
                </h3>
                <p className="text-[11px] text-[#9BAABD]">
                  Click &quot;Swap into XI&quot; to rotate any reserve into the starting lineup
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredBench.map((player) => {
                const isSwapSource = swapSourceId === player.id;
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer(player.id)}
                    className={`p-2.5 rounded-[6px] border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSwapSource
                        ? 'bg-[#17283D] border-[#38BDF8]'
                        : activePlayer.id === player.id
                        ? 'bg-[#17283D] border-[#D8B15B]'
                        : 'bg-[#0B1728] border-[#1F3552] hover:bg-[#17283D]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerPortrait player={player} team={userTeam} size="sm" />
                      <div className="min-w-0">
                        <div className="font-display text-xs font-bold text-[#F4F6FA] truncate">
                          {player.fullName}
                        </div>
                        <div className="text-[11px] text-[#9BAABD] truncate">
                          {player.role} · {player.nationality} {player.isAcademyProspect ? '· Academy' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-xs font-bold text-[#D8B15B] tabular-nums">
                        {player.gameAttributes.ovr}
                      </span>
                      <button
                        onClick={() => handleSwapClick(player.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono border ${
                          isSwapSource
                            ? 'bg-[#38BDF8] text-[#07111F] border-[#38BDF8] font-bold'
                            : 'bg-[#101F32] text-[#38BDF8] border-[#38BDF8]/40 hover:bg-[#17283D]'
                        }`}
                      >
                        {swapSourceId ? 'Confirm Swap' : 'Swap'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT-SIDE PLAYER DETAIL INSPECTOR PANEL (4 COLS) */}
        <div className="lg:col-span-4 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-4 sticky top-4">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
            <span className="font-mono text-xs font-bold text-[#D8B15B]">
              PLAYER TACTICAL DOSSIER
            </span>
            <span className="font-mono text-xs text-[#38BDF8]">
              #{activePlayer.jerseyNumber} · {activePlayer.countryCode}
            </span>
          </div>

          {/* Portrait + Full Name + Role + OVR */}
          <div className="flex items-center gap-3.5 bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
            <PlayerPortrait player={activePlayer} team={userTeam} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#F4F6FA] truncate">
                  {activePlayer.fullName}
                </h3>
                <span className="font-mono text-base font-extrabold text-[#D8B15B] tabular-nums">
                  {activePlayer.gameAttributes.ovr}
                </span>
              </div>
              <div className="text-xs text-[#38BDF8] font-medium">
                {activePlayer.role} · {activePlayer.nationality}
              </div>
              <div className="text-[11px] text-[#9BAABD] mt-0.5">
                Age {activePlayer.age} · Contract: ₹{activePlayer.gameAttributes.contractSalaryCr.toFixed(2)} Cr
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  onClick={() => {
                    audioEngine.playClick();
                    onUpdateTeam({ ...userTeam, captainId: activePlayer.id });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                    userTeam.captainId === activePlayer.id
                      ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B] font-bold'
                      : 'bg-[#101F32] text-[#9BAABD] border-[#1F3552]'
                  }`}
                >
                  {userTeam.captainId === activePlayer.id ? 'Captain [C]' : 'Assign C'}
                </button>
                <button
                  onClick={() => {
                    audioEngine.playClick();
                    onUpdateTeam({ ...userTeam, viceCaptainId: activePlayer.id });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                    userTeam.viceCaptainId === activePlayer.id
                      ? 'bg-[#23B875] text-[#07111F] border-[#23B875] font-bold'
                      : 'bg-[#101F32] text-[#9BAABD] border-[#1F3552]'
                  }`}
                >
                  {userTeam.viceCaptainId === activePlayer.id ? 'Vice-Capt [VC]' : 'Assign VC'}
                </button>
                <button
                  onClick={() => {
                    audioEngine.playClick();
                    onUpdateTeam({ ...userTeam, wicketkeeperId: activePlayer.id });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                    userTeam.wicketkeeperId === activePlayer.id
                      ? 'bg-[#38BDF8] text-[#07111F] border-[#38BDF8] font-bold'
                      : 'bg-[#101F32] text-[#9BAABD] border-[#1F3552]'
                  }`}
                >
                  {userTeam.wicketkeeperId === activePlayer.id ? 'Keeper [WK]' : 'Assign WK'}
                </button>
              </div>
            </div>
          </div>

          {/* Attribute Radar + Form / Morale / Potential */}
          <div className="grid grid-cols-2 gap-3 items-center bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
            <svg viewBox="0 0 170 160" className="w-36 h-32 mx-auto overflow-visible">
              {[33, 66, 100].map((lvl) => (
                <polygon
                  key={lvl}
                  points={playerRadarAxes.map((a) => getPt(lvl, a.angle)).join(' ')}
                  fill="none"
                  stroke="#1F3552"
                  strokeWidth="1"
                />
              ))}
              <polygon
                points={playerRadarAxes.map((a) => getPt(a.value, a.angle)).join(' ')}
                fill="rgba(216, 177, 91, 0.24)"
                stroke="#D8B15B"
                strokeWidth="2"
              />
              {playerRadarAxes.map((a) => {
                const lPt = getPt(122, a.angle).split(',');
                return (
                  <text
                    key={a.label}
                    x={lPt[0]}
                    y={lPt[1]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-[#9BAABD] text-[8px] font-mono"
                  >
                    {a.label}
                  </text>
                );
              })}
            </svg>

            <div className="space-y-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#9BAABD] block text-[10px]">FORM RATING</span>
                <span className="text-[#23B875] font-bold">{activePlayer.gameAttributes.form}/99</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">MORALE</span>
                <span className="text-[#38BDF8] font-bold">{activePlayer.gameAttributes.morale}%</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">POTENTIAL CEILING</span>
                <span className="text-[#D8B15B] font-bold">{activePlayer.gameAttributes.potential} OVR</span>
              </div>
            </div>
          </div>

          {/* Verified Batting & Bowling Statistics */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 space-y-2">
            <div className="text-[10px] font-mono text-[#D8B15B]">
              VERIFIED CAREER BATTING & BOWLING STATS
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#9BAABD] block text-[10px]">MATCHES</span>
                <span className="text-[#F4F6FA] font-bold">{activePlayer.verifiedStats.matches}</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">RUNS</span>
                <span className="text-[#F4F6FA] font-bold">{activePlayer.verifiedStats.runs}</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">BAT AVG / SR</span>
                <span className="text-[#23B875] font-bold">
                  {activePlayer.verifiedStats.battingAvg} / {activePlayer.verifiedStats.strikeRate}
                </span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">100s / 50s</span>
                <span className="text-[#D8B15B] font-bold">
                  {activePlayer.verifiedStats.hundreds} / {activePlayer.verifiedStats.fifties}
                </span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">WICKETS</span>
                <span className="text-[#38BDF8] font-bold">{activePlayer.verifiedStats.wickets}</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">ECON / BEST</span>
                <span className="text-[#38BDF8] font-bold">
                  {activePlayer.verifiedStats.economy ?? '-'} ({activePlayer.verifiedStats.bestBowling})
                </span>
              </div>
            </div>
          </div>

          {/* Individual Match Tactical Instructions */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 space-y-2.5">
            <div className="text-[10px] font-mono text-[#38BDF8]">
              INDIVIDUAL MATCH & DEVELOPMENT DIRECTIVES
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-[#9BAABD] block mb-1">Preferred Batting Role</label>
                <select
                  value={activePlayer.tacticalInstruction.preferredBattingPhase}
                  onChange={(e) =>
                    onUpdatePlayerInstruction(activePlayer.id, {
                      ...activePlayer.tacticalInstruction,
                      preferredBattingPhase: e.target.value as RealCricketer['tacticalInstruction']['preferredBattingPhase'],
                    })
                  }
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-[#F4F6FA] text-xs"
                >
                  <option value="Powerplay">Powerplay Aggressor</option>
                  <option value="Anchor">Innings Anchor</option>
                  <option value="Middle Overs">Middle Overs Spin Hitter</option>
                  <option value="Death Finisher">Death Overs Finisher</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#9BAABD] block mb-1">Training Focus Drill</label>
                <select
                  value={activePlayer.tacticalInstruction.trainingFocus}
                  onChange={(e) =>
                    onUpdatePlayerInstruction(activePlayer.id, {
                      ...activePlayer.tacticalInstruction,
                      trainingFocus: e.target.value as RealCricketer['tacticalInstruction']['trainingFocus'],
                    })
                  }
                  className="w-full h-8 px-2 rounded bg-[#101F32] border border-[#1F3552] text-[#F4F6FA] text-xs"
                >
                  <option value="Power Hitting">Range & Power Hitting</option>
                  <option value="Strike Rotation">Gap Placement & Strike Rotation</option>
                  <option value="Yorker Accuracy">Death Overs Yorker Execution</option>
                  <option value="Spin Variations">Wrist & Finger Spin Variations</option>
                  <option value="Athletic Fielding">High-Velocity Reflex Fielding</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
