import React, { useState } from 'react';
import {
  CustomFormationPreset,
  GameSaveState,
  LiveMatchState,
  MatchFormat,
  RealCricketer,
  ScreenId,
} from '../types/cricket';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';
import {
  DEFAULT_FORMATION_PRESETS,
  getDefaultFielders,
  smartAutoSelectBestXI,
} from '../data/realCricketers';
import { audioEngine } from '../engine/audioEngine';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Flame,
  Play,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import stadiumHeroImg from '../assets/images/stadium_night_hero_1793957400239.jpg';

interface MatchPrepScreenProps {
  state: GameSaveState;
  onUpdateState: (updater: (prev: GameSaveState) => GameSaveState) => void;
  onNavigate: (screen: ScreenId) => void;
  onInspectPlayer: (player: RealCricketer) => void;
}

export const MatchPrepScreen: React.FC<MatchPrepScreenProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onInspectPlayer,
}) => {
  const userTeam = state.teams[state.userTeamId];
  const nextFixture =
    state.fixtures.find((f) => !f.completed) || state.fixtures[0];
  const oppTeamId =
    nextFixture.homeTeamId === state.userTeamId
      ? nextFixture.awayTeamId
      : nextFixture.homeTeamId;
  const oppTeam = state.teams[oppTeamId] || Object.values(state.teams)[1];

  const formations =
    state.customFormations && state.customFormations.length > 0
      ? state.customFormations
      : DEFAULT_FORMATION_PRESETS;

  const [isCustomMatch, setIsCustomMatch] = useState<boolean>(
    Boolean(state.liveMatch.isCustomMatch)
  );
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(
    state.liveMatch.format || 'T20'
  );
  const [customOvers, setCustomOvers] = useState<number>(
    state.liveMatch.totalOvers || 20
  );
  const [customTarget, setCustomTarget] = useState<number>(0);
  const [pitchCondition, setPitchCondition] = useState<
    LiveMatchState['pitchCondition']
  >(state.liveMatch.pitchCondition || nextFixture.pitch);
  const [weatherCondition, setWeatherCondition] = useState<
    LiveMatchState['weather']
  >(state.liveMatch.weather || nextFixture.weather);
  const [dewCondition, setDewCondition] = useState<LiveMatchState['dewFactor']>(
    state.liveMatch.dewFactor || 'Moderate (45%)'
  );
  const [difficulty, setDifficulty] = useState<
    'Standard' | 'Challenger' | 'Elite'
  >(state.liveMatch.difficulty || 'Challenger');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    state.liveMatch.activeFormationId || formations[0].id
  );

  // Smart Auto Select explanation state
  const [autoSelectReasons, setAutoSelectReasons] = useState<string[]>([
    'Balanced Playing XI loaded for current pitch & format.',
  ]);

  // Interactive Toss state
  const [tossPhase, setTossPhase] = useState<
    'READY' | 'FLIPPING' | 'CALL_MADE' | 'DECIDED'
  >(state.liveMatch.tossCompleted ? 'DECIDED' : 'READY');
  const [userCoinCall, setUserCoinCall] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [tossExplanation, setTossExplanation] = useState<string>(
    state.liveMatch.tossWinnerTeamId
      ? `${state.teams[state.liveMatch.tossWinnerTeamId]?.shortCode} won the toss and elected to ${state.liveMatch.tossDecision?.toLowerCase()} first.`
      : ''
  );

  const squadPlayers = userTeam.squadPlayerIds
    .map((id) => state.players[id])
    .filter(Boolean);
  const playingXI = userTeam.playingXIIds
    .map((id) => state.players[id])
    .filter(Boolean);
  const reservePlayers = squadPlayers.filter(
    (p) => !userTeam.playingXIIds.includes(p.id)
  );

  const selectedBowlerIds = state.liveMatch.bowlingOptionsIds.filter((id) =>
    userTeam.playingXIIds.includes(id)
  );

  const handleSmartAutoSelect = () => {
    audioEngine.playClick();
    const result = smartAutoSelectBestXI({
      squadPlayers,
      format: matchFormat,
      pitch: pitchCondition,
      mode: state.mode,
      opponentReputation: oppTeam.reputation,
      currentCaptainId: userTeam.captainId,
    });

    setAutoSelectReasons(result.explanations);

    onUpdateState((prev) => {
      const team = { ...prev.teams[prev.userTeamId] };
      team.playingXIIds = result.playingXIIds;
      team.captainId = result.captainId;
      team.viceCaptainId = result.viceCaptainId;
      team.wicketkeeperId = result.wicketkeeperId;

      return {
        ...prev,
        teams: { ...prev.teams, [prev.userTeamId]: team },
        liveMatch: {
          ...prev.liveMatch,
          battingOrderIds:
            prev.liveMatch.battingTeamId === prev.userTeamId
              ? result.playingXIIds
              : prev.liveMatch.battingOrderIds,
          bowlingOptionsIds: result.bowlingOptionsIds,
        },
      };
    });
  };

  const handleMoveOrder = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= userTeam.playingXIIds.length) return;
    audioEngine.playClick();
    onUpdateState((prev) => {
      const team = { ...prev.teams[prev.userTeamId] };
      const nextXI = [...team.playingXIIds];
      const temp = nextXI[index];
      nextXI[index] = nextXI[targetIdx];
      nextXI[targetIdx] = temp;
      team.playingXIIds = nextXI;
      return {
        ...prev,
        teams: { ...prev.teams, [prev.userTeamId]: team },
      };
    });
  };

  const handleSwapReserveWithXI = (reserveId: string, xiIdToReplace: string) => {
    audioEngine.playClick();
    onUpdateState((prev) => {
      const team = { ...prev.teams[prev.userTeamId] };
      const idx = team.playingXIIds.indexOf(xiIdToReplace);
      if (idx === -1) return prev;
      const nextXI = [...team.playingXIIds];
      nextXI[idx] = reserveId;
      team.playingXIIds = nextXI;
      return {
        ...prev,
        teams: { ...prev.teams, [prev.userTeamId]: team },
      };
    });
  };

  const handleSetRoleBadge = (
    playerId: string,
    roleType: 'CAPTAIN' | 'VICE_CAPTAIN' | 'KEEPER'
  ) => {
    audioEngine.playClick();
    onUpdateState((prev) => {
      const team = { ...prev.teams[prev.userTeamId] };
      if (roleType === 'CAPTAIN') team.captainId = playerId;
      if (roleType === 'VICE_CAPTAIN') team.viceCaptainId = playerId;
      if (roleType === 'KEEPER') team.wicketkeeperId = playerId;
      return {
        ...prev,
        teams: { ...prev.teams, [prev.userTeamId]: team },
      };
    });
  };

  const handleToggleBowlerOption = (playerId: string) => {
    audioEngine.playClick();
    onUpdateState((prev) => {
      const current = prev.liveMatch.bowlingOptionsIds;
      const exists = current.includes(playerId);
      const nextBowlers = exists
        ? current.length > 2
          ? current.filter((id) => id !== playerId)
          : current
        : [...current, playerId];
      return {
        ...prev,
        liveMatch: {
          ...prev.liveMatch,
          bowlingOptionsIds: nextBowlers,
        },
      };
    });
  };

  const handleApplyFormationPreset = (preset: CustomFormationPreset) => {
    audioEngine.playClick();
    setSelectedPresetId(preset.id);
    onUpdateState((prev) => {
      const customFielders = preset.fielderCoordinates.map((coord, idx) => ({
        id: `f_${idx}`,
        label: coord.label,
        x: coord.x,
        y: coord.y,
        playerId:
          userTeam.playingXIIds[idx] ||
          prev.liveMatch.fielders[idx]?.playerId ||
          userTeam.playingXIIds[0],
      }));
      return {
        ...prev,
        liveMatch: {
          ...prev.liveMatch,
          fieldPreset: preset.fieldPreset,
          bowlingAggressiveness: preset.bowlingAggressiveness,
          bowlingDelivery: preset.defaultDelivery,
          battingMindset: preset.defaultBattingMindset,
          activeFormationId: preset.id,
          fielders: customFielders,
        },
      };
    });
  };

  const handleFlipCoin = (call: 'HEADS' | 'TAILS') => {
    setUserCoinCall(call);
    setTossPhase('FLIPPING');
    audioEngine.playCoinFlip();

    setTimeout(() => {
      const actual: 'HEADS' | 'TAILS' =
        Math.random() < 0.52 ? call : call === 'HEADS' ? 'TAILS' : 'HEADS';
      setCoinResult(actual);
      const userWon = actual === call;
      const winner = userWon ? state.userTeamId : oppTeam.id;

      if (userWon) {
        setTossPhase('CALL_MADE');
      } else {
        // AI makes intelligent toss decision based on pitch, dew, format
        let aiChoice: 'BAT' | 'BOWL' = 'BOWL';
        let reason = '';
        if (
          dewCondition.toLowerCase().includes('heavy') ||
          dewCondition.toLowerCase().includes('moderate')
        ) {
          aiChoice = 'BOWL';
          reason = `${oppTeam.name} elected to BOWL first due to ${dewCondition.toLowerCase()} expected under floodlights.`;
        } else if (
          pitchCondition === 'Dry Spinning Deck' ||
          matchFormat === 'Test'
        ) {
          aiChoice = 'BAT';
          reason = `${oppTeam.name} elected to BAT first to make best use of the fresh ${pitchCondition.toLowerCase()} before fourth-innings wear.`;
        } else if (pitchCondition === 'Green Seam Surface') {
          aiChoice = 'BOWL';
          reason = `${oppTeam.name} elected to BOWL first to exploit early seam movement on the ${pitchCondition.toLowerCase()}.`;
        } else {
          aiChoice = 'BAT';
          reason = `${oppTeam.name} elected to BAT first and post scoreboard pressure on the ${pitchCondition.toLowerCase()}.`;
        }
        setTossExplanation(reason);
        setTossPhase('DECIDED');
        finalizeMatchSetup(winner, aiChoice);
      }
    }, 850);
  };

  const handleUserTossChoice = (decision: 'BAT' | 'BOWL') => {
    audioEngine.playClick();
    const reason = `${userTeam.name} won the toss and elected to ${decision} first (${pitchCondition} · ${dewCondition}).`;
    setTossExplanation(reason);
    setTossPhase('DECIDED');
    finalizeMatchSetup(state.userTeamId, decision);
  };

  const finalizeMatchSetup = (
    winnerTeamId: string,
    decision: 'BAT' | 'BOWL'
  ) => {
    const userBatsFirst =
      (winnerTeamId === state.userTeamId && decision === 'BAT') ||
      (winnerTeamId !== state.userTeamId && decision === 'BOWL');

    const battingTeamId = userBatsFirst ? state.userTeamId : oppTeam.id;
    const bowlingTeamId = userBatsFirst ? oppTeam.id : state.userTeamId;

    onUpdateState((prev) => {
      const batTeam = prev.teams[battingTeamId];
      const bowlTeam = prev.teams[bowlingTeamId];
      const batOrder = [...batTeam.playingXIIds];
      const bowlOptions =
        bowlingTeamId === prev.userTeamId &&
        prev.liveMatch.bowlingOptionsIds.length >= 4
          ? prev.liveMatch.bowlingOptionsIds
          : bowlTeam.playingXIIds.slice(-5);

      const activePreset =
        (prev.customFormations || DEFAULT_FORMATION_PRESETS).find(
          (p) => p.id === selectedPresetId
        ) || DEFAULT_FORMATION_PRESETS[0];

      const fielders = activePreset
        ? activePreset.fielderCoordinates.map((c, i) => ({
            id: `f_${i}`,
            label: c.label,
            x: c.x,
            y: c.y,
            playerId: bowlTeam.playingXIIds[i] || bowlTeam.playingXIIds[0],
          }))
        : getDefaultFielders(bowlTeam.playingXIIds);

      const battingStats: LiveMatchState['battingStats'] = {};
      for (const id of batOrder) {
        battingStats[id] = {
          playerId: id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalText: 'not out',
          fatigue: 6,
          confidence: 80,
        };
      }

      const bowlingStats: LiveMatchState['bowlingStats'] = {};
      for (const id of bowlOptions) {
        bowlingStats[id] = {
          playerId: id,
          ballsBowled: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          fatigue: 8,
          confidence: 82,
        };
      }

      const overs = isCustomMatch
        ? customOvers
        : matchFormat === 'T20'
        ? 20
        : matchFormat === 'ODI'
        ? 50
        : 90;

      return {
        ...prev,
        liveMatch: {
          ...prev.liveMatch,
          matchNumber: nextFixture.matchNumber,
          format: matchFormat,
          isCustomMatch,
          difficulty,
          innings: isCustomMatch && customTarget > 0 ? 2 : 1,
          battingTeamId,
          bowlingTeamId,
          score: 0,
          wickets: 0,
          ballsBowled: 0,
          totalOvers: overs,
          target: isCustomMatch && customTarget > 0 ? customTarget : null,
          firstInningsScore:
            isCustomMatch && customTarget > 0 ? customTarget - 1 : null,
          pitchCondition,
          weather: weatherCondition,
          temperatureHumidity: '28°C · 64% Humidity',
          dewFactor: dewCondition,
          groundDimensions: '68m Square · 74m Straight',
          startTime: '19:30 IST (Night Floodlights)',
          tossWinnerTeamId: winnerTeamId,
          tossDecision: decision,
          tossCompleted: true,
          strikerId: batOrder[0],
          nonStrikerId: batOrder[1],
          currentBowlerId: bowlOptions[0],
          partnershipRuns: 0,
          partnershipBalls: 0,
          battingOrderIds: batOrder,
          bowlingOptionsIds: bowlOptions,
          battingStats,
          bowlingStats,
          currentOverBalls: [],
          commentaryLog: [
            {
              id: `toss_${Date.now()}`,
              innings: 1,
              overNumber: 0,
              ballInOver: 0,
              overLabel: '0.0',
              bowlerName: prev.players[bowlOptions[0]]?.fullName || 'Bowler',
              batsmanName: prev.players[batOrder[0]]?.fullName || 'Opener',
              runs: 0,
              isBoundaryFour: false,
              isBoundarySix: false,
              isWicket: false,
              isExtra: false,
              badgeLabel: '0',
              commentary: `TOSS CONFIRMED: ${prev.teams[winnerTeamId]?.name} won the toss and elected to ${decision} first at ${nextFixture.venue}. Umpires walk out to the middle!`,
              matchContextNote: `${matchFormat} · ${overs} Overs · ${pitchCondition}`,
              pitchBounce: { x: 50, y: 44 },
              shotEnd: { x: 50, y: 50 },
              speedKph: 141.5,
            },
          ],
          overHistoryRuns: [],
          fielders,
          winProbabilityBattingTeam: 52,
          isCompleted: false,
          winnerTeamId: null,
          resultText: '',
          lastCelebration: 'NONE',
        },
      };
    });
  };

  const handleLaunchMatch = () => {
    if (tossPhase !== 'DECIDED') {
      finalizeMatchSetup(state.userTeamId, 'BOWL');
    }
    audioEngine.triggerCrowdReaction('MATCH_INTRO');
    onNavigate('match');
  };

  const userCaptain = state.players[userTeam.captainId] || playingXI[0];
  const oppCaptain =
    state.players[oppTeam.captainId] ||
    state.players[oppTeam.playingXIIds[0]];
  const overseasInXI = playingXI.filter((p) => p.isOverseasInIPL).length;

  return (
    <div className="space-y-5">
      {/* A. PRE-MATCH INFORMATION BANNER */}
      <div className="relative rounded-[8px] overflow-hidden border border-[#1F3552] bg-[#101F32]">
        <img
          src={stadiumHeroImg}
          alt="Pre-Match Stadium"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111F]/95 via-[#07111F]/85 to-[#07111F]/90" />

        <div className="relative z-10 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#D8B15B] text-[#07111F] rounded-[3px]">
                MATCH PREPARATION OPERATIONS
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#17283D] text-[#38BDF8] border border-[#1F3552] rounded-[3px]">
                {state.liveMatch.competitionName} · MATCH #{nextFixture.matchNumber}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#23B875]/15 text-[#23B875] border border-[#23B875]/30 rounded-[3px]">
                FORMAT: {matchFormat} ({isCustomMatch ? customOvers : matchFormat === 'T20' ? 20 : matchFormat === 'ODI' ? 50 : 90} OVERS)
              </span>
              {nextFixture.isRivalryDerby && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#E45B63]/20 text-[#E45B63] border border-[#E45B63]/40 rounded-[3px] flex items-center gap-1">
                  <Flame className="w-3 h-3" /> {nextFixture.rivalryName || 'MARQUEE RIVALRY DERBY'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-3">
                <TeamBadge team={userTeam} size="lg" />
                <div>
                  <div className="font-display font-black text-xl text-[#F4F6FA] tracking-tight">
                    {userTeam.name}
                  </div>
                  <div className="text-[11px] text-[#9BAABD]">
                    Capt: {userCaptain?.shortName} · Chemistry {state.teamChemistry ?? 91}%
                  </div>
                </div>
              </div>

              <div className="px-3 py-1 rounded bg-[#07111F]/90 border border-[#1F3552] font-mono text-xs font-bold text-[#D8B15B]">
                VS
              </div>

              <div className="flex items-center gap-3">
                <TeamBadge team={oppTeam} size="lg" />
                <div>
                  <div className="font-display font-black text-xl text-[#F4F6FA] tracking-tight">
                    {oppTeam.name}
                  </div>
                  <div className="text-[11px] text-[#9BAABD]">
                    Capt: {oppCaptain?.shortName} · Rep {oppTeam.reputation}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Conditions Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded px-3 py-2">
              <div className="text-[10px] text-[#9BAABD] uppercase flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#D8B15B]" /> Venue & Ground
              </div>
              <div className="text-xs font-semibold text-[#F4F6FA] truncate mt-0.5">
                {nextFixture.venue}
              </div>
              <div className="text-[10px] font-mono text-[#38BDF8]">
                68m Sq · 74m Straight
              </div>
            </div>

            <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded px-3 py-2">
              <div className="text-[10px] text-[#9BAABD] uppercase flex items-center gap-1">
                <Sun className="w-3 h-3 text-[#23B875]" /> Pitch Surface
              </div>
              <div className="text-xs font-semibold text-[#23B875] mt-0.5">
                {pitchCondition}
              </div>
              <div className="text-[10px] font-mono text-[#9BAABD]">
                Par Score: {pitchCondition === 'Hard Batting Track' ? '194' : pitchCondition === 'Dry Spinning Deck' ? '165' : '176'}
              </div>
            </div>

            <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded px-3 py-2">
              <div className="text-[10px] text-[#9BAABD] uppercase flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-[#38BDF8]" /> Weather & Temp
              </div>
              <div className="text-xs font-semibold text-[#F4F6FA] mt-0.5">
                {weatherCondition}
              </div>
              <div className="text-[10px] font-mono text-[#9BAABD]">
                64% Humidity
              </div>
            </div>

            <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded px-3 py-2">
              <div className="text-[10px] text-[#9BAABD] uppercase flex items-center gap-1">
                <Wind className="w-3 h-3 text-[#D8B15B]" /> Dew & Start Time
              </div>
              <div className="text-xs font-semibold text-[#D8B15B] mt-0.5">
                {dewCondition}
              </div>
              <div className="text-[10px] font-mono text-[#9BAABD]">
                19:30 IST (Floodlights)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* E. OFFICIAL TOURNAMENT vs CUSTOM / PRACTICE MATCH OPTIONS */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#D8B15B]" />
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F6FA]">
              Competition Rules & Custom Match Sandbox
            </span>
            <span className="text-[11px] text-[#9BAABD]">
              ({isCustomMatch ? 'Practice / Custom Match — All parameters unlocked' : 'Official Tournament Fixture — Competition rules locked'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCustomMatch(false);
                setMatchFormat('T20');
                setCustomOvers(20);
                setCustomTarget(0);
              }}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                !isCustomMatch
                  ? 'bg-[#D8B15B] text-[#07111F]'
                  : 'bg-[#17283D] text-[#9BAABD] border border-[#1F3552]'
              }`}
            >
              Official Tournament Match
            </button>
            <button
              onClick={() => setIsCustomMatch(true)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                isCustomMatch
                  ? 'bg-[#38BDF8] text-[#07111F]'
                  : 'bg-[#17283D] text-[#9BAABD] border border-[#1F3552]'
              }`}
            >
              Practice / Custom Match
            </button>
          </div>
        </div>

        {isCustomMatch && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-[#1F3552]">
            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                Match Format
              </label>
              <select
                value={matchFormat}
                onChange={(e) => {
                  const fmt = e.target.value as MatchFormat;
                  setMatchFormat(fmt);
                  setCustomOvers(fmt === 'T20' ? 20 : fmt === 'ODI' ? 50 : 90);
                }}
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs text-[#F4F6FA]"
              >
                <option value="T20">T20 (20 Overs)</option>
                <option value="ODI">ODI (50 Overs)</option>
                <option value="Test">Test Match (90 Overs)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                Custom Overs
              </label>
              <input
                type="number"
                min={2}
                max={90}
                value={customOvers}
                onChange={(e) =>
                  setCustomOvers(Math.max(2, Math.min(90, Number(e.target.value) || 20)))
                }
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs font-mono text-[#F4F6FA]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                Custom Target (0 = Normal)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={customTarget}
                onChange={(e) =>
                  setCustomTarget(Math.max(0, Number(e.target.value) || 0))
                }
                placeholder="0 for 1st Innings"
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs font-mono text-[#D8B15B]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                Pitch Surface
              </label>
              <select
                value={pitchCondition}
                onChange={(e) =>
                  setPitchCondition(e.target.value as LiveMatchState['pitchCondition'])
                }
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs text-[#23B875]"
              >
                <option value="Hard Batting Track">Hard Batting Track</option>
                <option value="Balanced Two-Paced">Balanced Two-Paced</option>
                <option value="Green Seam Surface">Green Seam Surface</option>
                <option value="Dry Spinning Deck">Dry Spinning Deck</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                Weather & Dew
              </label>
              <select
                value={dewCondition}
                onChange={(e) =>
                  setDewCondition(e.target.value as LiveMatchState['dewFactor'])
                }
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs text-[#38BDF8]"
              >
                <option value="Heavy Evening Dew (78%)">Heavy Evening Dew (78%)</option>
                <option value="Moderate (45%)">Moderate (45%)</option>
                <option value="Low (15%)">Low (15%)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#9BAABD] block mb-1">
                AI Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as 'Standard' | 'Challenger' | 'Elite'
                  )
                }
                className="w-full bg-[#0B1728] border border-[#1F3552] rounded px-2.5 py-1.5 text-xs text-[#F4F6FA]"
              >
                <option value="Standard">Standard</option>
                <option value="Challenger">Challenger</option>
                <option value="Elite">Elite</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* MAIN 12-COLUMN GRID: LEFT 8 COLS = PLAYING XI & SMART AUTO-SELECT, RIGHT 4 COLS = PRESETS & INTERACTIVE TOSS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* B & C. PLAYING XI SELECTION + SMART AUTO SELECT BEST XI */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F3552]">
              <div>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#F4F6FA] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D8B15B]" />
                  Starting Playing XI & Batting Order ({playingXI.length}/11)
                </h2>
                <p className="text-[11px] text-[#9BAABD]">
                  Assign Captain (C), Vice-Captain (VC), Wicketkeeper (WK), Bowling Options & Batting Sequence
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    overseasInXI <= 4
                      ? 'bg-[#17283D] text-[#38BDF8] border-[#1F3552]'
                      : 'bg-[#E45B63]/20 text-[#E45B63] border-[#E45B63]/40'
                  }`}
                >
                  Overseas: {overseasInXI}/4
                </span>

                <button
                  onClick={handleSmartAutoSelect}
                  className="px-3.5 py-1.5 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c06b] text-[#07111F] font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AUTO SELECT BEST XI
                </button>
              </div>
            </div>

            {/* Smart Auto Select 10-Factor Explanation Banner */}
            {autoSelectReasons.length > 0 && (
              <div className="mt-3 p-3 rounded bg-[#0B1728] border border-[#23B875]/35">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#23B875] mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Smart Selection Tactical Report (Override Anytime Below)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {autoSelectReasons.map((reason, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-[#F4F6FA] flex items-start gap-1.5"
                    >
                      <span className="text-[#D8B15B] font-mono">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playing XI Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F3552] text-[10px] font-mono uppercase text-[#9BAABD]">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Cricketer</th>
                    <th className="py-2 px-2">Role</th>
                    <th className="py-2 px-2">OVR</th>
                    <th className="py-2 px-2">Form / Fit</th>
                    <th className="py-2 px-2">Leadership & WK</th>
                    <th className="py-2 px-2">Bowler</th>
                    <th className="py-2 px-2 text-right">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F3552]/60 text-xs">
                  {playingXI.map((player, idx) => {
                    const isCapt = userTeam.captainId === player.id;
                    const isVC = userTeam.viceCaptainId === player.id;
                    const isWK = userTeam.wicketkeeperId === player.id;
                    const isBowler = selectedBowlerIds.includes(player.id);

                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-[#17283D]/60 transition-colors h-[40px]"
                      >
                        <td className="px-2 font-mono text-[#9BAABD]">
                          {idx + 1}
                        </td>
                        <td className="px-2">
                          <div className="flex items-center gap-2">
                            <PlayerPortrait
                              player={player}
                              team={userTeam}
                              size="sm"
                            />
                            <div>
                              <button
                                onClick={() => onInspectPlayer(player)}
                                className="font-semibold text-[#F4F6FA] hover:text-[#D8B15B] transition-colors cursor-pointer text-left"
                              >
                                {player.fullName}
                              </button>
                              <div className="text-[10px] text-[#9BAABD]">
                                {player.nationality}{' '}
                                {player.isOverseasInIPL ? '· OS' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 text-[11px] text-[#9BAABD]">
                          {player.role}
                        </td>
                        <td className="px-2 font-mono font-bold text-[#D8B15B]">
                          {player.gameAttributes.ovr}
                        </td>
                        <td className="px-2 font-mono text-[11px]">
                          <span className="text-[#23B875]">
                            {player.gameAttributes.form}
                          </span>
                          <span className="text-[#9BAABD]"> / </span>
                          <span
                            className={
                              player.gameAttributes.fitness < 85
                                ? 'text-[#E45B63]'
                                : 'text-[#38BDF8]'
                            }
                          >
                            {player.gameAttributes.fitness}%
                          </span>
                        </td>
                        <td className="px-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                handleSetRoleBadge(player.id, 'CAPTAIN')
                              }
                              title="Assign Captain"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                isCapt
                                  ? 'bg-[#D8B15B] text-[#07111F]'
                                  : 'bg-[#0B1728] text-[#9BAABD] border border-[#1F3552]'
                              }`}
                            >
                              C
                            </button>
                            <button
                              onClick={() =>
                                handleSetRoleBadge(player.id, 'VICE_CAPTAIN')
                              }
                              title="Assign Vice-Captain"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                isVC
                                  ? 'bg-[#38BDF8] text-[#07111F]'
                                  : 'bg-[#0B1728] text-[#9BAABD] border border-[#1F3552]'
                              }`}
                            >
                              VC
                            </button>
                            <button
                              onClick={() =>
                                handleSetRoleBadge(player.id, 'KEEPER')
                              }
                              title="Assign Wicketkeeper"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                isWK
                                  ? 'bg-[#23B875] text-[#07111F]'
                                  : 'bg-[#0B1728] text-[#9BAABD] border border-[#1F3552]'
                              }`}
                            >
                              WK
                            </button>
                          </div>
                        </td>
                        <td className="px-2">
                          <button
                            onClick={() => handleToggleBowlerOption(player.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                              isBowler
                                ? 'bg-[#23B875]/20 text-[#23B875] border border-[#23B875]/40'
                                : 'bg-[#0B1728] text-[#9BAABD] border border-[#1F3552]'
                            }`}
                          >
                            {isBowler ? 'BOWL ✓' : 'Reserve'}
                          </button>
                        </td>
                        <td className="px-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleMoveOrder(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded bg-[#0B1728] border border-[#1F3552] text-[#9BAABD] hover:text-[#F4F6FA] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(idx, 1)}
                              disabled={idx === playingXI.length - 1}
                              className="p-1 rounded bg-[#0B1728] border border-[#1F3552] text-[#9BAABD] hover:text-[#F4F6FA] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reserve / Substitute Bench */}
            <div className="mt-4 pt-3 border-t border-[#1F3552]">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-[#9BAABD] mb-2">
                Bench / Substitute Reserves ({reservePlayers.length}) — Swap Into Starting XI
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {reservePlayers.map((res) => (
                  <div
                    key={res.id}
                    className="bg-[#0B1728] border border-[#1F3552] rounded p-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <PlayerPortrait
                        player={res}
                        team={userTeam}
                        size="sm"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#F4F6FA]">
                          {res.shortName}
                        </div>
                        <div className="text-[10px] text-[#9BAABD]">
                          {res.role} · OVR {res.gameAttributes.ovr} · Fit {res.gameAttributes.fitness}%
                        </div>
                      </div>
                    </div>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSwapReserveWithXI(res.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-[#17283D] border border-[#1F3552] rounded px-2 py-1 text-[10px] text-[#D8B15B] cursor-pointer"
                    >
                      <option value="">Swap for...</option>
                      {playingXI.map((xiP, idx) => (
                        <option key={xiP.id} value={xiP.id}>
                          #{idx + 1} {xiP.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLS: TACTICAL FORMATION PRESET + INTERACTIVE COIN TOSS SEQUENCE */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tactical Formation Preset Selector */}
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F6FA] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#38BDF8]" />
                Tactical Formation Preset
              </h3>
              <button
                onClick={() => onNavigate('squad')}
                className="text-[11px] text-[#38BDF8] hover:underline cursor-pointer"
              >
                Edit / Save Presets →
              </button>
            </div>
            <p className="text-[11px] text-[#9BAABD] mb-3">
              Automatically configures initial field coordinates, bowling aggressiveness & delivery plan:
            </p>
            <div className="space-y-2">
              {formations.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyFormationPreset(preset)}
                    className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#17283D] border-[#D8B15B] shadow-sm'
                        : 'bg-[#0B1728] border-[#1F3552] hover:border-[#38BDF8]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-xs text-[#F4F6FA]">
                        {preset.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#07111F] text-[10px] font-mono text-[#38BDF8]">
                        {preset.formatTag}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9BAABD] mt-1">
                      {preset.description}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#D8B15B]">
                        Field: {preset.fieldPreset}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#23B875]">
                        Bowl: {preset.bowlingAggressiveness}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#101F32] text-[#38BDF8]">
                        Delivery: {preset.defaultDelivery}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. INTERACTIVE COIN TOSS SEQUENCE */}
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-2.5">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#D8B15B]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F6FA]">
                  Official Pitch-Side Coin Toss
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase text-[#D8B15B]">
                {tossPhase === 'DECIDED' ? 'TOSS COMPLETE' : 'AWAITING CALL'}
              </span>
            </div>

            {/* Captain Face-Off Presentation */}
            <div className="grid grid-cols-2 gap-2.5 bg-[#0B1728] p-2.5 rounded border border-[#1F3552]">
              <div className="flex items-center gap-2">
                {userCaptain && (
                  <PlayerPortrait
                    player={userCaptain}
                    team={userTeam}
                    size="sm"
                  />
                )}
                <div>
                  <div className="text-[10px] font-mono text-[#D8B15B] flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {userTeam.shortCode} CAPTAIN
                  </div>
                  <div className="text-xs font-bold text-[#F4F6FA]">
                    {userCaptain?.fullName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-[#1F3552] pl-2.5">
                {oppCaptain && (
                  <PlayerPortrait
                    player={oppCaptain}
                    team={oppTeam}
                    size="sm"
                  />
                )}
                <div>
                  <div className="text-[10px] font-mono text-[#38BDF8] flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {oppTeam.shortCode} CAPTAIN
                  </div>
                  <div className="text-xs font-bold text-[#F4F6FA]">
                    {oppCaptain?.fullName}
                  </div>
                </div>
              </div>
            </div>

            {tossPhase === 'READY' && (
              <div className="space-y-2.5 pt-1">
                <div className="text-xs text-[#9BAABD]">
                  Match Referee spins the gold sovereign coin at pitch center. Make your call:
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleFlipCoin('HEADS')}
                    className="py-2.5 rounded-[4px] bg-[#D8B15B] hover:bg-[#e3be6b] text-[#07111F] font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Call HEADS
                  </button>
                  <button
                    onClick={() => handleFlipCoin('TAILS')}
                    className="py-2.5 rounded-[4px] bg-[#17283D] hover:bg-[#1f3552] text-[#F4F6FA] border border-[#D8B15B]/50 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Call TAILS
                  </button>
                </div>
              </div>
            )}

            {tossPhase === 'FLIPPING' && (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#D8B15B] text-[#07111F] font-display font-black text-sm flex items-center justify-center mx-auto animate-spin">
                  {userCoinCall}
                </div>
                <div className="text-xs font-mono text-[#D8B15B]">
                  Coin spinning in the air... ({userTeam.shortCode} called {userCoinCall})
                </div>
              </div>
            )}

            {tossPhase === 'CALL_MADE' && (
              <div className="space-y-3 bg-[#0B1728] p-3 rounded border border-[#23B875]">
                <div className="text-xs font-bold text-[#23B875]">
                  COIN LANDED ON {coinResult}! {userTeam.name} WON THE TOSS!
                </div>
                <div className="text-[11px] text-[#9BAABD]">
                  Pitch is a <span className="text-[#F4F6FA]">{pitchCondition}</span> with{' '}
                  <span className="text-[#38BDF8]">{dewCondition}</span>. Select your innings strategy:
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleUserTossChoice('BAT')}
                    className="py-2 rounded bg-[#D8B15B] text-[#07111F] font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    ELECT TO BAT FIRST
                  </button>
                  <button
                    onClick={() => handleUserTossChoice('BOWL')}
                    className="py-2 rounded bg-[#23B875] text-[#07111F] font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    ELECT TO BOWL FIRST
                  </button>
                </div>
              </div>
            )}

            {tossPhase === 'DECIDED' && (
              <div className="space-y-3 bg-[#0B1728] p-3 rounded border border-[#D8B15B]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#D8B15B]">
                    OFFICIAL TOSS RESULT
                  </span>
                  <button
                    onClick={() => setTossPhase('READY')}
                    className="text-[10px] text-[#9BAABD] hover:text-[#F4F6FA] underline cursor-pointer"
                  >
                    Re-Toss
                  </button>
                </div>
                <div className="text-xs font-semibold text-[#F4F6FA]">
                  {tossExplanation}
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleLaunchMatch}
                    className="w-full py-3 rounded-[4px] bg-[#23B875] hover:bg-[#2ad185] text-[#07111F] font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    CONFIRM XI & ENTER LIVE MATCH CENTRE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
