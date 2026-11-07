import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Gavel,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  AuctionBidEntry,
  AuctionState,
  GameSaveState,
  RealCricketer,
  TeamInfo,
} from '../types/cricket';
import { PlayerPortrait, TeamBadge } from './PlayerPortrait';
import { audioEngine } from '../engine/audioEngine';

interface AuctionScreenProps {
  state: GameSaveState;
  onUpdateAuctionAndTeams: (
    nextAuction: AuctionState,
    nextTeams: Record<string, TeamInfo>,
    nextFinances?: GameSaveState['finances'],
    newsHeadline?: string
  ) => void;
}

export const AuctionScreen: React.FC<AuctionScreenProps> = ({
  state,
  onUpdateAuctionAndTeams,
}) => {
  const auction = state.auction;
  const userTeam = state.teams[state.userTeamId];
  const currentPlayer: RealCricketer =
    state.players[auction.currentPlayerId] || Object.values(state.players)[0];
  const leadingTeam = auction.leadingTeamId ? state.teams[auction.leadingTeamId] : null;
  const [selectedWarRoomTeamId, setSelectedWarRoomTeamId] = useState<string>(state.userTeamId);
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [bidErrorMsg, setBidErrorMsg] = useState<string | null>(null);

  // Calculate user team slots & overseas count
  const getTeamOverseasCount = (team: TeamInfo) =>
    team.squadPlayerIds.filter((pid) => state.players[pid]?.isOverseasInIPL).length;

  const userOverseasCount = getTeamOverseasCount(userTeam);
  const maxSquadSize = 25;
  const maxOverseas = state.mode === 'FRANCHISE_T20' ? 8 : 15;
  const alreadyOwned = Object.values(state.teams).some((t) =>
    t.squadPlayerIds.includes(currentPlayer.id)
  );

  const canUserBid = (incrementCr: number) => {
    if (auction.status === 'SOLD' || auction.status === 'UNSOLD') return false;
    if (alreadyOwned) return false;
    if (auction.leadingTeamId === userTeam.id) return false;
    const nextBid = auction.leadingTeamId
      ? Math.round((auction.currentBidCr + incrementCr) * 100) / 100
      : auction.currentBidCr;
    if (userTeam.purseRemainingCr < nextBid) return false;
    if (userTeam.squadPlayerIds.length >= maxSquadSize) return false;
    if (currentPlayer.isOverseasInIPL && userOverseasCount >= maxOverseas) return false;
    return true;
  };

  // Finalize Lot (SOLD or UNSOLD) — STRICT WINNER-ONLY PURSE DEDUCTION
  const finalizeCurrentLot = (
    winningTeamId: string | null,
    finalAmountCr: number
  ) => {
    const nextTeams: Record<string, TeamInfo> = JSON.parse(JSON.stringify(state.teams));
    const nextFinances = { ...state.finances };
    let headline: string | undefined;

    if (winningTeamId && nextTeams[winningTeamId]) {
      const winner = nextTeams[winningTeamId];
      // Deduct money ONLY from the winning franchise
      winner.purseRemainingCr = Math.max(
        0,
        Math.round((winner.purseRemainingCr - finalAmountCr) * 100) / 100
      );
      if (!winner.squadPlayerIds.includes(currentPlayer.id)) {
        winner.squadPlayerIds.push(currentPlayer.id);
      }
      // User's club finances only decrease if the user won the player
      if (winningTeamId === state.userTeamId) {
        nextFinances.remainingBudgetCr = winner.purseRemainingCr;
      }

      audioEngine.playGavelSold();
      headline = `AUCTION HAMMER: ${winner.name} sign ${currentPlayer.fullName} (${currentPlayer.role}) for ₹${finalAmountCr.toFixed(2)} Cr!`;

      const nextAuction: AuctionState = {
        ...auction,
        status: 'SOLD',
        isPaused: true,
        countdown: 0,
        leadingTeamId: winningTeamId,
        currentBidCr: finalAmountCr,
        soldLots: [
          {
            playerId: currentPlayer.id,
            teamId: winningTeamId,
            amountCr: finalAmountCr,
            role: currentPlayer.role,
          },
          ...auction.soldLots,
        ],
      };
      onUpdateAuctionAndTeams(nextAuction, nextTeams, nextFinances, headline);
    } else {
      audioEngine.playClick();
      const nextAuction: AuctionState = {
        ...auction,
        status: 'UNSOLD',
        isPaused: true,
        countdown: 0,
        unsoldPlayerIds: [...auction.unsoldPlayerIds, currentPlayer.id],
      };
      onUpdateAuctionAndTeams(nextAuction, nextTeams, nextFinances);
    }
  };

  // Intelligent AI Franchise Bidding Engine (evaluates OVR, Role Need, Purse Reserve, Overseas Quota, Age/Potential)
  useEffect(() => {
    if (auction.isPaused || auction.status === 'SOLD' || auction.status === 'UNSOLD') {
      return;
    }

    const timer = window.setTimeout(() => {
      const estValue = currentPlayer.gameAttributes.estimatedValueCr;
      const inc = auction.leadingTeamId === null ? 0 : auction.currentBidCr >= 10 ? 0.5 : 0.25;
      const candidateBid = Math.round((auction.currentBidCr + inc) * 100) / 100;

      // Evaluate each AI franchise's tactical desire for currentPlayer
      const evaluatedAi = Object.values(state.teams)
        .filter((t) => {
          if (t.id === state.userTeamId || t.id === auction.leadingTeamId) return false;
          if (t.squadPlayerIds.includes(currentPlayer.id)) return false;
          if (t.squadPlayerIds.length >= maxSquadSize) return false;
          if (currentPlayer.isOverseasInIPL && getTeamOverseasCount(t) >= maxOverseas) return false;
          // Reserve at least ₹1.0 Cr for remaining minimum slots
          const minReserveNeeded = Math.max(0, 15 - t.squadPlayerIds.length) * 0.5;
          return t.purseRemainingCr - candidateBid >= minReserveNeeded;
        })
        .map((t) => {
          const roleCount = t.squadPlayerIds.filter(
            (pid) => state.players[pid]?.role === currentPlayer.role
          ).length;
          const needsRole = roleCount <= 2;
          const isYoungStar =
            currentPlayer.age <= 25 || currentPlayer.gameAttributes.potential >= 92;
          const isMarquee = currentPlayer.gameAttributes.ovr >= 91;

          let maxWillingCr = estValue;
          if (needsRole) maxWillingCr *= 1.18;
          if (isYoungStar) maxWillingCr *= 1.08;
          if (isMarquee) maxWillingCr *= 1.12;
          if (t.purseRemainingCr > 24) maxWillingCr *= 1.08;

          const rationale = needsRole
            ? `Targeting ${currentPlayer.role} depth (${roleCount} in squad)`
            : isMarquee
            ? `Marquee OVR ${currentPlayer.gameAttributes.ovr} acquisition push`
            : isYoungStar
            ? `High-ceiling age ${currentPlayer.age} investment`
            : `Value bid within ₹${t.purseRemainingCr.toFixed(1)}Cr purse`;

          return { team: t, maxWillingCr, needsRole, rationale };
        })
        .filter((item) => candidateBid <= item.maxWillingCr);

      const shouldAiBid =
        evaluatedAi.length > 0 &&
        (auction.leadingTeamId === null || Math.random() < 0.65);

      if (shouldAiBid) {
        evaluatedAi.sort((a, b) => b.maxWillingCr - a.maxWillingCr);
        const chosenAi =
          evaluatedAi[Math.floor(Math.random() * Math.min(2, evaluatedAi.length))];
        const isJump =
          chosenAi.needsRole &&
          candidateBid + 0.5 <= chosenAi.maxWillingCr &&
          Math.random() < 0.25;
        const finalAiBid = isJump
          ? Math.round((candidateBid + 0.5) * 100) / 100
          : candidateBid;

        audioEngine.playAuctionBid(isJump);
        const entry: AuctionBidEntry = {
          id: `bid_${Date.now()}`,
          teamId: chosenAi.team.id,
          teamShortCode: chosenAi.team.shortCode,
          amountCr: finalAiBid,
          timestamp: new Date().toLocaleTimeString([], {
            minute: '2-digit',
            second: '2-digit',
          }),
          isAggressive: isJump,
          rationale: chosenAi.rationale,
        };

        onUpdateAuctionAndTeams(
          {
            ...auction,
            currentBidCr: finalAiBid,
            leadingTeamId: chosenAi.team.id,
            countdown: 12,
            status: 'ACTIVE',
            bidHistory: [entry, ...auction.bidHistory.slice(0, 14)],
          },
          state.teams
        );
        return;
      }

      // Otherwise decrement countdown
      const nextCount = auction.countdown - 1;
      if (nextCount <= 0) {
        finalizeCurrentLot(auction.leadingTeamId, auction.currentBidCr);
      } else {
        const nextStatus =
          nextCount <= 3 ? 'GOING_TWICE' : nextCount <= 6 ? 'GOING_ONCE' : 'ACTIVE';
        onUpdateAuctionAndTeams(
          {
            ...auction,
            countdown: nextCount,
            status: nextStatus,
          },
          state.teams
        );
      }
    }, 950);

    return () => window.clearTimeout(timer);
  }, [auction, currentPlayer]);

  // User Bidding Handlers
  const handleUserBid = (incrementCr: number, aggressive: boolean, customTotalCr?: number) => {
    setBidErrorMsg(null);
    if (alreadyOwned) {
      setBidErrorMsg('Player is already signed to a squad.');
      return;
    }
    if (auction.leadingTeamId === userTeam.id) {
      setBidErrorMsg('You already hold the highest bid on this lot.');
      return;
    }
    if (userTeam.squadPlayerIds.length >= maxSquadSize) {
      setBidErrorMsg(`Squad size limit (${maxSquadSize}) reached.`);
      return;
    }
    if (currentPlayer.isOverseasInIPL && userOverseasCount >= maxOverseas) {
      setBidErrorMsg(`Overseas quota (${maxOverseas}) full.`);
      return;
    }

    const newBid =
      typeof customTotalCr === 'number'
        ? Math.round(customTotalCr * 100) / 100
        : auction.leadingTeamId === null
        ? auction.currentBidCr
        : Math.round((auction.currentBidCr + incrementCr) * 100) / 100;

    if (auction.leadingTeamId !== null && newBid <= auction.currentBidCr) {
      setBidErrorMsg(
        `Bid must exceed current highest bid of ₹${auction.currentBidCr.toFixed(2)} Cr.`
      );
      return;
    }
    if (newBid < currentPlayer.gameAttributes.basePriceCr) {
      setBidErrorMsg(
        `Bid must be at least Base Price (₹${currentPlayer.gameAttributes.basePriceCr.toFixed(2)} Cr).`
      );
      return;
    }
    if (newBid > userTeam.purseRemainingCr) {
      setBidErrorMsg(
        `Insufficient purse! Available: ₹${userTeam.purseRemainingCr.toFixed(2)} Cr.`
      );
      return;
    }

    audioEngine.playAuctionBid(aggressive);

    const entry: AuctionBidEntry = {
      id: `bid_${Date.now()}`,
      teamId: userTeam.id,
      teamShortCode: userTeam.shortCode,
      amountCr: newBid,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      isAggressive: aggressive,
      rationale:
        typeof customTotalCr === 'number'
          ? `Manager Custom Valuation Bid`
          : aggressive
          ? `Aggressive War Room Power Bid`
          : `Standard Franchise Increment`,
    };

    setCustomBidInput('');
    onUpdateAuctionAndTeams(
      {
        ...auction,
        currentBidCr: newBid,
        leadingTeamId: userTeam.id,
        countdown: 12,
        status: 'ACTIVE',
        isPaused: false,
        userPassedCurrentLot: false,
        bidHistory: [entry, ...auction.bidHistory.slice(0, 14)],
      },
      state.teams
    );
  };

  const handleInstantHammer = () => {
    audioEngine.ensureStarted();
    if (auction.leadingTeamId) {
      finalizeCurrentLot(auction.leadingTeamId, auction.currentBidCr);
    } else {
      const est = currentPlayer.gameAttributes.estimatedValueCr;
      const aiBuyers = Object.values(state.teams).filter(
        (t) =>
          t.id !== state.userTeamId &&
          t.purseRemainingCr >= est &&
          t.squadPlayerIds.length < maxSquadSize &&
          (!currentPlayer.isOverseasInIPL || getTeamOverseasCount(t) < maxOverseas)
      );
      if (aiBuyers.length > 0) {
        const buyer = aiBuyers[0];
        finalizeCurrentLot(buyer.id, Math.min(buyer.purseRemainingCr, est));
      } else {
        finalizeCurrentLot(null, auction.currentBidCr);
      }
    }
  };

  const handleAdvanceToNextLot = (specificPlayerId?: string) => {
    audioEngine.playNavigate();
    const nextQueue = [...auction.upcomingPlayerIds];
    let nextId = specificPlayerId;

    if (nextId) {
      const idx = nextQueue.indexOf(nextId);
      if (idx >= 0) nextQueue.splice(idx, 1);
    } else {
      nextId = nextQueue.shift();
    }

    if (!nextId) {
      // Recycle unsold or marquee pool if queue empty
      const fallbackPool = Object.keys(state.players);
      nextId = fallbackPool[auction.lotNumber % fallbackPool.length];
    }

    const nextPlayer = state.players[nextId];
    onUpdateAuctionAndTeams(
      {
        ...auction,
        lotNumber: auction.lotNumber + 1,
        currentPlayerId: nextId,
        currentBidCr: nextPlayer.gameAttributes.basePriceCr,
        leadingTeamId: null,
        countdown: 15,
        status: 'ACTIVE',
        isPaused: false,
        userPassedCurrentLot: false,
        bidHistory: [],
        upcomingPlayerIds: nextQueue,
      },
      state.teams
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. AUCTION STAGE HEADER */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] overflow-hidden relative">
        <img
          src="/src/assets/images/auction_arena_stage_1793957400712.jpg"
          alt="Franchise Auction Hall Stage"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07111F]/95 via-[#07111F]/80 to-[#07111F]/95 pointer-events-none" />

        <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-[#D8B15B]/15 border border-[#D8B15B] flex items-center justify-center text-[#D8B15B]">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#9BAABD]">
                <span className="font-mono font-bold text-[#D8B15B]">
                  OFFICIAL MEGA AUCTION ROOM · LOT #{String(auction.lotNumber).padStart(2, '0')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{state.season} Roster Window</span>
              </div>
              <h1 className="font-display text-xl font-bold text-[#F4F6FA]">
                Live Franchise War Room & Bidding Floor
              </h1>
            </div>
          </div>

          {/* User Franchise Purse & Quota Readout */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-1.5">
              <div className="text-[10px] text-[#9BAABD]">{userTeam.shortCode} REMAINING PURSE</div>
              <div className="font-mono text-sm font-bold text-[#D8B15B] tabular-nums">
                ₹{userTeam.purseRemainingCr.toFixed(2)} Cr
              </div>
            </div>
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-1.5">
              <div className="text-[10px] text-[#9BAABD]">SQUAD SLOTS</div>
              <div className="font-mono text-sm font-bold text-[#F4F6FA] tabular-nums">
                {userTeam.squadPlayerIds.length} / {maxSquadSize}
              </div>
            </div>
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] px-3 py-1.5">
              <div className="text-[10px] text-[#9BAABD]">OVERSEAS QUOTA</div>
              <div className="font-mono text-sm font-bold text-[#38BDF8] tabular-nums">
                {userOverseasCount} / {maxOverseas}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE MAIN COLUMNS: LEFT (PLAYER PROFILE) · CENTRE (LIVE BIDDING) · RIGHT (FRANCHISE WAR ROOMS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: CURRENT LOT PLAYER DOSSIER (4 COLS) */}
        <div className="lg:col-span-4 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
              <span className="font-mono text-xs font-bold text-[#D8B15B]">
                LOT #{String(auction.lotNumber).padStart(2, '0')} · PLAYER PROFILE
              </span>
              <span className="font-mono text-xs text-[#38BDF8]">
                {currentPlayer.isOverseasInIPL ? 'OVERSEAS SLOT' : 'DOMESTIC CAP'}
              </span>
            </div>

            {/* Portrait + Identity */}
            <div className="flex items-center gap-4 bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
              <PlayerPortrait player={currentPlayer} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-[#F4F6FA] truncate">
                    {currentPlayer.fullName}
                  </h2>
                  <span className="font-mono text-base font-extrabold text-[#D8B15B] tabular-nums">
                    OVR {currentPlayer.gameAttributes.ovr}
                  </span>
                </div>
                <div className="text-xs text-[#9BAABD] mt-0.5">
                  {currentPlayer.nationality} · Age {currentPlayer.age} ({currentPlayer.dob})
                </div>
                <div className="text-xs text-[#38BDF8] font-medium mt-1">
                  {currentPlayer.role} · {currentPlayer.battingHand}
                </div>
                <div className="text-[11px] text-[#9BAABD] mt-0.5">
                  Bowl: {currentPlayer.bowlingStyle}
                </div>
              </div>
            </div>

            {/* Base Price & Estimated Valuation */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
                <div className="text-[10px] text-[#9BAABD] font-mono">RESERVE BASE PRICE</div>
                <div className="font-mono text-base font-bold text-[#F4F6FA] tabular-nums mt-0.5">
                  ₹{currentPlayer.gameAttributes.basePriceCr.toFixed(2)} Cr
                </div>
              </div>
              <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5">
                <div className="text-[10px] text-[#9BAABD] font-mono">ESTIMATED VALUATION</div>
                <div className="font-mono text-base font-bold text-[#D8B15B] tabular-nums mt-0.5">
                  ₹{currentPlayer.gameAttributes.estimatedValueCr.toFixed(2)} Cr
                </div>
              </div>
            </div>

            {/* Game-Calculated Tactical Attributes */}
            <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[#9BAABD]">TACTICAL ATTRIBUTES</span>
                <span className="font-mono text-[10px] text-[#38BDF8]">GAME CALCULATED</span>
              </div>

              {[
                { label: 'Batting Power', val: currentPlayer.gameAttributes.battingPower, color: '#D8B15B' },
                { label: 'Batting Timing', val: currentPlayer.gameAttributes.battingTiming, color: '#23B875' },
                { label: 'Bowling Skill', val: currentPlayer.gameAttributes.bowlingSkill, color: '#38BDF8' },
                { label: 'Fielding Reflexes', val: currentPlayer.gameAttributes.fieldingReflexes, color: '#23B875' },
              ].map((attr) => (
                <div key={attr.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9BAABD]">{attr.label}</span>
                    <span className="font-mono font-bold text-[#F4F6FA] tabular-nums">{attr.val}</span>
                  </div>
                  <div className="h-1.5 bg-[#07111F] rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${attr.val}%`, backgroundColor: attr.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Career Statistics */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-3">
            <div className="text-[11px] font-mono text-[#D8B15B] mb-2">
              VERIFIED CAREER RECORD ({currentPlayer.verifiedStats.matches} MATCHES · {currentPlayer.verifiedStats.internationalCaps} INTL CAPS)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#9BAABD] block text-[10px]">RUNS / HS</span>
                <span className="text-[#F4F6FA] font-bold">
                  {currentPlayer.verifiedStats.runs} ({currentPlayer.verifiedStats.highestScore})
                </span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">BAT AVG / SR</span>
                <span className="text-[#23B875] font-bold">
                  {currentPlayer.verifiedStats.battingAvg} / {currentPlayer.verifiedStats.strikeRate}
                </span>
              </div>
              <div>
                <span className="text-[#9BAABD] block text-[10px]">WKTS / ECON</span>
                <span className="text-[#38BDF8] font-bold">
                  {currentPlayer.verifiedStats.wickets} / {currentPlayer.verifiedStats.economy ?? '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTRE COLUMN: LIVE BIDDING PODIUM & CONTROLS (4 COLS) */}
        <div className="lg:col-span-4 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
            <span className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
              LIVE AUCTIONEER PODIUM
            </span>
            <button
              onClick={() => {
                audioEngine.ensureStarted();
                onUpdateAuctionAndTeams(
                  { ...auction, isPaused: !auction.isPaused },
                  state.teams
                );
              }}
              className="px-2.5 py-1 rounded-[4px] bg-[#17283D] border border-[#1F3552] text-xs font-mono text-[#D8B15B] flex items-center gap-1"
            >
              {auction.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{auction.isPaused ? 'Start Clock' : 'Pause Clock'}</span>
            </button>
          </div>

          {/* Current Highest Bid & Countdown Display */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[8px] p-4 text-center space-y-3 relative">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#9BAABD]">STATUS:</span>
              <span
                className={`font-bold ${
                  auction.status === 'SOLD'
                    ? 'text-[#23B875]'
                    : auction.status === 'UNSOLD'
                    ? 'text-[#E45B63]'
                    : auction.status === 'GOING_TWICE'
                    ? 'text-[#E45B63]'
                    : 'text-[#D8B15B]'
                }`}
              >
                {auction.status.replace('_', ' ')}
              </span>
            </div>

            <div>
              <div className="text-[11px] font-mono text-[#9BAABD]">CURRENT HIGHEST BID</div>
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#D8B15B] tabular-nums tracking-tight mt-1">
                ₹{auction.currentBidCr.toFixed(2)} Cr
              </div>
            </div>

            {/* Leading Franchise Indicator */}
            <div className="flex items-center justify-center gap-2.5 py-2 px-3 bg-[#101F32] border border-[#1F3552] rounded-[6px]">
              {leadingTeam ? (
                <>
                  <TeamBadge team={leadingTeam} size="sm" />
                  <div className="text-left">
                    <div className="text-[10px] text-[#9BAABD]">HIGHEST BIDDER</div>
                    <div className="font-display text-xs font-bold text-[#F4F6FA]">
                      {leadingTeam.name}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-xs text-[#9BAABD] font-mono">
                  Awaiting Opening Bid at ₹{auction.currentBidCr.toFixed(2)} Cr
                </span>
              )}
            </div>

            {/* Countdown Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono tabular-nums">
                <span className="text-[#9BAABD]">GAVEL COUNTDOWN</span>
                <span className={auction.countdown <= 4 ? 'text-[#E45B63] font-bold' : 'text-[#38BDF8]'}>
                  {auction.countdown}s
                </span>
              </div>
              <div className="h-2 bg-[#07111F] rounded-full overflow-hidden border border-[#1F3552]">
                <div
                  className={`h-full transition-all duration-300 ${
                    auction.countdown <= 4 ? 'bg-[#E45B63]' : 'bg-[#D8B15B]'
                  }`}
                  style={{ width: `${(auction.countdown / 15) * 100}%` }}
                />
              </div>
            </div>

            {/* Cinematic SOLD / UNSOLD Presentation Overlay */}
            {(auction.status === 'SOLD' || auction.status === 'UNSOLD') && (
              <div className="absolute inset-0 z-20 bg-[#07111F]/95 border-2 border-[#D8B15B] rounded-[8px] p-4 flex flex-col items-center justify-center space-y-2">
                <div
                  className={`font-display text-2xl font-black tracking-widest px-4 py-1 rounded-[4px] border ${
                    auction.status === 'SOLD'
                      ? 'bg-[#23B875]/20 border-[#23B875] text-[#23B875]'
                      : 'bg-[#E45B63]/20 border-[#E45B63] text-[#E45B63]'
                  }`}
                >
                  {auction.status === 'SOLD' ? 'SOLD!' : 'UNSOLD'}
                </div>
                {auction.status === 'SOLD' && leadingTeam && (
                  <div className="text-xs text-[#F4F6FA]">
                    Acquired by <strong className="text-[#D8B15B]">{leadingTeam.name}</strong> for{' '}
                    <strong className="font-mono">₹{auction.currentBidCr.toFixed(2)} Cr</strong>
                    <div className="text-[10px] text-[#9BAABD] mt-0.5">
                      (Deducted strictly from {leadingTeam.shortCode} purse)
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleAdvanceToNextLot()}
                  className="mt-2 px-4 py-2 rounded-[4px] bg-[#D8B15B] text-[#07111F] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Bring Next Lot to Podium</span>
                </button>
              </div>
            )}
          </div>

          {bidErrorMsg && (
            <div className="px-3 py-1.5 rounded bg-[#E45B63]/20 border border-[#E45B63] text-[11px] font-mono text-[#E45B63]">
              {bidErrorMsg}
            </div>
          )}

          {/* Interactive Bidding Action Controls (Place Bid, +0.25, Quick +0.50, Aggressive +1.00, Custom Bid, Pass, Withdraw) */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleUserBid(0.25, false)}
                disabled={!canUserBid(0.25)}
                className="h-9 px-2 rounded-[4px] bg-[#D8B15B] hover:bg-[#e5c26d] disabled:opacity-40 text-[#07111F] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Gavel className="w-3 h-3" />
                <span>
                  {auction.leadingTeamId === null
                    ? `Place ₹${auction.currentBidCr.toFixed(2)}Cr`
                    : '+₹0.25 Cr'}
                </span>
              </button>

              <button
                onClick={() => handleUserBid(0.5, false)}
                disabled={!canUserBid(0.5)}
                className="h-9 px-2 rounded-[4px] bg-[#38BDF8] hover:bg-[#56ccf9] disabled:opacity-40 text-[#07111F] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Quick +₹0.50Cr</span>
              </button>

              <button
                onClick={() => handleUserBid(1.0, true)}
                disabled={!canUserBid(1.0)}
                className="h-9 px-2 rounded-[4px] bg-[#23B875] hover:bg-[#29cf84] disabled:opacity-40 text-[#07111F] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Aggr +₹1.00Cr</span>
              </button>
            </div>

            {/* Custom Bid Input Row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.25"
                  min={auction.currentBidCr + 0.25}
                  max={userTeam.purseRemainingCr}
                  value={customBidInput}
                  onChange={(e) => setCustomBidInput(e.target.value)}
                  placeholder={`Custom Bid in ₹ Cr ( > ${auction.currentBidCr.toFixed(2)} )`}
                  className="w-full h-8 px-2.5 rounded-[4px] bg-[#0B1728] border border-[#1F3552] text-xs font-mono text-[#F4F6FA]"
                />
              </div>
              <button
                onClick={() => {
                  const parsed = parseFloat(customBidInput);
                  if (!isNaN(parsed)) {
                    handleUserBid(0, true, parsed);
                  }
                }}
                disabled={
                  !customBidInput ||
                  auction.status === 'SOLD' ||
                  auction.status === 'UNSOLD'
                }
                className="h-8 px-3 rounded-[4px] bg-[#17283D] hover:bg-[#D8B15B] hover:text-[#07111F] disabled:opacity-40 border border-[#D8B15B]/50 text-xs font-mono font-bold text-[#D8B15B] cursor-pointer whitespace-nowrap"
              >
                Custom Bid
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  audioEngine.playClick();
                  onUpdateAuctionAndTeams(
                    { ...auction, userPassedCurrentLot: true, isPaused: false },
                    state.teams
                  );
                }}
                disabled={auction.status === 'SOLD' || auction.status === 'UNSOLD'}
                className="h-8 px-2.5 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#1F3552] text-xs font-medium text-[#9BAABD] hover:text-[#F4F6FA] transition-colors whitespace-nowrap cursor-pointer"
              >
                Pass Lot
              </button>

              <button
                onClick={() => {
                  audioEngine.playClick();
                  onUpdateAuctionAndTeams(
                    {
                      ...auction,
                      leadingTeamId:
                        auction.leadingTeamId === userTeam.id ? null : auction.leadingTeamId,
                      userPassedCurrentLot: true,
                    },
                    state.teams
                  );
                }}
                disabled={auction.status === 'SOLD' || auction.status === 'UNSOLD'}
                className="h-8 px-2.5 rounded-[4px] bg-[#17283D] hover:bg-[#1F3552] border border-[#E45B63]/40 text-xs font-medium text-[#E45B63] transition-colors whitespace-nowrap cursor-pointer"
              >
                Withdraw
              </button>

              <button
                onClick={handleInstantHammer}
                disabled={auction.status === 'SOLD' || auction.status === 'UNSOLD'}
                className="h-8 px-2.5 rounded-[4px] bg-[#17283D] hover:bg-[#D8B15B] hover:text-[#07111F] border border-[#D8B15B]/50 text-xs font-semibold text-[#D8B15B] transition-colors whitespace-nowrap cursor-pointer"
              >
                Instant Hammer
              </button>
            </div>
          </div>

          {/* Bid Progression Log with AI War Room Rationale */}
          <div className="bg-[#0B1728] border border-[#1F3552] rounded-[6px] p-2.5 space-y-1.5 flex-1">
            <div className="text-[10px] font-mono text-[#9BAABD] uppercase">
              LIVE BID PROGRESSION & WAR ROOM TELEMETRY
            </div>
            <div className="space-y-1 max-h-[115px] overflow-y-auto pr-1">
              {auction.bidHistory.length === 0 ? (
                <div className="text-xs text-[#9BAABD] py-3 text-center">
                  No bids placed yet on Lot #{auction.lotNumber}. Click &quot;Place Bid&quot; or &quot;Start Clock&quot;.
                </div>
              ) : (
                auction.bidHistory.map((b) => (
                  <div
                    key={b.id}
                    className="py-1 px-2 rounded bg-[#101F32] border border-[#1F3552]/60 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#F4F6FA]">
                          {b.teamShortCode}
                        </span>
                        {b.isAggressive && (
                          <span className="text-[10px] font-mono text-[#23B875]">
                            [JUMP BID]
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-[#D8B15B] tabular-nums">
                        ₹{b.amountCr.toFixed(2)} Cr
                      </div>
                    </div>
                    {b.rationale && (
                      <div className="text-[10px] text-[#9BAABD] truncate mt-0.5">
                        {b.rationale}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FRANCHISE WAR ROOMS (4 COLS) */}
        <div className="lg:col-span-4 bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
                PARTICIPATING FRANCHISE WAR ROOMS
              </h2>
              <p className="text-[11px] text-[#9BAABD]">
                Real-time purse, slots, and squad acquisitions
              </p>
            </div>
            <span className="font-mono text-xs text-[#23B875] tabular-nums">
              {auction.soldLots.length} Sold
            </span>
          </div>

          <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
            {Object.values(state.teams).map((team) => {
              const isLeading = auction.leadingTeamId === team.id;
              const isUser = team.id === state.userTeamId;
              const ovsCount = getTeamOverseasCount(team);
              const slotsLeft = Math.max(0, maxSquadSize - team.squadPlayerIds.length);
              const teamSoldCount = auction.soldLots.filter((s) => s.teamId === team.id).length;

              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedWarRoomTeamId(team.id)}
                  className={`p-2.5 rounded-[6px] border cursor-pointer transition-colors ${
                    isLeading
                      ? 'bg-[#17283D] border-[#D8B15B]'
                      : selectedWarRoomTeamId === team.id
                      ? 'bg-[#17283D]/70 border-[#38BDF8]'
                      : 'bg-[#0B1728] border-[#1F3552] hover:bg-[#17283D]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={team} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-xs font-bold text-[#F4F6FA]">
                            {team.name}
                          </span>
                          {isUser && (
                            <span className="font-mono text-[10px] text-[#D8B15B]">[YOU]</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#9BAABD] font-mono tabular-nums">
                          Slots Rem: {slotsLeft} · Overseas: {ovsCount}/{maxOverseas} · Bought: {teamSoldCount}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-[#D8B15B] tabular-nums">
                        ₹{team.purseRemainingCr.toFixed(2)} Cr
                      </div>
                      <div
                        className={`text-[10px] font-mono ${
                          isLeading ? 'text-[#23B875] font-bold' : 'text-[#9BAABD]'
                        }`}
                      >
                        {isLeading ? 'HOLDING BID' : 'ACTIVE'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM HORIZONTAL QUEUE: UPCOMING LOTS */}
      <div className="bg-[#101F32] border border-[#1F3552] rounded-[8px] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1F3552] pb-2">
          <div>
            <h3 className="font-display text-xs font-bold text-[#F4F6FA] tracking-wider uppercase">
              UPCOMING AUCTION LOTS QUEUE
            </h3>
            <p className="text-[11px] text-[#9BAABD]">
              Click any upcoming player lot to bring them to the auction podium immediately
            </p>
          </div>
          <span className="font-mono text-xs text-[#38BDF8] tabular-nums">
            {auction.upcomingPlayerIds.length} Marquee Lots Queued
          </span>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
          {auction.upcomingPlayerIds.map((pid, idx) => {
            const p = state.players[pid];
            if (!p) return null;
            return (
              <div
                key={pid}
                onClick={() => handleAdvanceToNextLot(pid)}
                className="min-w-[230px] bg-[#0B1728] hover:bg-[#17283D] border border-[#1F3552] rounded-[6px] p-3 cursor-pointer transition-colors flex flex-col justify-between gap-2 shrink-0"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#9BAABD]">
                  <span>QUEUE #{idx + 1}</span>
                  <span className="text-[#D8B15B]">OVR {p.gameAttributes.ovr}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <PlayerPortrait player={p} size="sm" />
                  <div className="min-w-0">
                    <div className="font-display text-xs font-bold text-[#F4F6FA] truncate">
                      {p.fullName}
                    </div>
                    <div className="text-[11px] text-[#9BAABD] truncate">
                      {p.nationality} · {p.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-[#1F3552]/70 text-[11px] font-mono tabular-nums">
                  <span className="text-[#9BAABD]">Base: ₹{p.gameAttributes.basePriceCr.toFixed(1)}Cr</span>
                  <span className="text-[#23B875]">READY</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
