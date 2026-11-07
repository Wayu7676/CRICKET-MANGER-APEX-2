import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Database,
  DollarSign,
  Download,
  Dumbbell,
  Play,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Sliders,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  CompetitionMode,
  GameSaveState,
  RealCricketer,
  ScreenId,
  SeasonYear,
} from '../types/cricket';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';
import { audioEngine, AudioSettings } from '../engine/audioEngine';
import {
  deleteIndexedDBSlot,
  listIndexedDBSlots,
  SaveSlotMeta,
  saveToIndexedDBSlot,
} from '../engine/storageEngine';

/* ============================================================================
 * 1. CAREER HUB SCREEN
 * ========================================================================== */
export const CareerHubScreen: React.FC<{
  state: GameSaveState;
  onSwitchCareerConfig: (mode: CompetitionMode, season: SeasonYear, teamId: string) => void;
  onUpdateManagerName: (name: string) => void;
  onNavigate: (s: ScreenId) => void;
}> = ({ state, onSwitchCareerConfig, onUpdateManagerName, onNavigate }) => {
  const [mgrInput, setMgrInput] = useState(state.managerName);
  const userTeam = state.teams[state.userTeamId];

  return (
    <div className="space-y-5">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">CAREER OPERATIONS & SEASON SELECTOR</div>
          <h1 className="font-display text-2xl font-bold text-[#F4F6FA] mt-0.5">
            Manager Career Hub — {state.managerName}
          </h1>
          <p className="text-xs text-[#9BAABD] mt-1">
            Switch between Franchise T20 League and International Cricket or select verified season rosters (2024–2026)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={mgrInput}
            onChange={(e) => setMgrInput(e.target.value)}
            className="h-9 px-3 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA]"
            placeholder="Manager Name"
          />
          <button
            onClick={() => {
              audioEngine.playClick();
              if (mgrInput.trim()) onUpdateManagerName(mgrInput.trim());
            }}
            className="h-9 px-3.5 rounded-[4px] bg-[#D8B15B] text-[#07111F] font-bold text-xs"
          >
            Update Profile
          </button>
        </div>
      </div>

      {/* Mode & Season Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-4">
          <h2 className="font-display text-sm font-bold text-[#F4F6FA] border-b border-[#1F3552] pb-2">
            1. COMPETITION FORMAT & SEASON ROSTER
          </h2>

          <div className="space-y-2">
            <label className="text-xs text-[#9BAABD] block">Competition Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['FRANCHISE_T20', 'INTERNATIONAL'] as CompetitionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    audioEngine.playNavigate();
                    onSwitchCareerConfig(m, state.season, m === 'FRANCHISE_T20' ? 'MI' : 'IND');
                  }}
                  className={`h-10 px-3 rounded-[4px] font-bold text-xs border transition-colors ${
                    state.mode === m
                      ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B]'
                      : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA]'
                  }`}
                >
                  {m === 'FRANCHISE_T20' ? 'Franchise T20 League' : 'International Cricket'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#9BAABD] block">Verified Roster Season</label>
            <div className="grid grid-cols-3 gap-2">
              {(['2024', '2025', '2026'] as SeasonYear[]).map((yr) => (
                <button
                  key={yr}
                  onClick={() => {
                    audioEngine.playNavigate();
                    onSwitchCareerConfig(state.mode, yr, state.userTeamId);
                  }}
                  className={`h-9 px-3 rounded-[4px] font-mono text-xs border transition-colors ${
                    state.season === yr
                      ? 'bg-[#38BDF8] text-[#07111F] border-[#38BDF8] font-bold'
                      : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552] hover:text-[#F4F6FA]'
                  }`}
                >
                  Season {yr}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 space-y-2 text-xs">
            <div className="font-mono text-[#23B875] font-bold">ACTIVE CAMPAIGN SUMMARY</div>
            <div className="flex justify-between">
              <span className="text-[#9BAABD]">Selected Club / Nation:</span>
              <span className="font-bold text-[#F4F6FA]">{userTeam.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BAABD]">Captain:</span>
              <span className="font-bold text-[#D8B15B]">
                {state.players[userTeam.captainId]?.fullName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BAABD]">Season Record:</span>
              <span className="font-mono text-[#23B875]">
                {userTeam.standings.won}W - {userTeam.standings.lost}L ({userTeam.standings.points} Pts)
              </span>
            </div>
          </div>
        </div>

        {/* Select Active Team / Franchise */}
        <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
          <h2 className="font-display text-sm font-bold text-[#F4F6FA] border-b border-[#1F3552] pb-2">
            2. SELECT ACTIVE FRANCHISE OR NATIONAL TEAM ({Object.keys(state.teams).length} TEAMS)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {Object.values(state.teams).map((team) => {
              const active = team.id === state.userTeamId;
              return (
                <div
                  key={team.id}
                  onClick={() => {
                    audioEngine.playNavigate();
                    onSwitchCareerConfig(state.mode, state.season, team.id);
                  }}
                  className={`p-3 rounded-[6px] border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    active
                      ? 'bg-[#17283D] border-[#D8B15B]'
                      : 'bg-[#0B1728] border-[#1F3552] hover:bg-[#17283D]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamBadge team={team} size="md" />
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-[#F4F6FA] truncate">
                        {team.name}
                      </div>
                      <div className="text-[11px] text-[#9BAABD] truncate">
                        {team.homeVenue}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs shrink-0">
                    <div className="text-[#D8B15B] font-bold">Rep {team.reputation}</div>
                    <div className="text-[10px] text-[#9BAABD]">₹{team.purseRemainingCr}Cr</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Career Legacy & Trophy Milestones */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#D8B15B]" />
            <h2 className="font-display text-sm font-bold text-[#F4F6FA]">
              3. MANAGER CAREER LEGACY & MILESTONES
            </h2>
          </div>
          <span className="font-mono text-xs text-[#23B875]">
            Team Chemistry: {state.teamChemistry ?? 86}/100
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono tabular-nums">
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">TROPHIES WON</span>
            <span className="text-base font-bold text-[#D8B15B]">
              {state.careerLegacy?.trophiesWon ?? 1}
            </span>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">MATCHES MANAGED</span>
            <span className="text-base font-bold text-[#F4F6FA]">
              {state.careerLegacy?.matchesManaged ?? 24}
            </span>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">MATCHES WON</span>
            <span className="text-base font-bold text-[#23B875]">
              {state.careerLegacy?.matchesWon ?? 16}
            </span>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">PLAYERS DEVELOPED</span>
            <span className="text-base font-bold text-[#38BDF8]">
              {state.careerLegacy?.playersDeveloped ?? 5}
            </span>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">AUCTION SIGNINGS</span>
            <span className="text-base font-bold text-[#D8B15B]">
              {state.careerLegacy?.successfulAuctionSignings ?? 8}
            </span>
          </div>
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
            <span className="text-[10px] text-[#9BAABD] block">HIGHEST SCORE</span>
            <span className="text-base font-bold text-[#23B875]">
              {state.careerLegacy?.highestTeamScore ?? '228/4'}
            </span>
          </div>
        </div>

        {state.careerLegacy?.milestones && state.careerLegacy.milestones.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {state.careerLegacy.milestones.map((m, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded bg-[#0B1728] border border-[#D8B15B]/40 text-[11px] font-mono text-[#D8B15B] flex items-center gap-1.5"
              >
                <Award className="w-3 h-3" />
                <span>{m}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. PLAYER DATABASE SCREEN (VERIFIED REAL CRICKETERS)
 * ========================================================================== */
export const PlayerDatabaseScreen: React.FC<{
  state: GameSaveState;
  onInspectInSquad: (playerId: string) => void;
}> = ({ state, onInspectInSquad }) => {
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const allPlayers = Object.values(state.players);
  const countries = Array.from(new Set(allPlayers.map((p) => p.nationality)));

  const filtered = allPlayers
    .filter((p) => {
      const q = query.toLowerCase();
      const matchSearch =
        p.fullName.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q) ||
        p.bowlingStyle.toLowerCase().includes(q);
      const matchCountry = countryFilter === 'ALL' || p.nationality === countryFilter;
      const matchRole = roleFilter === 'ALL' || p.role === roleFilter;
      return matchSearch && matchCountry && matchRole;
    })
    .sort((a, b) => b.gameAttributes.ovr - a.gameAttributes.ovr);

  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">
            OFFICIAL VERIFIED CRICKETER REGISTRY · ZERO FICTIONAL PLAYERS
          </div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Global Cricketer Database ({filtered.length} Verified Professionals)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9BAABD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kohli, Bumrah, Cummins..."
              className="h-9 pl-8 pr-3 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA] w-56"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 px-2.5 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA]"
          >
            <option value="ALL">All Nations</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-2.5 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA]"
          >
            <option value="ALL">All Roles</option>
            <option value="Batsman">Batsman</option>
            <option value="Fast Bowler">Fast Bowler</option>
            <option value="Spin Bowler">Spin Bowler</option>
            <option value="All-Rounder">All-Rounder</option>
            <option value="Wicketkeeper">Wicketkeeper</option>
          </select>
        </div>
      </div>

      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F3552] bg-[#0B1728] text-[11px] font-mono text-[#9BAABD]">
                <th className="py-2.5 px-3">PLAYER</th>
                <th className="py-2.5 px-3">NATION</th>
                <th className="py-2.5 px-3">ROLE & STYLE</th>
                <th className="py-2.5 px-3">SEASON CLUB</th>
                <th className="py-2.5 px-3 text-right">INTL CAPS</th>
                <th className="py-2.5 px-3 text-right">CAREER RUNS</th>
                <th className="py-2.5 px-3 text-right">BAT AVG / SR</th>
                <th className="py-2.5 px-3 text-right">WKTS / ECON</th>
                <th className="py-2.5 px-3 text-right">GAME OVR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F3552]/50 text-xs">
              {filtered.map((p) => {
                const clubId = p.franchiseAffiliations[state.season];
                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      audioEngine.playClick();
                      onInspectInSquad(p.id);
                    }}
                    className="h-11 hover:bg-[#17283D]/70 cursor-pointer transition-colors"
                  >
                    <td className="px-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerPortrait player={p} size="sm" />
                        <div>
                          <div className="font-display font-bold text-[#F4F6FA]">{p.fullName}</div>
                          <div className="text-[10px] text-[#9BAABD]">DOB: {p.dob} (Age {p.age})</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 font-medium text-[#F4F6FA]">{p.nationality}</td>
                    <td className="px-3 text-[#9BAABD]">
                      <span className="text-[#38BDF8] font-medium">{p.role}</span> · {p.battingHand}
                    </td>
                    <td className="px-3 font-mono text-[#D8B15B]">
                      {clubId} · {p.internationalTeamId}
                    </td>
                    <td className="px-3 text-right font-mono text-[#F4F6FA] tabular-nums">
                      {p.verifiedStats.internationalCaps}
                    </td>
                    <td className="px-3 text-right font-mono text-[#F4F6FA] tabular-nums">
                      {p.verifiedStats.runs.toLocaleString()}
                    </td>
                    <td className="px-3 text-right font-mono text-[#23B875] tabular-nums">
                      {p.verifiedStats.battingAvg} / {p.verifiedStats.strikeRate}
                    </td>
                    <td className="px-3 text-right font-mono text-[#38BDF8] tabular-nums">
                      {p.verifiedStats.wickets} / {p.verifiedStats.economy ?? '-'}
                    </td>
                    <td className="px-3 text-right font-mono font-extrabold text-[#D8B15B] tabular-nums">
                      {p.gameAttributes.ovr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. SCOUTING & ACADEMY SCREEN
 * ========================================================================== */
export const ScoutingAcademyScreen: React.FC<{
  state: GameSaveState;
  onSignProspectToSquad: (playerId: string, costCr: number) => void;
}> = ({ state, onSignProspectToSquad }) => {
  const userTeam = state.teams[state.userTeamId];
  const prospects = Object.values(state.players).filter(
    (p) => p.isAcademyProspect || p.age <= 25
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">
            GLOBAL TALENT SCOUTING & UNDER-25 HIGH-POTENTIAL NETWORK
          </div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Scouting & Youth Academy Dossiers
          </h1>
          <p className="text-xs text-[#9BAABD]">
            Verified young international & franchise stars (Age ≤ 25) with high ceiling potential
          </p>
        </div>
        <div className="font-mono text-xs text-[#D8B15B] bg-[#0B1728] border border-[#1F3552] px-3 py-2 rounded-[6px] tabular-nums">
          Available Acquisition Purse: ₹{userTeam.purseRemainingCr.toFixed(2)} Cr
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prospects.map((p) => {
          const alreadyInSquad = userTeam.squadPlayerIds.includes(p.id);
          return (
            <div
              key={p.id}
              className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlayerPortrait player={p} size="md" />
                  <div>
                    <h3 className="font-display text-base font-bold text-[#F4F6FA]">
                      {p.fullName}
                    </h3>
                    <div className="text-xs text-[#9BAABD]">
                      {p.nationality} · Age {p.age} · {p.role}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs text-[#9BAABD]">OVR / POT</div>
                  <div className="text-sm font-bold text-[#D8B15B]">
                    {p.gameAttributes.ovr} <span className="text-[#23B875]">→ {p.gameAttributes.potential}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[10px] text-[#9BAABD] block">RUNS</span>
                  <span className="text-[#F4F6FA] font-bold">{p.verifiedStats.runs}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#9BAABD] block">SR</span>
                  <span className="text-[#23B875] font-bold">{p.verifiedStats.strikeRate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#9BAABD] block">WICKETS</span>
                  <span className="text-[#38BDF8] font-bold">{p.verifiedStats.wickets}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-xs text-[#9BAABD] tabular-nums">
                  Sign Fee: ₹{p.gameAttributes.basePriceCr.toFixed(2)} Cr
                </span>
                {alreadyInSquad ? (
                  <span className="text-xs font-mono text-[#23B875] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> In {userTeam.shortCode} Squad
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      audioEngine.playClick();
                      onSignProspectToSquad(p.id, p.gameAttributes.basePriceCr);
                    }}
                    className="px-3 py-1.5 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] text-[#07111F] font-bold text-xs"
                  >
                    Sign to Squad
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. TRAINING CENTRE SCREEN
 * ========================================================================== */
export const TrainingCentreScreen: React.FC<{
  state: GameSaveState;
  onRunTrainingSession: (drillType: string, playerId: string) => void;
}> = ({ state, onRunTrainingSession }) => {
  const userTeam = state.teams[state.userTeamId];
  const squad = userTeam.squadPlayerIds.map((id) => state.players[id]).filter(Boolean);
  const [selectedDrill, setSelectedDrill] = useState('Power Hitting');
  const [feedback, setFeedback] = useState<string | null>(null);

  const drills = [
    { name: 'Power Hitting', desc: 'Boosts Batting Power (+2) & Form (+2)', icon: Zap },
    { name: 'Strike Rotation', desc: 'Boosts Batting Timing (+2) & Pace/Spin (+1)', icon: Compass },
    { name: 'Yorker Accuracy', desc: 'Boosts Death Bowling (+2) & Control (+2)', icon: Activity },
    { name: 'Spin Variations', desc: 'Boosts Bowling Variations (+2) & Skill (+1)', icon: RefreshCw },
    { name: 'Cryo & Recovery', desc: 'Restores Player Fitness to 99% & Morale (+3)', icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">
            HIGH-PERFORMANCE BIOMECHANICS & NET DRILLS
          </div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Club Training Centre — {userTeam.name}
          </h1>
        </div>
        {feedback && (
          <div className="px-3 py-1.5 rounded-[4px] bg-[#23B875]/20 border border-[#23B875] text-xs font-mono text-[#23B875]">
            {feedback}
          </div>
        )}
      </div>

      {/* Drill Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {drills.map((d) => {
          const active = selectedDrill === d.name;
          return (
            <button
              key={d.name}
              onClick={() => {
                audioEngine.playClick();
                setSelectedDrill(d.name);
              }}
              className={`p-3 rounded-[6px] border text-left transition-colors ${
                active
                  ? 'bg-[#17283D] border-[#D8B15B]'
                  : 'bg-[#101F32] border-[#1F3552] hover:bg-[#17283D]/50'
              }`}
            >
              <div className="font-display text-xs font-bold text-[#F4F6FA]">{d.name}</div>
              <div className="text-[11px] text-[#9BAABD] mt-1">{d.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Squad Training Roster */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {squad.map((p) => (
            <div
              key={p.id}
              className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PlayerPortrait player={p} team={userTeam} size="sm" />
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-[#F4F6FA] truncate">
                    {p.fullName}
                  </div>
                  <div className="text-[11px] text-[#9BAABD] font-mono tabular-nums">
                    OVR {p.gameAttributes.ovr} · Fit {p.gameAttributes.fitness}% · Form {p.gameAttributes.form}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  audioEngine.playClick();
                  onRunTrainingSession(selectedDrill, p.id);
                  setFeedback(`Completed ${selectedDrill} session for ${p.fullName}!`);
                }}
                className="px-3 py-1.5 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] text-[#07111F] font-bold text-xs whitespace-nowrap shrink-0"
              >
                Run {selectedDrill}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. FIXTURES & STANDINGS SCREEN
 * ========================================================================== */
export const FixturesStandingsScreen: React.FC<{
  state: GameSaveState;
  onSimulateFixture: (fixtureId: string) => void;
  onLaunchLiveMatch: () => void;
  onLaunchMatchPrep?: () => void;
}> = ({ state, onSimulateFixture, onLaunchLiveMatch, onLaunchMatchPrep }) => {
  const sortedTeams = Object.values(state.teams).sort((a, b) => {
    if (b.standings.points !== a.standings.points) return b.standings.points - a.standings.points;
    return b.standings.nrr - a.standings.nrr;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Fixtures Column */}
      <div className="lg:col-span-6 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="border-b border-[#1F3552] pb-2.5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-[#F4F6FA]">
              TOURNAMENT FIXTURES & RESULTS
            </h2>
            <p className="text-[11px] text-[#9BAABD]">
              Open Match Preparation & Toss or quick-simulate scheduled fixtures
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {state.fixtures.map((fix) => {
            const home = state.teams[fix.homeTeamId] || Object.values(state.teams)[0];
            const away = state.teams[fix.awayTeamId] || Object.values(state.teams)[1];
            return (
              <div
                key={fix.id}
                className={`bg-[#0B1728] border rounded-[6px] p-3 space-y-2 ${
                  fix.isRivalryDerby ? 'border-[#D8B15B]/60' : 'border-[#1F3552]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[#9BAABD]">
                  <span className="flex items-center gap-2">
                    <span>MATCH #{fix.matchNumber} · {fix.date}</span>
                    {fix.isRivalryDerby && (
                      <span className="px-1.5 py-0.5 rounded bg-[#E45B63]/20 border border-[#E45B63]/50 text-[10px] font-bold text-[#E45B63]">
                        RIVALRY DERBY
                      </span>
                    )}
                  </span>
                  <span className="text-[#D8B15B]">{fix.venue}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TeamBadge team={home} size="sm" />
                    <span className="font-display text-xs font-bold text-[#F4F6FA]">{home.name}</span>
                  </div>
                  <span className="font-mono text-xs text-[#9BAABD]">
                    {fix.completed ? `${fix.homeScoreText} vs ${fix.awayScoreText}` : 'VS'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-[#F4F6FA]">{away.name}</span>
                    <TeamBadge team={away} size="sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#1F3552]/60 text-xs">
                  {fix.completed ? (
                    <span className="font-mono text-[#23B875]">{fix.resultSummary}</span>
                  ) : (
                    <>
                      <span className="text-[#9BAABD] text-[11px]">Pitch: {fix.pitch}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            audioEngine.playClick();
                            onSimulateFixture(fix.id);
                          }}
                          className="px-2.5 py-1 rounded bg-[#17283D] border border-[#1F3552] text-xs text-[#F4F6FA]"
                        >
                          Quick Sim
                        </button>
                        {onLaunchMatchPrep && (
                          <button
                            onClick={() => {
                              audioEngine.playNavigate();
                              onLaunchMatchPrep();
                            }}
                            className="px-2.5 py-1 rounded bg-[#17283D] border border-[#D8B15B] text-xs font-bold text-[#D8B15B]"
                          >
                            Match Prep & Toss
                          </button>
                        )}
                        <button
                          onClick={() => {
                            audioEngine.playNavigate();
                            onLaunchLiveMatch();
                          }}
                          className="px-2.5 py-1 rounded bg-[#D8B15B] text-[#07111F] font-bold text-xs"
                        >
                          Play Live
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Points Table Column */}
      <div className="lg:col-span-6 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="border-b border-[#1F3552] pb-2.5">
          <h2 className="font-display text-sm font-bold text-[#F4F6FA]">
            CHAMPIONSHIP STANDINGS & NET RUN RATE
          </h2>
          <p className="text-[11px] text-[#9BAABD]">Updated automatically after every fixture</p>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F3552] text-[11px] font-mono text-[#9BAABD]">
              <th className="py-2 px-2">POS</th>
              <th className="py-2 px-2">TEAM</th>
              <th className="py-2 px-2 text-right">P</th>
              <th className="py-2 px-2 text-right">W</th>
              <th className="py-2 px-2 text-right">L</th>
              <th className="py-2 px-2 text-right">NRR</th>
              <th className="py-2 px-2 text-right">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F3552]/50 text-xs">
            {sortedTeams.map((team, idx) => (
              <tr
                key={team.id}
                className={`h-10 ${team.id === state.userTeamId ? 'bg-[#17283D]' : ''}`}
              >
                <td className="px-2 font-mono text-[#23B875] font-bold tabular-nums">
                  #{idx + 1}
                </td>
                <td className="px-2 font-display font-bold text-[#F4F6FA]">{team.name}</td>
                <td className="px-2 text-right font-mono text-[#9BAABD] tabular-nums">{team.standings.played}</td>
                <td className="px-2 text-right font-mono text-[#23B875] tabular-nums">{team.standings.won}</td>
                <td className="px-2 text-right font-mono text-[#E45B63] tabular-nums">{team.standings.lost}</td>
                <td className="px-2 text-right font-mono text-[#F4F6FA] tabular-nums">
                  {team.standings.nrr >= 0 ? `+${team.standings.nrr.toFixed(3)}` : team.standings.nrr.toFixed(3)}
                </td>
                <td className="px-2 text-right font-mono font-bold text-[#D8B15B] tabular-nums">
                  {team.standings.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. ANALYTICS & SCORECARDS SCREEN
 * ========================================================================== */
export const AnalyticsScorecardsScreen: React.FC<{ state: GameSaveState }> = ({ state }) => {
  const match = state.liveMatch;
  const batRows = match.battingOrderIds.map((id) => ({
    player: state.players[id],
    stat: match.battingStats[id],
  }));
  const bowlRows = match.bowlingOptionsIds.map((id) => ({
    player: state.players[id],
    stat: match.bowlingStats[id],
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Batting Scorecard */}
        <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
            <h2 className="font-display text-sm font-bold text-[#F4F6FA]">
              LIVE INNINGS BATTING SCORECARD — {state.teams[match.battingTeamId]?.name}
            </h2>
            <span className="font-mono text-sm font-bold text-[#D8B15B] tabular-nums">
              {match.score}/{match.wickets} ({Math.floor(match.ballsBowled / 6)}.{match.ballsBowled % 6})
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1F3552] text-[11px] font-mono text-[#9BAABD]">
                <th className="py-2">BATSMAN</th>
                <th className="py-2">STATUS</th>
                <th className="py-2 text-right">R</th>
                <th className="py-2 text-right">B</th>
                <th className="py-2 text-right">4s</th>
                <th className="py-2 text-right">6s</th>
                <th className="py-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F3552]/50">
              {batRows.map(({ player, stat }) => {
                if (!player) return null;
                const r = stat?.runs ?? 0;
                const b = stat?.balls ?? 0;
                const sr = b > 0 ? ((r / b) * 100).toFixed(1) : '0.0';
                const isAtCrease = player.id === match.strikerId || player.id === match.nonStrikerId;
                return (
                  <tr key={player.id} className="h-9">
                    <td className="font-display font-bold text-[#F4F6FA]">
                      {player.fullName} {isAtCrease ? '*' : ''}
                    </td>
                    <td className="text-[#9BAABD] font-mono text-[11px]">
                      {stat?.dismissalText || 'yet to bat'}
                    </td>
                    <td className="text-right font-mono font-bold text-[#D8B15B] tabular-nums">{r}</td>
                    <td className="text-right font-mono text-[#F4F6FA] tabular-nums">{b}</td>
                    <td className="text-right font-mono text-[#23B875] tabular-nums">{stat?.fours ?? 0}</td>
                    <td className="text-right font-mono text-[#38BDF8] tabular-nums">{stat?.sixes ?? 0}</td>
                    <td className="text-right font-mono text-[#F4F6FA] tabular-nums">{sr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bowling Scorecard & Over Manhattan */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <h2 className="font-display text-sm font-bold text-[#F4F6FA] border-b border-[#1F3552] pb-2">
              BOWLING TELEMETRY — {state.teams[match.bowlingTeamId]?.name}
            </h2>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1F3552] text-[11px] font-mono text-[#9BAABD]">
                  <th className="py-2">BOWLER</th>
                  <th className="py-2 text-right">O</th>
                  <th className="py-2 text-right">R</th>
                  <th className="py-2 text-right">W</th>
                  <th className="py-2 text-right">ECON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F3552]/50">
                {bowlRows.map(({ player, stat }) => {
                  if (!player) return null;
                  const balls = stat?.ballsBowled ?? 0;
                  const ov = `${Math.floor(balls / 6)}.${balls % 6}`;
                  const runs = stat?.runsConceded ?? 0;
                  const wkts = stat?.wickets ?? 0;
                  const econ = balls > 0 ? ((runs / balls) * 6).toFixed(2) : '0.00';
                  return (
                    <tr key={player.id} className="h-9">
                      <td className="font-display font-bold text-[#F4F6FA]">{player.fullName}</td>
                      <td className="text-right font-mono text-[#F4F6FA] tabular-nums">{ov}</td>
                      <td className="text-right font-mono text-[#F4F6FA] tabular-nums">{runs}</td>
                      <td className="text-right font-mono font-bold text-[#38BDF8] tabular-nums">{wkts}</td>
                      <td className="text-right font-mono text-[#23B875] tabular-nums">{econ}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Over-by-Over Manhattan Chart */}
          <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <h3 className="font-display text-xs font-bold text-[#F4F6FA] uppercase">
              OVER-BY-OVER MANHATTAN TELEMETRY
            </h3>
            <div className="h-36 flex items-end gap-1.5 pt-4 px-2 bg-[#0B1728] border border-[#1F3552] rounded-[6px]">
              {match.overHistoryRuns.map((item) => {
                const heightPct = Math.min(100, (item.runs / 24) * 100);
                return (
                  <div key={item.over} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="font-mono text-[9px] text-[#D8B15B] tabular-nums">{item.runs}</span>
                    <div
                      className={`w-full rounded-t ${
                        item.wickets > 0 ? 'bg-[#E45B63]' : 'bg-[#38BDF8]'
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                    <span className="font-mono text-[9px] text-[#9BAABD] tabular-nums">{item.over}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 7. TRANSFERS & CONTRACTS SCREEN
 * ========================================================================== */
export const TransfersContractsScreen: React.FC<{
  state: GameSaveState;
  onTransferSign: (playerId: string, feeCr: number) => void;
  onUpdateContract?: (
    playerId: string,
    years: number,
    salaryCr: number,
    winBonusCr: number,
    squadRole: 'Marquee Core' | 'First XI Starter' | 'Rotation Specialist' | 'Emerging Prospect'
  ) => void;
  onTerminateContract?: (playerId: string) => void;
}> = ({ state, onTransferSign, onUpdateContract, onTerminateContract }) => {
  const userTeam = state.teams[state.userTeamId];
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'MARKET'>('CONTRACTS');
  const [selectedContractId, setSelectedContractId] = useState<string>(
    userTeam.squadPlayerIds[0] || ''
  );
  const [yearsInput, setYearsInput] = useState<number>(2);
  const [salaryInput, setSalaryInput] = useState<number>(8.5);
  const [bonusInput, setBonusInput] = useState<number>(0.25);
  const [roleInput, setRoleInput] = useState<
    'Marquee Core' | 'First XI Starter' | 'Rotation Specialist' | 'Emerging Prospect'
  >('Marquee Core');

  const squadPlayers = userTeam.squadPlayerIds
    .map((id) => state.players[id])
    .filter(Boolean);
  const marketPlayers = Object.values(state.players).filter(
    (p) => !userTeam.squadPlayerIds.includes(p.id)
  );
  const activeContractPlayer =
    state.players[selectedContractId] || squadPlayers[0];

  const handleSelectContractPlayer = (p: RealCricketer) => {
    setSelectedContractId(p.id);
    setYearsInput(p.gameAttributes.contractYears ?? 2);
    setSalaryInput(p.gameAttributes.contractSalaryCr ?? p.gameAttributes.estimatedValueCr);
    setBonusInput(p.gameAttributes.contractBonusCr ?? 0.25);
    setRoleInput(p.gameAttributes.squadStatusRole ?? 'First XI Starter');
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">
            CONTRACT NEGOTIATIONS, RETENTIONS & TRANSFER MARKET
          </div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Transfers & Player Contracts — {userTeam.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-[4px] bg-[#0B1728] border border-[#1F3552] p-0.5">
            <button
              onClick={() => {
                audioEngine.playClick();
                setActiveTab('CONTRACTS');
              }}
              className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-colors ${
                activeTab === 'CONTRACTS'
                  ? 'bg-[#D8B15B] text-[#07111F]'
                  : 'text-[#9BAABD] hover:text-[#F4F6FA]'
              }`}
            >
              Squad Contracts ({squadPlayers.length})
            </button>
            <button
              onClick={() => {
                audioEngine.playClick();
                setActiveTab('MARKET');
              }}
              className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-colors ${
                activeTab === 'MARKET'
                  ? 'bg-[#D8B15B] text-[#07111F]'
                  : 'text-[#9BAABD] hover:text-[#F4F6FA]'
              }`}
            >
              Transfer Market ({marketPlayers.length})
            </button>
          </div>

          <div className="font-mono text-sm font-bold text-[#D8B15B] bg-[#0B1728] border border-[#1F3552] px-3 py-2 rounded-[6px] tabular-nums">
            Purse: ₹{userTeam.purseRemainingCr.toFixed(2)} Cr
          </div>
        </div>
      </div>

      {activeTab === 'CONTRACTS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Active Squad Contract Table */}
          <div className="lg:col-span-7 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
            <h2 className="font-display text-sm font-bold text-[#F4F6FA] border-b border-[#1F3552] pb-2">
              ACTIVE SQUAD CONTRACTS & RETENTION TERMS
            </h2>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {squadPlayers.map((p) => {
                const isSelected = activeContractPlayer?.id === p.id;
                const yrs = p.gameAttributes.contractYears ?? 2;
                const sal = p.gameAttributes.contractSalaryCr ?? p.gameAttributes.estimatedValueCr;
                const sRole = p.gameAttributes.squadStatusRole ?? 'First XI Starter';
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      audioEngine.playClick();
                      handleSelectContractPlayer(p);
                    }}
                    className={`p-3 rounded-[6px] border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#17283D] border-[#D8B15B]'
                        : 'bg-[#0B1728] border-[#1F3552] hover:bg-[#17283D]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerPortrait player={p} team={userTeam} size="sm" />
                      <div className="min-w-0">
                        <div className="font-display text-sm font-bold text-[#F4F6FA] truncate">
                          {p.fullName}
                        </div>
                        <div className="text-[11px] text-[#9BAABD]">
                          {p.role} · <span className="text-[#38BDF8]">{sRole}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs tabular-nums shrink-0">
                      <div className="text-[#23B875] font-bold">₹{sal.toFixed(2)} Cr / yr</div>
                      <div className="text-[10px] text-[#9BAABD]">
                        {yrs} {yrs === 1 ? 'Year' : 'Years'} Left · OVR {p.gameAttributes.ovr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contract Negotiation Desk */}
          <div className="lg:col-span-5 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-4">
            <h2 className="font-display text-sm font-bold text-[#F4F6FA] border-b border-[#1F3552] pb-2">
              CONTRACT RENEWAL & NEGOTIATION DESK
            </h2>

            {activeContractPlayer && (
              <>
                <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlayerPortrait player={activeContractPlayer} team={userTeam} size="md" />
                    <div>
                      <div className="font-display text-base font-bold text-[#F4F6FA]">
                        {activeContractPlayer.fullName}
                      </div>
                      <div className="text-xs text-[#9BAABD]">
                        OVR {activeContractPlayer.gameAttributes.ovr} · Morale{' '}
                        {activeContractPlayer.gameAttributes.morale}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-[#9BAABD] block text-[10px]">MARKET VALUE</span>
                    <span className="text-[#D8B15B] font-bold">
                      ₹{activeContractPlayer.gameAttributes.estimatedValueCr.toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#9BAABD] block mb-1">Contract Duration (Years)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((yr) => (
                        <button
                          key={yr}
                          onClick={() => setYearsInput(yr)}
                          className={`h-8 rounded-[4px] font-mono font-bold border ${
                            yearsInput === yr
                              ? 'bg-[#D8B15B] text-[#07111F] border-[#D8B15B]'
                              : 'bg-[#0B1728] text-[#9BAABD] border-[#1F3552]'
                          }`}
                        >
                          {yr} Yr{yr > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#9BAABD] block mb-1">Annual Salary (₹ Cr)</label>
                      <input
                        type="number"
                        step="0.25"
                        min={0.5}
                        max={28}
                        value={salaryInput}
                        onChange={(e) => setSalaryInput(parseFloat(e.target.value) || 1)}
                        className="w-full h-9 px-3 rounded-[4px] bg-[#0B1728] border border-[#1F3552] font-mono text-[#F4F6FA]"
                      />
                    </div>
                    <div>
                      <label className="text-[#9BAABD] block mb-1">Performance Bonus (₹ Cr)</label>
                      <input
                        type="number"
                        step="0.05"
                        min={0}
                        max={5}
                        value={bonusInput}
                        onChange={(e) => setBonusInput(parseFloat(e.target.value) || 0)}
                        className="w-full h-9 px-3 rounded-[4px] bg-[#0B1728] border border-[#1F3552] font-mono text-[#F4F6FA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#9BAABD] block mb-1">Promised Squad Role</label>
                    <select
                      value={roleInput}
                      onChange={(e) =>
                        setRoleInput(
                          e.target.value as
                            | 'Marquee Core'
                            | 'First XI Starter'
                            | 'Rotation Specialist'
                            | 'Emerging Prospect'
                        )
                      }
                      className="w-full h-9 px-3 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-[#F4F6FA]"
                    >
                      <option value="Marquee Core">Marquee Core (Guaranteed XI)</option>
                      <option value="First XI Starter">First XI Starter</option>
                      <option value="Rotation Specialist">Rotation Specialist</option>
                      <option value="Emerging Prospect">Emerging Prospect</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => {
                      audioEngine.playGavelSold();
                      onUpdateContract?.(
                        activeContractPlayer.id,
                        yearsInput,
                        salaryInput,
                        bonusInput,
                        roleInput
                      );
                    }}
                    className="flex-1 h-9 rounded-[4px] bg-[#23B875] hover:bg-[#1fa366] text-[#07111F] font-bold text-xs"
                  >
                    Sign Contract Extension
                  </button>
                  {squadPlayers.length > 11 && (
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onTerminateContract?.(activeContractPlayer.id);
                      }}
                      className="px-3 h-9 rounded-[4px] bg-[#E45B63]/20 border border-[#E45B63] text-[#E45B63] font-bold text-xs"
                    >
                      Release Player
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketPlayers.map((p) => (
            <div
              key={p.id}
              className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlayerPortrait player={p} size="md" />
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#F4F6FA]">{p.fullName}</h3>
                    <div className="text-xs text-[#9BAABD]">
                      {p.nationality} · {p.role}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-base font-extrabold text-[#D8B15B]">
                  OVR {p.gameAttributes.ovr}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-[#0B1728] border border-[#1F3552] rounded p-2 tabular-nums">
                <span className="text-[#9BAABD]">Buyout Clause:</span>
                <span className="text-[#23B875] font-bold">
                  ₹{p.gameAttributes.estimatedValueCr.toFixed(2)} Cr
                </span>
              </div>

              <button
                onClick={() => {
                  audioEngine.playGavelSold();
                  onTransferSign(p.id, p.gameAttributes.estimatedValueCr);
                }}
                disabled={userTeam.purseRemainingCr < p.gameAttributes.estimatedValueCr}
                className="w-full h-9 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] disabled:opacity-40 text-[#07111F] font-bold text-xs"
              >
                Execute Transfer Buyout (₹{p.gameAttributes.estimatedValueCr.toFixed(2)} Cr)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 8. FINANCE & SPONSORS SCREEN
 * ========================================================================== */
export const FinanceSponsorsScreen: React.FC<{
  state: GameSaveState;
  onToggleSponsor: (sponsorId: string) => void;
}> = ({ state, onToggleSponsor }) => {
  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4">
        <div className="text-xs font-mono text-[#D8B15B]">COMMERCIAL REVENUE & SPONSORSHIP PORTFOLIO</div>
        <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
          Club Finance & Commercial Partners
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.sponsors.map((sp) => (
          <div
            key={sp.id}
            className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#38BDF8]">{sp.tier}</div>
                <h3 className="font-display text-base font-bold text-[#F4F6FA]">{sp.name}</h3>
              </div>
              <span
                className={`font-mono text-xs font-bold ${
                  sp.active ? 'text-[#23B875]' : 'text-[#9BAABD]'
                }`}
              >
                {sp.active ? 'ACTIVE CONTRACT' : 'AVAILABLE OFFER'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#0B1728] border border-[#1F3552] rounded p-3 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#9BAABD] block text-[10px]">GUARANTEED ANNUAL</span>
                <span className="text-[#23B875] font-bold">₹{sp.guaranteedCr.toFixed(2)} Cr</span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">MATCH WIN BONUS</span>
                <span className="text-[#D8B15B] font-bold">+₹{sp.winBonusCr.toFixed(2)} Cr</span>
              </div>
            </div>

            <button
              onClick={() => {
                audioEngine.playClick();
                onToggleSponsor(sp.id);
              }}
              className={`h-9 rounded-[4px] font-bold text-xs ${
                sp.active
                  ? 'bg-[#17283D] text-[#F4F6FA] border border-[#1F3552]'
                  : 'bg-[#D8B15B] text-[#07111F]'
              }`}
            >
              {sp.active ? 'Renegotiate / Pause Deal' : 'Activate Commercial Deal'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
 * 9. STADIUM & FACILITIES SCREEN
 * ========================================================================== */
export const StadiumFacilitiesScreen: React.FC<{
  state: GameSaveState;
  onUpgradeFacility: (facilityId: string) => void;
}> = ({ state, onUpgradeFacility }) => {
  const userTeam = state.teams[state.userTeamId];
  return (
    <div className="space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] overflow-hidden relative min-h-[180px] flex items-end p-5">
        <img
          src="/src/assets/images/stadium_broadcast_aerial_1793957402211.jpg"
          alt="Club Stadium Aerial View"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/70 to-transparent" />
        <div className="relative z-10 flex flex-wrap items-center justify-between w-full gap-4">
          <div>
            <div className="text-xs font-mono text-[#D8B15B]">HOME FORTRESS & INFRASTRUCTURE</div>
            <h1 className="font-display text-2xl font-bold text-[#F4F6FA]">{userTeam.homeVenue}</h1>
            <div className="text-xs text-[#9BAABD] font-mono tabular-nums mt-0.5">
              Seated Capacity: {userTeam.stadiumCapacity.toLocaleString()} · Floodlights: 4K Broadcast Spec
            </div>
          </div>
          <div className="bg-[#0B1728]/90 border border-[#1F3552] rounded-[6px] px-4 py-2 font-mono text-xs tabular-nums">
            Infrastructure Reserve: <strong className="text-[#D8B15B]">₹{state.finances.totalBalanceCr.toFixed(2)} Cr</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.facilities.map((fac) => (
          <div
            key={fac.id}
            className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[#38BDF8]">
                <span>{fac.category}</span>
                <span>LVL {fac.level} / {fac.maxLevel}</span>
              </div>
              <h3 className="font-display text-base font-bold text-[#F4F6FA] mt-1">{fac.name}</h3>
              <p className="text-xs text-[#9BAABD] mt-1">{fac.benefitText}</p>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 bg-[#0B1728] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#23B875]"
                  style={{ width: `${(fac.level / fac.maxLevel) * 100}%` }}
                />
              </div>

              <button
                onClick={() => {
                  audioEngine.playClick();
                  onUpgradeFacility(fac.id);
                }}
                disabled={fac.level >= fac.maxLevel || state.finances.totalBalanceCr < fac.upgradeCostCr}
                className="w-full h-9 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] disabled:opacity-40 text-[#07111F] font-bold text-xs"
              >
                {fac.level >= fac.maxLevel
                  ? 'Maximum Level Reached'
                  : `Upgrade Facility (₹${fac.upgradeCostCr.toFixed(1)} Cr)`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
 * 10. SETTINGS & AUDIO MIXER SCREEN
 * ========================================================================== */
export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>(audioEngine.getSettings());

  useEffect(() => {
    return audioEngine.subscribe(() => {
      setSettings(audioEngine.getSettings());
    });
  }, []);

  const update = (partial: Partial<AudioSettings>) => {
    audioEngine.ensureStarted();
    audioEngine.updateSettings(partial);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-5 space-y-4">
        <div className="border-b border-[#1F3552] pb-3">
          <div className="text-xs font-mono text-[#D8B15B]">CENTRALIZED STADIUM & SOUND ENGINE</div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Audio Mixer & Broadcast Preferences
          </h1>
          <p className="text-xs text-[#9BAABD]">
            All volume sliders and channel toggles persist across browser sessions
          </p>
        </div>

        {/* Volume Sliders */}
        <div className="space-y-4">
          {[
            { label: 'Master Broadcast Volume', key: 'masterVolume' as const, val: settings.masterVolume },
            { label: 'Background Soundtrack Volume', key: 'musicVolume' as const, val: settings.musicVolume },
            { label: 'Stadium Crowd Ambience Volume', key: 'crowdVolume' as const, val: settings.crowdVolume },
            { label: 'Tactical UI & Match SFX Volume', key: 'sfxVolume' as const, val: settings.sfxVolume },
          ].map((row) => (
            <div key={row.key} className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#F4F6FA]">{row.label}</span>
                <span className="font-mono font-bold text-[#D8B15B] tabular-nums">
                  {Math.round(row.val * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={row.val}
                onChange={(e) => update({ [row.key]: parseFloat(e.target.value) })}
                className="w-full accent-[#D8B15B] cursor-pointer"
              />
            </div>
          ))}
        </div>

        {/* Channel Mute Toggles (including Master Mute) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => update({ masterMuted: !settings.masterMuted })}
            className={`h-10 px-3 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-2 ${
              !settings.masterMuted
                ? 'bg-[#F4F6FA]/10 border-[#F4F6FA] text-[#F4F6FA]'
                : 'bg-[#E45B63]/20 border-[#E45B63] text-[#E45B63]'
            }`}
          >
            {!settings.masterMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Master: {settings.masterMuted ? 'MUTED' : 'ACTIVE'}</span>
          </button>

          <button
            onClick={() => update({ musicEnabled: !settings.musicEnabled })}
            className={`h-10 px-3 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-2 ${
              settings.musicEnabled
                ? 'bg-[#23B875]/20 border-[#23B875] text-[#23B875]'
                : 'bg-[#0B1728] border-[#1F3552] text-[#9BAABD]'
            }`}
          >
            {settings.musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Music: {settings.musicEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={() => update({ crowdEnabled: !settings.crowdEnabled })}
            className={`h-10 px-3 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-2 ${
              settings.crowdEnabled
                ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                : 'bg-[#0B1728] border-[#1F3552] text-[#9BAABD]'
            }`}
          >
            {settings.crowdEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Crowd: {settings.crowdEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={() => update({ sfxEnabled: !settings.sfxEnabled })}
            className={`h-10 px-3 rounded-[4px] border text-xs font-bold flex items-center justify-center gap-2 ${
              settings.sfxEnabled
                ? 'bg-[#D8B15B]/20 border-[#D8B15B] text-[#D8B15B]'
                : 'bg-[#0B1728] border-[#1F3552] text-[#9BAABD]'
            }`}
          >
            {settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>SFX: {settings.sfxEnabled ? 'ON' : 'MUTED'}</span>
          </button>
        </div>

        {/* 7-Theme Procedural Broadcast Soundtrack Selector */}
        <div className="pt-3 border-t border-[#1F3552] space-y-2">
          <div className="text-xs font-mono text-[#D8B15B]">
            PREVIEW PROCEDURAL BROADCAST MUSIC THEMES (7 MODES)
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'dashboard', label: '1. Main Menu / Career Theme' },
                { id: 'match_prep', label: '2. Squad & Match Prep Theme' },
                { id: 'auction', label: '3. Auction Room Tension Theme' },
                { id: 'match_intro', label: '4. Pre-Match Walkout Anthem' },
                { id: 'match', label: '5. Live Match Bed' },
                { id: 'victory', label: '6. Victory Fanfare' },
                { id: 'trophy', label: '7. Championship Celebration' },
              ] as const
            ).map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  audioEngine.ensureStarted();
                  audioEngine.setMode(theme.id);
                }}
                className="px-3 py-1.5 rounded bg-[#0B1728] hover:bg-[#17283D] border border-[#1F3552] text-xs font-mono text-[#F4F6FA]"
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Soundboard Test Triggers */}
        <div className="pt-3 border-t border-[#1F3552] space-y-2">
          <div className="text-xs font-mono text-[#9BAABD]">TEST STADIUM AUDIO CUES</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => audioEngine.triggerCrowdReaction('SIX')}
              className="px-3 py-1.5 rounded bg-[#17283D] border border-[#1F3552] text-xs text-[#D8B15B]"
            >
              Test Six Roar
            </button>
            <button
              onClick={() => audioEngine.triggerCrowdReaction('WICKET')}
              className="px-3 py-1.5 rounded bg-[#17283D] border border-[#1F3552] text-xs text-[#E45B63]"
            >
              Test Wicket Timber
            </button>
            <button
              onClick={() => audioEngine.playGavelSold()}
              className="px-3 py-1.5 rounded bg-[#17283D] border border-[#1F3552] text-xs text-[#23B875]"
            >
              Test Auction Gavel SOLD
            </button>
            <button
              onClick={() => audioEngine.playCoinFlip()}
              className="px-3 py-1.5 rounded bg-[#17283D] border border-[#1F3552] text-xs text-[#38BDF8]"
            >
              Test Coin Toss Chime
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 11. SAVE / LOAD GAME SCREEN (INDEXEDDB + LOCALSTORAGE + JSON)
 * ========================================================================== */
export const SaveLoadScreen: React.FC<{
  state: GameSaveState;
  onLoadState: (loaded: GameSaveState) => void;
  onResetToFreshCampaign: () => void;
}> = ({ state, onLoadState, onResetToFreshCampaign }) => {
  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [customSaveName, setCustomSaveName] = useState(
    `${state.teams[state.userTeamId]?.shortCode || 'CAM'} · ${state.season} Career`
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const refreshSlots = async () => {
    const list = await listIndexedDBSlots();
    setSlots(list);
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const handleSaveSlot = async (slotId: string) => {
    audioEngine.playClick();
    await saveToIndexedDBSlot(slotId, customSaveName, state);
    await refreshSlots();
    setStatusNote(`Saved campaign to ${slotId.toUpperCase()} in IndexedDB & LocalStorage.`);
  };

  const handleExportJson = () => {
    audioEngine.playClick();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cricket_apex_save_${state.season}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#D8B15B]">
            PERSISTENT CAREER DATABASE (INDEXEDDB + LOCALSTORAGE)
          </div>
          <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
            Save & Load Campaign Manager
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-[4px] bg-[#17283D] border border-[#1F3552] text-xs font-medium text-[#F4F6FA] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Export JSON Backup</span>
          </button>
          <button
            onClick={() => {
              audioEngine.playClick();
              onResetToFreshCampaign();
              setStatusNote('Reset career to default verified season state.');
            }}
            className="px-3.5 py-2 rounded-[4px] bg-[#E45B63]/20 border border-[#E45B63] text-xs font-medium text-[#E45B63]"
          >
            Reset Default Campaign
          </button>
        </div>
      </div>

      {statusNote && (
        <div className="px-4 py-2.5 rounded-[6px] bg-[#23B875]/15 border border-[#23B875] text-xs font-mono text-[#23B875]">
          {statusNote}
        </div>
      )}

      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F3552] pb-3">
          <span className="font-display text-sm font-bold text-[#F4F6FA]">
            INDEXEDDB MULTI-SLOT STORAGE
          </span>
          <input
            type="text"
            value={customSaveName}
            onChange={(e) => setCustomSaveName(e.target.value)}
            className="h-8 px-3 rounded bg-[#0B1728] border border-[#1F3552] text-xs text-[#F4F6FA] w-64"
            placeholder="Save file label..."
          />
        </div>

        <div className="space-y-2.5">
          {['slot_1', 'slot_2', 'slot_3'].map((slotId, index) => {
            const existing = slots.find((s) => s.slotId === slotId);
            return (
              <div
                key={slotId}
                className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono text-xs text-[#D8B15B] font-bold">
                    SAVE SLOT 0{index + 1} {existing ? `— ${existing.saveName}` : '— EMPTY SLOT'}
                  </div>
                  <div className="text-xs text-[#9BAABD] mt-0.5">
                    {existing
                      ? `${existing.teamName} · ${existing.mode} (${existing.season}) · Saved: ${existing.savedAt}`
                      : 'Ready to store full career, squad, live match, and auction state'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveSlot(slotId)}
                    className="px-3 py-1.5 rounded-[4px] bg-[#D8B15B] text-[#07111F] font-bold text-xs flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Here</span>
                  </button>
                  {existing && (
                    <>
                      <button
                        onClick={() => {
                          audioEngine.playNavigate();
                          onLoadState(existing.state);
                          setStatusNote(`Loaded ${existing.saveName} from Slot 0${index + 1}!`);
                        }}
                        className="px-3 py-1.5 rounded-[4px] bg-[#23B875] text-[#07111F] font-bold text-xs"
                      >
                        Load Slot
                      </button>
                      <button
                        onClick={async () => {
                          await deleteIndexedDBSlot(slotId);
                          await refreshSlots();
                        }}
                        className="p-1.5 rounded-[4px] bg-[#17283D] border border-[#E45B63]/40 text-[#E45B63]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
