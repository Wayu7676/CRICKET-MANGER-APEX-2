import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Database,
  DollarSign,
  Dumbbell,
  Gavel,
  LayoutDashboard,
  Menu,
  Music,
  Play,
  Radio,
  Save,
  Settings,
  Shield,
  Sliders,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AuctionState,
  CompetitionMode,
  CustomFormationPreset,
  GameSaveState,
  LiveMatchState,
  RealCricketer,
  ScreenId,
  SeasonYear,
  TeamInfo,
} from './types/cricket';
import {
  createInitialGameState,
  createInitialMatchState,
} from './data/realCricketers';
import { loadAutoState, saveAutoState } from './engine/storageEngine';
import { audioEngine, AudioSettings } from './engine/audioEngine';
import { TeamBadge } from './components/PlayerPortrait';
import { DashboardScreen } from './components/DashboardScreen';
import { LiveMatchScreen } from './components/LiveMatchScreen';
import { MatchPrepScreen } from './components/MatchPrepScreen';
import { AuctionScreen } from './components/AuctionScreen';
import { SquadScreen } from './components/SquadScreen';
import {
  AnalyticsScorecardsScreen,
  CareerHubScreen,
  FinanceSponsorsScreen,
  FixturesStandingsScreen,
  PlayerDatabaseScreen,
  SaveLoadScreen,
  ScoutingAcademyScreen,
  SettingsScreen,
  StadiumFacilitiesScreen,
  TrainingCentreScreen,
  TransfersContractsScreen,
} from './components/SecondaryScreens';

interface NavGroup {
  groupLabel: string;
  items: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    groupLabel: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'career', label: 'Career Hub', icon: Briefcase },
    ],
  },
  {
    groupLabel: 'SQUAD & PLAYERS',
    items: [
      { id: 'squad', label: 'Squad Management', icon: Users },
      { id: 'database', label: 'Player Database', icon: Database },
      { id: 'scouting', label: 'Scouting & Academy', icon: Compass },
      { id: 'training', label: 'Training Centre', icon: Dumbbell },
    ],
  },
  {
    groupLabel: 'COMPETITION',
    items: [
      { id: 'matchprep', label: 'Match Preparation', icon: Sliders },
      { id: 'match', label: 'Live Match Centre', icon: Radio },
      { id: 'fixtures', label: 'Fixtures & Standings', icon: Calendar },
      { id: 'analytics', label: 'Analytics & Scorecards', icon: BarChart3 },
    ],
  },
  {
    groupLabel: 'BUSINESS',
    items: [
      { id: 'auction', label: 'Auction Room', icon: Gavel },
      { id: 'transfers', label: 'Transfers & Contracts', icon: Shield },
      { id: 'finance', label: 'Finance & Sponsors', icon: DollarSign },
      { id: 'stadium', label: 'Stadium & Facilities', icon: Building2 },
    ],
  },
  {
    groupLabel: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'saveload', label: 'Save / Load Game', icon: Save },
    ],
  },
];

