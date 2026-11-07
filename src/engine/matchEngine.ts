import {
  BallOutcomeRecord,
  LiveMatchState,
  RealCricketer,
  TeamInfo,
} from '../types/cricket';
import { getDefaultFielders } from '../data/realCricketers';

/**
 * Calculates Win Probability for the batting team based on actual match state
 * (Runs required, Balls remaining, Wickets in hand, Pitch & Dew modifiers).
 * Never returns random percentages disconnected from the match.
 */
export function calculateDynamicWinProbability(match: LiveMatchState): number {
  if (match.isCompleted) {
    return match.winnerTeamId === match.battingTeamId ? 100 : 0;
  }

  const totalBalls = match.totalOvers * 6;
  const ballsRemaining = Math.max(1, totalBalls - match.ballsBowled);
  const wicketsRemaining = Math.max(1, 10 - match.wickets);

  if (match.innings === 1) {
    const currentRunRate = (match.score / Math.max(1, match.ballsBowled)) * 6;
    const projected = match.score + (currentRunRate * ballsRemaining) / 6;
    const parScore =
      match.pitchCondition === 'Hard Batting Track'
        ? 192
        : match.pitchCondition === 'Dry Spinning Deck'
        ? 166
        : match.pitchCondition === 'Green Seam Surface'
        ? 172
        : 180;
    const diff = projected - parScore + (wicketsRemaining - 5) * 4.5;
    const prob = 1 / (1 + Math.exp(-diff / 22));
    return Math.max(4, Math.min(96, Math.round(prob * 100)));
  }

  // Second innings chase calculation
  const target = match.target ?? (match.firstInningsScore ?? 180) + 1;
  const runsNeeded = target - match.score;

  if (runsNeeded <= 0) return 100;
  if (match.wickets >= 10) return 0;

  const rrr = (runsNeeded / ballsRemaining) * 6;
  const resourceCapableRunRate =
    8.6 +
    (wicketsRemaining - 4) * 0.65 +
    (match.dewFactor.includes('Heavy') ? 0.55 : match.dewFactor.includes('Moderate') ? 0.25 : 0);

  const rateDelta = resourceCapableRunRate - rrr;
  const ballPressure = ballsRemaining < 18 ? (rateDelta * 1.45) : rateDelta;

  const rawProb = 1 / (1 + Math.exp(-ballPressure / 1.85));
  return Math.max(2, Math.min(98, Math.round(rawProb * 100)));
}

/**
 * Simulates a single delivery in the Live Match Centre, incorporating:
 * - Striker vs Bowler verified game attributes
 * - Batting Mindset (Defend, Rotate Strike, Balanced, Attack, Loft)
 * - Bowling Delivery (Yorker, Bouncer, Good Length, Short Ball, Slower Ball, Wide Line, Off-stump, Leg-stump)
 * - Field Preset AND exact movable FielderToken coordinates on the oval SVG
 */