export default function App() {
  const [gameState, setGameState] = useState<GameSaveState>(() => {
    const saved = loadAutoState();
    return saved || createInitialGameState('FRANCHISE_T20', '2025', 'MI');
  });

  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(
    audioEngine.getSettings()
  );

  // Subscribe to audio settings & intensity updates
  useEffect(() => {
    return audioEngine.subscribe(() => {
      setAudioSettings(audioEngine.getSettings());
    });
  }, []);

  // Auto-save game state on every mutation
  useEffect(() => {
    saveAutoState(gameState);
  }, [gameState]);

  // Synchronize Audio Context Mode with Active Screen
  useEffect(() => {
    if (activeScreen === 'match') {
      audioEngine.setMode('match');
    } else if (activeScreen === 'matchprep' || activeScreen === 'squad') {
      audioEngine.setMode('match_prep');
    } else if (activeScreen === 'auction') {
      audioEngine.setMode('auction');
    } else {
      audioEngine.setMode('dashboard');
    }
  }, [activeScreen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleNavigate = (nextScreen: ScreenId) => {
    audioEngine.ensureStarted();
    audioEngine.playNavigate();
    if (nextScreen !== activeScreen) {
      setScreenHistory((prev) => [...prev.slice(-10), activeScreen]);
      setActiveScreen(nextScreen);
    }
    setMobileDrawerOpen(false);
  };

  const handleBackNavigation = () => {
    if (screenHistory.length === 0) return;
    audioEngine.playClick();
    const prev = screenHistory[screenHistory.length - 1];
    setScreenHistory((h) => h.slice(0, -1));
    setActiveScreen(prev);
  };

  const userTeam = gameState.teams[gameState.userTeamId] || Object.values(gameState.teams)[0];

  // State Mutation Handlers
  const handleResolveDecision = (decisionId: string, optionId: string) => {
    const decision = gameState.decisions.find((d) => d.id === decisionId);
    if (!decision) return;
    const chosenOpt = decision.options.find((o) => o.id === optionId);
    if (!chosenOpt) return;

    const nextDecisions = gameState.decisions.map((d) =>
      d.id === decisionId ? { ...d, resolvedOptionId: optionId } : d
    );

    const nextMatch = { ...gameState.liveMatch };
    let nextMorale = gameState.squadMorale;
    let nextTrust = gameState.boardTrust;
    const nextFinances = { ...gameState.finances };

    if (decision.category === 'CURATOR') {
      if (optionId === 'opt_hard') nextMatch.pitchCondition = 'Hard Batting Track';
      else if (optionId === 'opt_green') nextMatch.pitchCondition = 'Green Seam Surface';
      else if (optionId === 'opt_dry') nextMatch.pitchCondition = 'Dry Spinning Deck';
    } else if (decision.category === 'CONTRACT') {
      if (optionId === 'opt_approve_bonus') {
        nextMorale = Math.min(99, nextMorale + 5);
        nextTrust = Math.min(99, nextTrust + 3);
        nextFinances.totalBalanceCr = Math.max(0, nextFinances.totalBalanceCr - decision.costCr);
      }
    } else if (decision.category === 'ACADEMY') {
      nextMorale = Math.min(99, nextMorale + 2);
    }

    setGameState({
      ...gameState,
      decisions: nextDecisions,
      liveMatch: nextMatch,
      squadMorale: nextMorale,
      boardTrust: nextTrust,
      finances: nextFinances,
      news: [
        {
          id: `news_${Date.now()}`,
          date: '15 May',
          category: 'TACTICAL',
          headline: `${userTeam.shortCode} Front Office Executes Directive: ${chosenOpt.label}`,
          summary: chosenOpt.effectSummary,
        },
        ...gameState.news,
      ],
    });
    showToast(`Decision Executed: ${chosenOpt.label}`);
  };

  const handleUpdateMatch = (nextMatch: LiveMatchState) => {
    // If match just finished, update standings & recent form
    if (nextMatch.isCompleted && !gameState.liveMatch.isCompleted && nextMatch.winnerTeamId) {
      const nextTeams: Record<string, TeamInfo> = JSON.parse(JSON.stringify(gameState.teams));
      const winId = nextMatch.winnerTeamId;
      const loseId =
        winId === nextMatch.userTeamId ? nextMatch.opponentTeamId : nextMatch.userTeamId;

      if (nextTeams[winId]) {
        nextTeams[winId].standings.played += 1;
        nextTeams[winId].standings.won += 1;
        nextTeams[winId].standings.points += 2;
        nextTeams[winId].standings.nrr =
          Math.round((nextTeams[winId].standings.nrr + 0.145) * 1000) / 1000;
        nextTeams[winId].recentForm = ['W', ...nextTeams[winId].recentForm.slice(0, 4)];
      }
      if (nextTeams[loseId]) {
        nextTeams[loseId].standings.played += 1;
        nextTeams[loseId].standings.lost += 1;
        nextTeams[loseId].standings.nrr =
          Math.round((nextTeams[loseId].standings.nrr - 0.145) * 1000) / 1000;
        nextTeams[loseId].recentForm = ['L', ...nextTeams[loseId].recentForm.slice(0, 4)];
      }

      setGameState({
        ...gameState,
        teams: nextTeams,
        liveMatch: nextMatch,
        news: [
          {
            id: `news_match_${Date.now()}`,
            date: '15 May',
            category: 'MATCH_REPORT',
            headline: nextMatch.resultText,
            summary: `Official Hawk-Eye scorecard verified at ${nextMatch.venue}.`,
          },
          ...gameState.news,
        ],
      });
      showToast(nextMatch.resultText);
      return;
    }

    setGameState({ ...gameState, liveMatch: nextMatch });
  };

  const handleResetMatch = () => {
    const opp =
      gameState.teams[gameState.liveMatch.opponentTeamId] || Object.values(gameState.teams)[1];
    const freshMatch = createInitialMatchState(
      userTeam,
      opp,
      gameState.liveMatch.competitionName
    );
    setGameState({ ...gameState, liveMatch: freshMatch });
    showToast('Live Match reset to fresh chase state.');
  };

  const handleUpdateAuctionAndTeams = (
    nextAuction: AuctionState,
    nextTeams: Record<string, TeamInfo>,
    nextFinances?: GameSaveState['finances'],
    newsHeadline?: string
  ) => {
    const nextNews = newsHeadline
      ? [
          {
            id: `news_auc_${Date.now()}`,
            date: '15 May',
            category: 'TRANSFER' as const,
            headline: newsHeadline,
            summary: 'Official franchise squad list and purse updated.',
          },
          ...gameState.news,
        ]
      : gameState.news;

    setGameState({
      ...gameState,
      auction: nextAuction,
      teams: nextTeams,
      finances: nextFinances || gameState.finances,
      news: nextNews,
    });
    if (newsHeadline) showToast(newsHeadline);
  };

  const handleUpdateUserTeam = (updatedTeam: TeamInfo) => {
    const nextTeams = { ...gameState.teams, [updatedTeam.id]: updatedTeam };
    // Also keep liveMatch battingOrderIds synced if user team is batting
    const nextMatch = { ...gameState.liveMatch };
    if (nextMatch.battingTeamId === updatedTeam.id) {
      nextMatch.battingOrderIds = [...updatedTeam.playingXIIds];
    }
    setGameState({
      ...gameState,
      teams: nextTeams,
      liveMatch: nextMatch,
    });
  };

  const handleUpdatePlayerInstruction = (
    playerId: string,
    instruction: RealCricketer['tacticalInstruction']
  ) => {
    const target = gameState.players[playerId];
    if (!target) return;
    setGameState({
      ...gameState,
      players: {
        ...gameState.players,
        [playerId]: { ...target, tacticalInstruction: instruction },
      },
    });
    showToast(`Updated tactical directive for ${target.fullName}`);
  };

  const handleSaveFormationPreset = (preset: CustomFormationPreset) => {
    const existing = gameState.customFormations || [];
    setGameState({
      ...gameState,
      customFormations: [preset, ...existing],
    });
    showToast(`Saved tactical formation preset: "${preset.name}"`);
  };

  const handleApplyFormationPreset = (preset: CustomFormationPreset) => {
    const currentFielders = gameState.liveMatch.fielders || [];
    const updatedFielders = currentFielders.map((f, idx) => {
      const coord = preset.fielderCoordinates[idx];
      if (!coord) return f;
      return {
        ...f,
        label: coord.label,
        x: coord.x,
        y: coord.y,
      };
    });
    setGameState({
      ...gameState,
      liveMatch: {
        ...gameState.liveMatch,
        fieldPreset: preset.fieldPreset,
        bowlingAggressiveness: preset.bowlingAggressiveness,
        bowlingDelivery: preset.defaultDelivery,
        battingMindset: preset.defaultBattingMindset,
        activeFormationId: preset.id,
        fielders: updatedFielders,
      },
    });
    showToast(
      `Applied "${preset.name}" (${preset.bowlingAggressiveness} · ${preset.fieldPreset})`
    );
  };

  const handleDeleteFormationPreset = (presetId: string) => {
    const existing = gameState.customFormations || [];
    setGameState({
      ...gameState,
      customFormations: existing.filter((p) => p.id !== presetId),
    });
    showToast('Deleted custom tactical formation preset.');
  };

  const pendingDecisionsCount = gameState.decisions.filter((d) => !d.resolvedOptionId).length;

  return (
    <div
      onClick={() => audioEngine.ensureStarted()}
      className="min-h-screen bg-[#07111F] text-[#F4F6FA] flex flex-col lg:flex-row select-none"
    >
      {/* =====================================================================
       * PERSISTENT LEFT NAVIGATION SIDEBAR (DESKTOP + MOBILE DRAWER)
       * =================================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-[#0B1728] border-r border-[#1F3552] flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Identity Header */}
        <div>
          <div className="h-16 px-4 border-b border-[#1F3552] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#D8B15B] text-[#07111F] flex items-center justify-center font-display font-black text-sm">
                CA
              </div>
              <div>
                <div className="font-display text-sm font-black tracking-wider text-[#F4F6FA] leading-none">
                  CRICKET APEX
                </div>
                <div className="font-mono text-[10px] text-[#D8B15B] mt-0.5">
                  TACTICAL WAR ROOM
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden p-1 text-[#9BAABD] hover:text-[#F4F6FA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-135px)]">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.groupLabel} className="space-y-1">
                <div className="px-2.5 text-[10px] font-mono font-semibold text-[#9BAABD] tracking-wider">
                  {group.groupLabel}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full h-9 px-2.5 rounded-[4px] flex items-center justify-between text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#D8B15B] text-[#07111F] font-bold'
                          : 'text-[#9BAABD] hover:text-[#F4F6FA] hover:bg-[#101F32]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.id === 'match' && !gameState.liveMatch.isCompleted && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            isActive
                              ? 'bg-[#07111F] text-[#D8B15B]'
                              : 'bg-[#E45B63]/20 text-[#E45B63]'
                          }`}
                        >
                          LIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Active Competition & Season */}
        <div className="p-3 border-t border-[#1F3552] bg-[#07111F]/60">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#9BAABD]">
              {gameState.mode === 'FRANCHISE_T20' ? 'IPL T20' : 'ICC INTL'} · {gameState.season}
            </span>
            <span className="text-[#23B875]">VERIFIED DB</span>
          </div>
        </div>
      </aside>

      {/* =====================================================================
       * MAIN APPLICATION VIEWPORT (GLOBAL TOP HEADER + DYNAMIC SCREEN)
       * =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* GLOBAL BROADCAST TOP HEADER */}
        <header className="min-h-16 bg-[#0B1728] border-b border-[#1F3552] px-4 py-2 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
          {/* Left Zone: Mobile Menu + Back Navigation + Selected Team + Date/Season */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-[4px] bg-[#101F32] border border-[#1F3552] text-[#F4F6FA]"
              aria-label="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {screenHistory.length > 0 && (
              <button
                onClick={handleBackNavigation}
                title="Back to previous screen"
                className="h-8 px-2.5 rounded-[4px] bg-[#101F32] hover:bg-[#17283D] border border-[#1F3552] text-xs text-[#9BAABD] hover:text-[#F4F6FA] flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <div
              onClick={() => handleNavigate('career')}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
            >
              <TeamBadge team={userTeam} size="sm" />
              <div>
                <div className="font-display text-xs sm:text-sm font-bold text-[#F4F6FA] leading-tight">
                  {userTeam.name}
                </div>
                <div className="text-[11px] font-mono text-[#9BAABD] tabular-nums">
                  {gameState.currentDate} · Season {gameState.season}
                </div>
              </div>
            </div>
          </div>

          {/* Center Telemetry Strip: Budget, Reputation, Recent Team Form */}
          <div className="hidden xl:flex items-center gap-5 text-xs">
            <div>
              <span className="text-[10px] text-[#9BAABD] block">AVAILABLE PURSE</span>
              <span className="font-mono font-bold text-[#D8B15B] tabular-nums">
                ₹{userTeam.purseRemainingCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="h-6 w-px bg-[#1F3552]" />
            <div>
              <span className="text-[10px] text-[#9BAABD] block">MANAGER REP</span>
              <span className="font-mono font-bold text-[#23B875] tabular-nums">
                {gameState.managerReputation}/100
              </span>
            </div>
            <div className="h-6 w-px bg-[#1F3552]" />
            <div>
              <span className="text-[10px] text-[#9BAABD] block mb-0.5">RECENT FORM</span>
              <div className="flex items-center gap-1">
                {userTeam.recentForm.map((r, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-[2px] font-mono text-[10px] font-bold flex items-center justify-center ${
                      r === 'W'
                        ? 'bg-[#23B875]/20 text-[#23B875]'
                        : 'bg-[#E45B63]/20 text-[#E45B63]'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Zone: Audio Visualizer/Controls + Save Status + Notifications + Manager Profile */}
          <div className="flex items-center gap-2">
            {/* Audio Visualizer Bars & Music/SFX Quick Controls */}
            <div className="flex items-center gap-1.5 bg-[#101F32] border border-[#1F3552] rounded-[4px] px-2.5 py-1">
              {/* Animated Audio Equalizer Bars */}
              <div className="flex items-end gap-0.5 h-3.5 mr-1" title="Stadium Audio Engine Status">
                {[0.5, 0.9, 0.65, 1.0].map((mult, idx) => (
                  <span
                    key={idx}
                    className={`w-0.5 rounded-t transition-all duration-300 ${
                      audioSettings.musicEnabled || audioSettings.crowdEnabled
                        ? 'bg-[#23B875]'
                        : 'bg-[#9BAABD]/30'
                    }`}
                    style={{
                      height:
                        audioSettings.musicEnabled || audioSettings.crowdEnabled
                          ? `${Math.max(25, Math.round(audioEngine.getCrowdIntensity() * 100 * mult))}%`
                          : '25%',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  audioEngine.ensureStarted();
                  audioEngine.updateSettings({ musicEnabled: !audioSettings.musicEnabled });
                }}
                title="Toggle Background Music"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                  audioSettings.musicEnabled ? 'text-[#D8B15B]' : 'text-[#9BAABD]/50'
                }`}
              >
                <Music className="w-3 h-3" />
                <span className="hidden sm:inline">BGM</span>
              </button>

              <button
                onClick={() => {
                  audioEngine.ensureStarted();
                  audioEngine.updateSettings({ sfxEnabled: !audioSettings.sfxEnabled });
                }}
                title="Toggle Sound Effects & Crowd"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                  audioSettings.sfxEnabled ? 'text-[#38BDF8]' : 'text-[#9BAABD]/50'
                }`}
              >
                {audioSettings.sfxEnabled ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">SFX</span>
              </button>
            </div>

            {/* Auto-Save Indicator Button */}
            <button
              onClick={() => handleNavigate('saveload')}
              className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] bg-[#101F32] hover:bg-[#17283D] border border-[#1F3552] text-[11px] font-mono text-[#23B875]"
              title="Auto-Saved to Browser Storage"
            >
              <Save className="w-3 h-3" />
              <span>SAVED</span>
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => {
                  audioEngine.playClick();
                  setNotificationsOpen(!notificationsOpen);
                }}
                className="h-8 px-2.5 rounded-[4px] bg-[#101F32] hover:bg-[#17283D] border border-[#1F3552] text-xs text-[#F4F6FA] flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5 text-[#D8B15B]" />
                {pendingDecisionsCount > 0 && (
                  <span className="font-mono text-[10px] font-bold text-[#D8B15B] tabular-nums">
                    {pendingDecisionsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-3 shadow-xl z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1F3552] pb-1.5 text-xs font-mono">
                    <span className="text-[#D8B15B] font-bold">CLUB DISPATCHES</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[#9BAABD] hover:text-[#F4F6FA]"
                    >
                      Close
                    </button>
                  </div>
                  {gameState.news.slice(0, 3).map((n) => (
                    <div key={n.id} className="bg-[#0B1728] border border-[#1F3552] rounded p-2 text-xs">
                      <div className="text-[10px] font-mono text-[#38BDF8]">{n.category} · {n.date}</div>
                      <div className="font-semibold text-[#F4F6FA] mt-0.5">{n.headline}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manager Profile Pill */}
            <button
              onClick={() => handleNavigate('career')}
              className="h-8 px-2.5 rounded-[4px] bg-[#17283D] border border-[#1F3552] flex items-center gap-1.5 text-xs font-medium text-[#F4F6FA]"
            >
              <User className="w-3.5 h-3.5 text-[#D8B15B]" />
              <span className="hidden md:inline truncate max-w-[110px]">{gameState.managerName}</span>
            </button>
          </div>
        </header>

        {/* NON-BLOCKING TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-16 lg:bottom-5 right-5 z-50 bg-[#17283D] border border-[#D8B15B] rounded-[6px] px-4 py-2.5 text-xs font-mono text-[#F4F6FA] shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#23B875] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* MAIN CONTENT VIEWPORT */}
        <main className="flex-1 p-4 md:p-5 max-w-[1600px] w-full mx-auto pb-16 lg:pb-6">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              state={gameState}
              onNavigate={handleNavigate}
              onResolveDecision={handleResolveDecision}
              onInspectPlayer={(pid) => setSelectedPlayerId(pid)}
            />
          )}

          {activeScreen === 'matchprep' && (
            <MatchPrepScreen
              state={gameState}
              onUpdateState={(updater) => setGameState((prev) => updater(prev))}
              onNavigate={handleNavigate}
              onInspectPlayer={(player) => {
                setSelectedPlayerId(player.id);
                handleNavigate('squad');
              }}
            />
          )}

          {activeScreen === 'match' && (
            <LiveMatchScreen
              state={gameState}
              onUpdateMatch={handleUpdateMatch}
              onResetMatch={handleResetMatch}
              onNavigate={handleNavigate}
            />
          )}

          {activeScreen === 'auction' && (
            <AuctionScreen
              state={gameState}
              onUpdateAuctionAndTeams={handleUpdateAuctionAndTeams}
            />
          )}

          {activeScreen === 'squad' && (
            <SquadScreen
              state={gameState}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(pid) => setSelectedPlayerId(pid)}
              onUpdateTeam={handleUpdateUserTeam}
              onUpdatePlayerInstruction={handleUpdatePlayerInstruction}
              onSaveFormationPreset={handleSaveFormationPreset}
              onApplyFormationPreset={handleApplyFormationPreset}
              onDeleteFormationPreset={handleDeleteFormationPreset}
            />
          )}

          {activeScreen === 'career' && (
            <CareerHubScreen
              state={gameState}
              onSwitchCareerConfig={(mode, season, teamId) => {
                const next = createInitialGameState(mode, season, teamId);
                next.managerName = gameState.managerName;
                setGameState(next);
                showToast(`Loaded verified ${season} ${mode === 'FRANCHISE_T20' ? 'Franchise T20' : 'International'} campaign!`);
              }}
              onUpdateManagerName={(name) => {
                setGameState({ ...gameState, managerName: name });
                showToast(`Manager profile updated to ${name}`);
              }}
              onNavigate={handleNavigate}
            />
          )}

          {activeScreen === 'database' && (
            <PlayerDatabaseScreen
              state={gameState}
              onInspectInSquad={(pid) => {
                setSelectedPlayerId(pid);
                handleNavigate('squad');
              }}
            />
          )}

          {activeScreen === 'scouting' && (
            <ScoutingAcademyScreen
              state={gameState}
              onSignProspectToSquad={(playerId, costCr) => {
                if (userTeam.purseRemainingCr < costCr) {
                  showToast('Insufficient purse to sign prospect.');
                  return;
                }
                const updatedTeam: TeamInfo = {
                  ...userTeam,
                  purseRemainingCr: Math.round((userTeam.purseRemainingCr - costCr) * 100) / 100,
                  squadPlayerIds: [...userTeam.squadPlayerIds, playerId],
                };
                handleUpdateUserTeam(updatedTeam);
                showToast(`Signed ${gameState.players[playerId]?.fullName} to ${userTeam.shortCode}!`);
              }}
            />
          )}

          {activeScreen === 'training' && (
            <TrainingCentreScreen
              state={gameState}
              onRunTrainingSession={(drillType, playerId) => {
                const p = gameState.players[playerId];
                if (!p) return;
                const attr = { ...p.gameAttributes };
                if (drillType === 'Power Hitting') {
                  attr.battingPower = Math.min(99, attr.battingPower + 2);
                  attr.form = Math.min(99, attr.form + 2);
                } else if (drillType === 'Strike Rotation') {
                  attr.battingTiming = Math.min(99, attr.battingTiming + 2);
                } else if (drillType === 'Yorker Accuracy') {
                  attr.deathBowling = Math.min(99, attr.deathBowling + 2);
                  attr.control = Math.min(99, attr.control + 2);
                } else if (drillType === 'Spin Variations') {
                  attr.variations = Math.min(99, attr.variations + 2);
                } else {
                  attr.fitness = 99;
                  attr.morale = Math.min(99, attr.morale + 3);
                }
                attr.ovr = Math.min(98, attr.ovr + 1);
                setGameState({
                  ...gameState,
                  players: {
                    ...gameState.players,
                    [playerId]: { ...p, gameAttributes: attr },
                  },
                });
              }}
            />
          )}

          {activeScreen === 'fixtures' && (
            <FixturesStandingsScreen
              state={gameState}
              onSimulateFixture={(fixId) => {
                const nextFixtures = gameState.fixtures.map((f) =>
                  f.id === fixId
                    ? {
                        ...f,
                        completed: true,
                        homeScoreText: '189/5 (20.0)',
                        awayScoreText: '176/8 (20.0)',
                        winnerTeamId: f.homeTeamId,
                        resultSummary: `${gameState.teams[f.homeTeamId]?.shortCode} won by 13 runs`,
                      }
                    : f
                );
                setGameState({ ...gameState, fixtures: nextFixtures });
                showToast('Fixture simulated and standings updated.');
              }}
              onLaunchLiveMatch={() => handleNavigate('match')}
              onLaunchMatchPrep={() => handleNavigate('matchprep')}
            />
          )}

          {activeScreen === 'analytics' && <AnalyticsScorecardsScreen state={gameState} />}

          {activeScreen === 'transfers' && (
            <TransfersContractsScreen
              state={gameState}
              onTransferSign={(playerId, feeCr) => {
                const updatedTeam: TeamInfo = {
                  ...userTeam,
                  purseRemainingCr: Math.max(
                    0,
                    Math.round((userTeam.purseRemainingCr - feeCr) * 100) / 100
                  ),
                  squadPlayerIds: [...userTeam.squadPlayerIds, playerId],
                };
                handleUpdateUserTeam(updatedTeam);
                showToast(
                  `Transfer Completed: ${gameState.players[playerId]?.fullName} joins ${userTeam.name}!`
                );
              }}
              onUpdateContract={(playerId, years, salaryCr, winBonusCr, squadRole) => {
                const target = gameState.players[playerId];
                if (!target) return;
                setGameState({
                  ...gameState,
                  players: {
                    ...gameState.players,
                    [playerId]: {
                      ...target,
                      gameAttributes: {
                        ...target.gameAttributes,
                        contractYears: years,
                        contractSalaryCr: salaryCr,
                        contractBonusCr: winBonusCr,
                        squadStatusRole: squadRole,
                        morale: Math.min(99, target.gameAttributes.morale + 4),
                      },
                    },
                  },
                });
                showToast(
                  `Contract Extended: ${target.fullName} (${years} Yrs @ ₹${salaryCr.toFixed(2)} Cr/yr)`
                );
              }}
              onTerminateContract={(playerId) => {
                const target = gameState.players[playerId];
                if (!target) return;
                const updatedTeam: TeamInfo = {
                  ...userTeam,
                  squadPlayerIds: userTeam.squadPlayerIds.filter((id: string) => id !== playerId),
                  playingXIIds: userTeam.playingXIIds.filter((id: string) => id !== playerId),
                };
                handleUpdateUserTeam(updatedTeam);
                showToast(`Released ${target.fullName} from ${userTeam.shortCode} squad.`);
              }}
            />
          )}

          {activeScreen === 'finance' && (
            <FinanceSponsorsScreen
              state={gameState}
              onToggleSponsor={(sponsorId) => {
                const nextSponsors = gameState.sponsors.map((sp) =>
                  sp.id === sponsorId ? { ...sp, active: !sp.active } : sp
                );
                const activeTotal = nextSponsors
                  .filter((s) => s.active)
                  .reduce((sum, s) => sum + s.guaranteedCr, 0);
                setGameState({
                  ...gameState,
                  sponsors: nextSponsors,
                  finances: {
                    ...gameState.finances,
                    sponsorshipsCr: Math.round(activeTotal * 10) / 10,
                  },
                });
                showToast('Commercial sponsorship portfolio updated.');
              }}
            />
          )}

          {activeScreen === 'stadium' && (
            <StadiumFacilitiesScreen
              state={gameState}
              onUpgradeFacility={(facId) => {
                const fac = gameState.facilities.find((f) => f.id === facId);
                if (!fac || fac.level >= fac.maxLevel) return;
                const nextFacilities = gameState.facilities.map((f) =>
                  f.id === facId ? { ...f, level: f.level + 1 } : f
                );
                setGameState({
                  ...gameState,
                  facilities: nextFacilities,
                  finances: {
                    ...gameState.finances,
                    totalBalanceCr:
                      Math.round((gameState.finances.totalBalanceCr - fac.upgradeCostCr) * 100) /
                      100,
                  },
                });
                showToast(`Upgraded ${fac.name} to Level ${fac.level + 1}!`);
              }}
            />
          )}

          {activeScreen === 'settings' && <SettingsScreen />}

          {activeScreen === 'saveload' && (
            <SaveLoadScreen
              state={gameState}
              onLoadState={(loaded) => {
                setGameState(loaded);
                showToast(`Loaded campaign: ${loaded.saveName}`);
              }}
              onResetToFreshCampaign={() => {
                const fresh = createInitialGameState('FRANCHISE_T20', '2025', 'MI');
                setGameState(fresh);
                showToast('Campaign reset to default season state.');
              }}
            />
          )}
        </main>

        {/* PERSISTENT MOBILE SCOREBUG BAR (VISIBLE BELOW 1024PX) */}
        <div
          onClick={() => handleNavigate('match')}
          className="lg:hidden fixed bottom-0 inset-x-0 h-12 bg-[#0B1728] border-t border-[#1F3552] px-4 flex items-center justify-between z-30 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-[#E45B63]">LIVE</span>
            <span className="font-display font-bold text-[#F4F6FA]">
              {gameState.teams[gameState.liveMatch.battingTeamId]?.shortCode}{' '}
              {gameState.liveMatch.score}/{gameState.liveMatch.wickets}
            </span>
            <span className="font-mono text-[#38BDF8] tabular-nums">
              ({Math.floor(gameState.liveMatch.ballsBowled / 6)}.
              {gameState.liveMatch.ballsBowled % 6})
            </span>
          </div>
          <div className="font-mono text-xs text-[#D8B15B] flex items-center gap-1">
            <span>WIN {gameState.liveMatch.winProbabilityBattingTeam}%</span>
            <Play className="w-3 h-3 fill-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