export function simulateNextDelivery(
  match: LiveMatchState,
  players: Record<string, RealCricketer>,
  teams: Record<string, TeamInfo>
): LiveMatchState {
  if (match.isCompleted) return match;

  const next: LiveMatchState = JSON.parse(JSON.stringify(match));
  const striker = players[next.strikerId] || Object.values(players)[0];
  const nonStriker = players[next.nonStrikerId] || Object.values(players)[1];
  const bowler = players[next.currentBowlerId] || Object.values(players)[2];

  const strikerStat = next.battingStats[striker.id] || {
    playerId: striker.id,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissalText: 'not out',
    fatigue: 10,
    confidence: 75,
  };
  next.battingStats[striker.id] = strikerStat;

  const bowlerStat = next.bowlingStats[bowler.id] || {
    playerId: bowler.id,
    ballsBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    fatigue: 10,
    confidence: 75,
  };
  next.bowlingStats[bowler.id] = bowlerStat;

  // Calculate base weights for outcomes: [Dot, 1, 2, 3, 4, 6, Wicket, Wide]
  const batSkill =
    (striker.gameAttributes.battingTiming * 0.5 +
      striker.gameAttributes.battingPower * 0.5 +
      (strikerStat.confidence - 70) * 0.25 -
      strikerStat.fatigue * 0.15);

  const bowlSkill =
    (bowler.gameAttributes.bowlingSkill * 0.45 +
      bowler.gameAttributes.control * 0.35 +
      bowler.gameAttributes.variations * 0.2 -
      bowlerStat.fatigue * 0.15);

  const skillAdvantage = (batSkill - bowlSkill) / 100; // typically -0.25 to +0.25

  let wDot = 34;
  let wSingle = 35;
  let wTwo = 7;
  let wThree = 1;
  let wFour = 12;
  let wSix = 5.5;
  let wWicket = 4.2;
  let wWide = 1.3;

  // Apply Batting Mindset modifiers
  switch (next.battingMindset) {
    case 'Defend':
      wDot += 18;
      wSingle -= 4;
      wFour -= 6;
      wSix -= 4;
      wWicket -= 2.4;
      break;
    case 'Rotate Strike':
      wSingle += 14;
      wTwo += 4;
      wDot -= 8;
      wSix -= 2.5;
      wWicket -= 1.2;
      break;
    case 'Attack':
      wFour += 6.5;
      wSix += 3.5;
      wDot -= 7;
      wSingle -= 5;
      wWicket += 2.1;
      break;
    case 'Loft':
      wSix += 8.5;
      wFour += 4;
      wSingle -= 10;
      wDot -= 6;
      wWicket += 4.2;
      break;
    default:
      break;
  }

  // Apply Bowling Delivery modifiers
  let pitchBounce = { x: 50, y: 44 };
  switch (next.bowlingDelivery) {
    case 'Yorker':
      pitchBounce = { x: 50 + (Math.random() * 2 - 1), y: 36.5 };
      if (bowler.gameAttributes.deathBowling >= 88) {
        wDot += 8;
        wWicket += 1.8;
        wSix -= 3;
      } else {
        // Missed yorker becomes full toss
        wFour += 3;
      }
      break;
    case 'Bouncer':
      pitchBounce = { x: 50 + (Math.random() * 3 - 1.5), y: 50.5 };
      wDot += 5;
      wWicket += 1.4;
      wSingle -= 4;
      break;
    case 'Good Length':
      pitchBounce = { x: 49 + (Math.random() * 2 - 1), y: 44 };
      wDot += 4;
      wSix -= 1.5;
      break;
    case 'Short Ball':
      pitchBounce = { x: 51 + (Math.random() * 3 - 1.5), y: 48.5 };
      wFour += 2.5;
      wSix += 1.5;
      wWicket += 1.1;
      break;
    case 'Slower Ball':
      pitchBounce = { x: 48.5 + (Math.random() * 3 - 1.5), y: 43 };
      if (next.battingMindset === 'Loft' || next.battingMindset === 'Attack') {
        wWicket += 2.2;
        wDot += 4;
      }
      break;
    case 'Wide Line':
      pitchBounce = { x: 44.5, y: 43.5 };
      wWide += 2.8;
      wSix -= 2.2;
      wDot += 3;
      break;
    case 'Off-stump':
      pitchBounce = { x: 47.8, y: 44 };
      wDot += 3;
      break;
    case 'Leg-stump':
      pitchBounce = { x: 52.2, y: 44 };
      wSingle += 4;
      break;
  }

  // Apply Field Preset modifiers
  if (next.fieldPreset === 'Attacking') {
    wWicket += 1.8;
    wDot += 4;
    wFour += 3.5;
  } else if (next.fieldPreset === 'Defensive' || next.fieldPreset === 'Death Overs') {
    wFour -= 4.2;
    wSix -= 1.8;
    wSingle += 6;
    wTwo += 2.5;
  }

  // Apply Bowling Aggressiveness modifiers (from custom formation presets or live tactical bar)
  if (next.bowlingAggressiveness === 'High Aggression') {
    wWicket += 2.1;
    wDot += 3.5;
    wFour += 2.4;
    wSix += 1.2;
    wSingle -= 4.0;
  } else if (next.bowlingAggressiveness === 'Defensive Containment') {
    wFour -= 3.5;
    wSix -= 2.2;
    wSingle += 5.5;
    wDot += 2.0;
    wWicket -= 0.9;
  }

  // Apply skill advantage
  wFour = Math.max(2, wFour + skillAdvantage * 18);
  wSix = Math.max(1, wSix + skillAdvantage * 12);
  wWicket = Math.max(1.2, wWicket - skillAdvantage * 10);
  wDot = Math.max(12, wDot - skillAdvantage * 15);

  type DeliveryBadge = '0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'WD';
  const weights: { type: DeliveryBadge; w: number }[] = [
    { type: '0', w: Math.max(5, wDot) },
    { type: '1', w: Math.max(8, wSingle) },
    { type: '2', w: Math.max(2, wTwo) },
    { type: '3', w: Math.max(0.5, wThree) },
    { type: '4', w: Math.max(2, wFour) },
    { type: '6', w: Math.max(1, wSix) },
    { type: 'W', w: Math.max(1.2, wWicket) },
    { type: 'WD', w: Math.max(0.5, wWide) },
  ];

  const totalW = weights.reduce((acc, item) => acc + item.w, 0);
  let roll = Math.random() * totalW;
  let chosen: DeliveryBadge = weights[0].type;
  for (const item of weights) {
    roll -= item.w;
    if (roll <= 0) {
      chosen = item.type;
      break;
    }
  }

  // Generate shot direction angle & distance on Hawk-Eye oval (center at 50,50, boundary radius ~44)
  const angleRad = Math.random() * Math.PI * 2;
  let shotRadius = 18;
  if (chosen === '0') shotRadius = 8 + Math.random() * 10;
  else if (chosen === '1') shotRadius = 20 + Math.random() * 14;
  else if (chosen === '2' || chosen === '3') shotRadius = 31 + Math.random() * 8;
  else if (chosen === '4') shotRadius = 43.5;
  else if (chosen === '6') shotRadius = 46.8;
  else if (chosen === 'W') shotRadius = 15 + Math.random() * 22;

  const shotEnd = {
    x: Math.round((50 + Math.cos(angleRad) * shotRadius) * 10) / 10,
    y: Math.round((50 + Math.sin(angleRad) * shotRadius) * 10) / 10,
  };

  // Check if any custom/preset FielderToken intercepts a boundary four or lofted shot!
  let interceptedByFielder: string | null = null;
  if (chosen === '4') {
    for (const f of next.fielders) {
      const dist = Math.hypot(f.x - shotEnd.x, f.y - shotEnd.y);
      if (dist < 8.5) {
        chosen = '1';
        shotEnd.x = f.x;
        shotEnd.y = f.y;
        interceptedByFielder = f.label;
        break;
      }
    }
  }

  const isSpin = bowler.role === 'Spin Bowler' || bowler.bowlingStyle.toLowerCase().includes('spin') || bowler.bowlingStyle.toLowerCase().includes('orth') || bowler.bowlingStyle.toLowerCase().includes('legbreak');
  const speedKph = isSpin
    ? Math.round((86 + Math.random() * 12) * 10) / 10
    : Math.round((136 + Math.random() * 14) * 10) / 10;

  let runs = 0;
  let isExtra = false;
  let isWicket = false;
  let wicketType = '';

  if (chosen === 'WD') {
    runs = 1;
    isExtra = true;
    next.score += 1;
    next.partnershipRuns += 1;
    bowlerStat.runsConceded += 1;
    next.currentOverBalls.push('WD');
    next.lastCelebration = 'NONE';
  } else {
    next.ballsBowled += 1;
    bowlerStat.ballsBowled += 1;
    strikerStat.balls += 1;
    next.partnershipBalls += 1;
    strikerStat.fatigue = Math.min(95, strikerStat.fatigue + 1.4);
    bowlerStat.fatigue = Math.min(95, bowlerStat.fatigue + 2.2);

    if (chosen === 'W') {
      isWicket = true;
      next.wickets += 1;
      bowlerStat.wickets += 1;
      bowlerStat.confidence = Math.min(99, bowlerStat.confidence + 8);
      strikerStat.isOut = true;
      const dismissalModes = [
        `b ${bowler.shortName}`,
        `c ${players[next.fielders[2]?.playerId]?.shortName || 'Fielder'} b ${bowler.shortName}`,
        `lbw b ${bowler.shortName}`,
        `c †${players[next.fielders[0]?.playerId]?.shortName || 'Keeper'} b ${bowler.shortName}`,
      ];
      wicketType = dismissalModes[Math.floor(Math.random() * dismissalModes.length)];
      strikerStat.dismissalText = wicketType;
      next.currentOverBalls.push('W');
      next.partnershipRuns = 0;
      next.partnershipBalls = 0;
      next.lastCelebration = 'WICKET';
    } else {
      runs = parseInt(chosen, 10);
      next.score += runs;
      strikerStat.runs += runs;
      bowlerStat.runsConceded += runs;
      next.partnershipRuns += runs;
      next.currentOverBalls.push(chosen);

      if (runs === 4) {
        strikerStat.fours += 1;
        strikerStat.confidence = Math.min(99, strikerStat.confidence + 4);
        next.lastCelebration = 'FOUR';
      } else if (runs === 6) {
        strikerStat.sixes += 1;
        strikerStat.confidence = Math.min(99, strikerStat.confidence + 6);
        next.lastCelebration = 'SIX';
      } else {
        next.lastCelebration = 'NONE';
      }

      // Check batter 50 or 100 milestone
      if (
        (strikerStat.runs >= 50 && strikerStat.runs - runs < 50) ||
        (strikerStat.runs >= 100 && strikerStat.runs - runs < 100)
      ) {
        next.lastCelebration = 'MILESTONE';
      }
    }
  }

  const overNum = Math.floor((next.ballsBowled - (isExtra ? 0 : 1)) / 6);
  const ballInOver = isExtra ? (next.ballsBowled % 6) + 1 : ((next.ballsBowled - 1) % 6) + 1;
  const overLabel = `${overNum}.${ballInOver}`;

  // Build detailed broadcast commentary
  let commentary = '';
  if (isExtra) {
    commentary = `WIDE BALL! ${bowler.fullName} pushes the ${next.bowlingDelivery.toLowerCase()} too far outside the tramline; umpire signals wide.`;
  } else if (isWicket) {
    commentary = `OUT! ${wicketType.toUpperCase()}! Tactical masterstroke with the ${next.bowlingDelivery}—${bowler.fullName} breaks through as ${striker.fullName} departs for ${strikerStat.runs} (${strikerStat.balls})!`;
  } else if (runs === 6) {
    commentary = `MAXIMUM! HUGE SIX! ${striker.fullName} picks the ${next.bowlingDelivery.toLowerCase()} early at ${speedKph} kph and launches it 92 meters into the night sky!`;
  } else if (runs === 4) {
    commentary = `FOUR RUNS! Crisp timing from ${striker.fullName} (${strikerStat.runs}* off ${strikerStat.balls})—threads the ${next.fieldPreset.toLowerCase()} ring with surgical precision!`;
  } else if (interceptedByFielder) {
    commentary = `Brilliant diving stop at ${interceptedByFielder}! Looked a certain boundary off ${striker.fullName}'s blade, saved 3 crucial runs.`;
  } else if (runs === 0) {
    commentary = `Dot ball (${speedKph} kph). ${bowler.fullName} lands the ${next.bowlingDelivery.toLowerCase()} on the money; ${striker.fullName} finds the inner ring fielder.`;
  } else {
    commentary = `${striker.fullName} works the ${next.bowlingDelivery.toLowerCase()} into the gap for ${runs} run${runs > 1 ? 's' : ''}. Good running between the wickets.`;
  }

  const target = next.target ?? (next.firstInningsScore ?? 186) + 1;
  const runsNeeded = Math.max(0, target - next.score);
  const ballsRem = Math.max(0, next.totalOvers * 6 - next.ballsBowled);
  const contextNote =
    next.innings === 2
      ? `${runsNeeded} needed from ${ballsRem} balls · RRR ${ballsRem > 0 ? ((runsNeeded / ballsRem) * 6).toFixed(2) : '0.00'}`
      : `Innings 1 · CRR ${((next.score / Math.max(1, next.ballsBowled)) * 6).toFixed(2)}`;

  const record: BallOutcomeRecord = {
    id: `ball_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    innings: next.innings,
    overNumber: overNum,
    ballInOver,
    overLabel,
    bowlerName: bowler.fullName,
    batsmanName: striker.fullName,
    runs,
    isBoundaryFour: runs === 4 && !isExtra,
    isBoundarySix: runs === 6 && !isExtra,
    isWicket,
    wicketType: isWicket ? wicketType : undefined,
    isExtra,
    extraType: isExtra ? 'WD' : undefined,
    badgeLabel: chosen,
    commentary,
    matchContextNote: contextNote,
    pitchBounce,
    shotEnd,
    speedKph,
  };

  next.commentaryLog = [record, ...next.commentaryLog.slice(0, 49)];

  // Handle new batsman on wicket
  if (isWicket && next.wickets < 10) {
    const nextBatterId = next.battingOrderIds.find(
      (id) =>
        id !== next.strikerId &&
        id !== next.nonStrikerId &&
        !next.battingStats[id]?.isOut
    );
    if (nextBatterId) {
      next.strikerId = nextBatterId;
    }
  } else if (!isExtra && (runs === 1 || runs === 3)) {
    // Rotate strike on odd runs
    const temp = next.strikerId;
    next.strikerId = next.nonStrikerId;
    next.nonStrikerId = temp;
  }

  // Handle end of over (every 6 legal balls)
  if (!isExtra && next.ballsBowled % 6 === 0 && next.ballsBowled > 0) {
    const completedOverNumber = next.ballsBowled / 6;
    const overRuns = next.currentOverBalls.reduce((sum, b) => {
      if (b === 'W' || b === '0') return sum;
      if (b === 'WD') return sum + 1;
      return sum + parseInt(b, 10);
    }, 0);
    const overWickets = next.currentOverBalls.filter((b) => b === 'W').length;

    next.overHistoryRuns.push({
      over: completedOverNumber,
      runs: overRuns,
      wickets: overWickets,
      teamId: next.battingTeamId,
    });

    next.currentOverBalls = [];
    // Swap ends at end of over
    const temp = next.strikerId;
    next.strikerId = next.nonStrikerId;
    next.nonStrikerId = temp;

    // Rotate bowler automatically
    const curBowlerIdx = next.bowlingOptionsIds.indexOf(next.currentBowlerId);
    const nextBowlerIdx = (curBowlerIdx + 1) % next.bowlingOptionsIds.length;
    next.currentBowlerId = next.bowlingOptionsIds[nextBowlerIdx];
  }

  // Check innings or match completion
  const maxBalls = next.totalOvers * 6;
  if (next.innings === 1 && (next.wickets >= 10 || next.ballsBowled >= maxBalls)) {
    // Transition to Innings 2
    next.firstInningsScore = next.score;
    next.firstInningsWickets = next.wickets;
    next.firstInningsBalls = next.ballsBowled;
    next.target = next.score + 1;

    const prevBat = next.battingTeamId;
    next.battingTeamId = next.bowlingTeamId;
    next.bowlingTeamId = prevBat;
    next.innings = 2;
    next.score = 0;
    next.wickets = 0;
    next.ballsBowled = 0;
    next.partnershipRuns = 0;
    next.partnershipBalls = 0;
    next.currentOverBalls = [];

    const newBatTeam = teams[next.battingTeamId];
    const newBowlTeam = teams[next.bowlingTeamId];
    next.battingOrderIds = [...newBatTeam.playingXIIds];
    next.bowlingOptionsIds = newBowlTeam.playingXIIds.slice(-5);
    next.strikerId = next.battingOrderIds[0];
    next.nonStrikerId = next.battingOrderIds[1];
    next.currentBowlerId = next.bowlingOptionsIds[0];
    next.fielders = getDefaultFielders(newBowlTeam.playingXIIds);
    next.lastCelebration = 'INNINGS_BREAK';

    for (const id of next.battingOrderIds) {
      if (!next.battingStats[id]) {
        next.battingStats[id] = {
          playerId: id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalText: 'not out',
          fatigue: 8,
          confidence: 78,
        };
      }
    }
    for (const id of next.bowlingOptionsIds) {
      if (!next.bowlingStats[id]) {
        next.bowlingStats[id] = {
          playerId: id,
          ballsBowled: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          fatigue: 10,
          confidence: 80,
        };
      }
    }
  } else if (next.innings === 2) {
    const chaseTarget = next.target ?? (next.firstInningsScore ?? 186) + 1;
    if (next.score >= chaseTarget) {
      next.isCompleted = true;
      next.winnerTeamId = next.battingTeamId;
      const wktsLeft = 10 - next.wickets;
      const ballsLeft = maxBalls - next.ballsBowled;
      next.resultText = `${teams[next.battingTeamId]?.name} won by ${wktsLeft} wickets (${ballsLeft} balls remaining)`;
      next.lastCelebration = 'VICTORY';
    } else if (next.wickets >= 10 || next.ballsBowled >= maxBalls) {
      next.isCompleted = true;
      if (next.score === chaseTarget - 1) {
        next.winnerTeamId = next.battingTeamId;
        next.resultText = `Match Tied — ${teams[next.battingTeamId]?.shortCode} wins Super Over tie-breaker!`;
      } else {
        next.winnerTeamId = next.bowlingTeamId;
        const margin = chaseTarget - 1 - next.score;
        next.resultText = `${teams[next.bowlingTeamId]?.name} won by ${margin} runs`;
      }
      next.lastCelebration = 'VICTORY';
    }
  }

  next.winProbabilityBattingTeam = calculateDynamicWinProbability(next);
  return next;
}
