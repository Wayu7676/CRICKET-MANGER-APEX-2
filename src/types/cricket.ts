export type ScreenId =
  | 'dashboard'
  | 'career'
  | 'matchprep'
  | 'squad'
  | 'database'
  | 'scouting'
  | 'training'
  | 'match'
  | 'fixtures'
  | 'analytics'
  | 'auction'
  | 'transfers'
  | 'finance'
  | 'stadium'
  | 'settings'
  | 'saveload';

export type CompetitionMode = 'FRANCHISE_T20' | 'INTERNATIONAL';
export type SeasonYear = '2024' | '2025' | '2026';
export type MatchFormat = 'T20' | 'ODI' | 'Test';

export type PlayerRole =
  | 'Batsman'
  | 'Fast Bowler'
  | 'Spin Bowler'
  | 'All-Rounder'
  | 'Wicketkeeper';

export type BattingMindset = 'Defend' | 'Rotate Strike' | 'Balanced' | 'Attack' | 'Loft';

export type BowlingDelivery =
  | 'Yorker'
  | 'Bouncer'
  | 'Good Length'
  | 'Short Ball'
  | 'Slower Ball'
  | 'Wide Line'
  | 'Off-stump'
  | 'Leg-stump';

export type BowlingAggressiveness =
  | 'High Aggression'
  | 'Balanced Control'
  | 'Defensive Containment';

export type FieldPreset = 'Attacking' | 'Balanced' | 'Defensive' | 'Death Overs' | 'Custom';

export interface CustomFormationPreset {
  id: string;
  name: string;
  formatTag: MatchFormat;
  description: string;
  fieldPreset: FieldPreset;
  bowlingAggressiveness: BowlingAggressiveness;
  defaultDelivery: BowlingDelivery;
  defaultBattingMindset: BattingMindset;
  fielderCoordinates: { label: string; x: number; y: number }[];
  isBuiltIn?: boolean;
}

export interface VerifiedCareerStats {
  matches: number;
  innings: number;
  runs: number;
  battingAvg: number;
  strikeRate: number;
  highestScore: string;
  hundreds: number;
  fifties: number;
  wickets: number;
  bowlingAvg: number | null;
  economy: number | null;
  bestBowling: string;
  catches: number;
  stumpings: number;
  internationalCaps: number;
}

export interface CalculatedGameAttributes {
  ovr: number;
  potential: number;
  battingPower: number;
  battingTiming: number;
  paceVsSpin: number;
  bowlingSkill: number;
  control: number;
  variations: number;
  deathBowling: number;
  fieldingReflexes: number;
  fitness: number;
  form: number;
  morale: number;
  basePriceCr: number;
  estimatedValueCr: number;
  contractSalaryCr: number;
  contractYears?: number;
  contractBonusCr?: number;
  squadStatusRole?: 'Marquee Core' | 'First XI Starter' | 'Rotation Specialist' | 'Emerging Prospect';
}

export interface RealCricketer {
  id: string;
  fullName: string;
  shortName: string;
  nationality: string;
  countryCode: string;
  dob: string;
  age: number;
  jerseyNumber: number;
  role: PlayerRole;
  battingHand: 'Right-hand bat' | 'Left-hand bat';
  bowlingStyle: string;
  isOverseasInIPL: boolean;
  isAcademyProspect?: boolean;
  injuryStatus: 'FIT' | 'MINOR_STRAIN' | 'RECOVERING';
  franchiseAffiliations: Record<SeasonYear, string>;
  internationalTeamId: string;
  verifiedStats: VerifiedCareerStats;
  gameAttributes: CalculatedGameAttributes;
  recentPerformances: string[];
  tacticalInstruction: {
    preferredBattingPhase: 'Powerplay' | 'Middle Overs' | 'Death Finisher' | 'Anchor';
    bowlingRole: 'New Ball' | 'Middle Choke' | 'Death Specialist' | 'Part-Time' | 'None';
    trainingFocus: 'Power Hitting' | 'Strike Rotation' | 'Yorker Accuracy' | 'Spin Variations' | 'Athletic Fielding';
  };
}

export interface TeamInfo {
  id: string;
  name: string;
  shortCode: string;
  mode: CompetitionMode;
  cityOrCountry: string;
  primaryColor: string;
  secondaryColor: string;
  homeVenue: string;
  stadiumCapacity: number;
  purseRemainingCr: number;
  totalPurseCr: number;
  reputation: number;
  captainId: string;
  viceCaptainId?: string;
  wicketkeeperId: string;
  playingXIIds: string[];
  squadPlayerIds: string[];
  recentForm: ('W' | 'L')[];
  standings: {
    played: number;
    won: number;
    lost: number;
    tied: number;
    points: number;
    nrr: number;
  };
}

export interface FielderToken {
  id: string;
  label: string;
  playerId: string;
  x: number;
  y: number;
}

export interface BallOutcomeRecord {
  id: string;
  innings: 1 | 2;
  overNumber: number;
  ballInOver: number;
  overLabel: string;
  bowlerName: string;
  batsmanName: string;
  runs: number;
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  isWicket: boolean;
  wicketType?: string;
  isExtra: boolean;
  extraType?: 'WD' | 'NB';
  badgeLabel: '0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'WD';
  commentary: string;
  matchContextNote: string;
  pitchBounce: { x: number; y: number };
  shotEnd: { x: number; y: number };
  speedKph: number;
}

export interface BatterInningsStat {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalText: string;
  fatigue: number;
  confidence: number;
}

export interface BowlerSpellStat {
  playerId: string;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  fatigue: number;
  confidence: number;
}

export interface LiveMatchState {
  matchId: string;
  competitionName: string;
  matchNumber: number;
  format?: MatchFormat;
  isCustomMatch?: boolean;
  difficulty?: 'Standard' | 'Challenger' | 'Elite';
  venue: string;
  groundDimensions?: string;
  temperatureHumidity?: string;
  startTime?: string;
  weather: 'Clear Night · 26°C' | 'Humid Evening · 29°C' | 'Partly Cloudy · 23°C' | 'Breezy Dusk · 24°C';
  pitchCondition: 'Hard Batting Track' | 'Green Seam Surface' | 'Dry Spinning Deck' | 'Balanced Two-Paced';
  dewFactor: 'Low (15%)' | 'Moderate (45%)' | 'Heavy Evening Dew (78%)';
  tossWinnerTeamId?: string | null;
  tossDecision?: 'BAT' | 'BOWL' | null;
  tossCompleted?: boolean;
  userTeamId: string;
  opponentTeamId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  innings: 1 | 2;
  totalOvers: number;
  score: number;
  wickets: number;
  ballsBowled: number;
  firstInningsScore: number | null;
  firstInningsWickets: number | null;
  firstInningsBalls: number | null;
  target: number | null;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  partnershipRuns: number;
  partnershipBalls: number;
  currentOverBalls: ('0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'WD')[];
  battingStats: Record<string, BatterInningsStat>;
  bowlingStats: Record<string, BowlerSpellStat>;
  battingOrderIds: string[];
  bowlingOptionsIds: string[];
  battingMindset: BattingMindset;
  bowlingDelivery: BowlingDelivery;
  bowlingAggressiveness?: BowlingAggressiveness;
  activeFormationId?: string;
  fieldPreset: FieldPreset;
  fielders: FielderToken[];
  commentaryLog: BallOutcomeRecord[];
  overHistoryRuns: { over: number; runs: number; wickets: number; teamId: string }[];
  winProbabilityBattingTeam: number;
  isCompleted: boolean;
  winnerTeamId: string | null;
  resultText: string;
  lastCelebration: 'NONE' | 'FOUR' | 'SIX' | 'WICKET' | 'MILESTONE' | 'INNINGS_BREAK' | 'VICTORY';
}

export interface AuctionBidEntry {
  id: string;
  teamId: string;
  teamShortCode: string;
  amountCr: number;
  timestamp: string;
  isAggressive: boolean;
  rationale?: string;
}

export interface AuctionState {
  lotNumber: number;
  currentPlayerId: string;
  currentBidCr: number;
  leadingTeamId: string | null;
  countdown: number;
  status: 'ACTIVE' | 'GOING_ONCE' | 'GOING_TWICE' | 'SOLD' | 'UNSOLD';
  isPaused: boolean;
  userPassedCurrentLot: boolean;
  bidHistory: AuctionBidEntry[];
  upcomingPlayerIds: string[];
  soldLots: { playerId: string; teamId: string; amountCr: number; role?: string }[];
  unsoldPlayerIds: string[];
}

export interface ManagementDecision {
  id: string;
  category: 'CONTRACT' | 'CURATOR' | 'ACADEMY' | 'AVAILABILITY';
  title: string;
  description: string;
  impactText: string;
  costCr: number;
  options: {
    id: string;
    label: string;
    effectSummary: string;
  }[];
  resolvedOptionId?: string;
}

export interface NewsItem {
  id: string;
  date: string;
  category: 'MATCH_REPORT' | 'TRANSFER' | 'TACTICAL' | 'TOURNAMENT';
  headline: string;
  summary: string;
}

export interface FixtureItem {
  id: string;
  matchNumber: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  pitch: LiveMatchState['pitchCondition'];
  weather: LiveMatchState['weather'];
  isRivalryDerby?: boolean;
  rivalryName?: string;
  completed: boolean;
  homeScoreText?: string;
  awayScoreText?: string;
  winnerTeamId?: string;
  resultSummary?: string;
}

export interface SponsorDeal {
  id: string;
  name: string;
  tier: 'Title Partner' | 'Front of Jersey' | 'Broadcast Analytics Partner' | 'Kit & Equipment';
  guaranteedCr: number;
  winBonusCr: number;
  active: boolean;
}

export interface StadiumFacility {
  id: string;
  name: string;
  category: 'Stand Capacity' | 'LED Floodlights & Broadcast' | 'Hawk-Eye Biomechanics Lab' | 'Drainage & Pitch Turf' | 'Youth Academy Complex';
  level: number;
  maxLevel: number;
  upgradeCostCr: number;
  benefitText: string;
}

export interface CareerLegacyMetrics {
  trophiesWon: number;
  matchesManaged: number;
  matchesWon: number;
  playersDeveloped: number;
  successfulAuctionSignings: number;
  highestTeamScore: string;
  milestones: string[];
}

export interface GameSaveState {
  version: string;
  saveName: string;
  savedAt: string;
  managerName: string;
  managerReputation: number;
  boardTrust: number;
  squadMorale: number;
  teamChemistry?: number;
  currentDate: string;
  season: SeasonYear;
  mode: CompetitionMode;
  userTeamId: string;
  players: Record<string, RealCricketer>;
  teams: Record<string, TeamInfo>;
  fixtures: FixtureItem[];
  decisions: ManagementDecision[];
  news: NewsItem[];
  sponsors: SponsorDeal[];
  facilities: StadiumFacility[];
  customFormations?: CustomFormationPreset[];
  careerLegacy?: CareerLegacyMetrics;
  finances: {
    broadcastRightsCr: number;
    sponsorshipsCr: number;
    gateReceiptsCr: number;
    wageBillCr: number;
    remainingBudgetCr: number;
    totalBalanceCr: number;
  };
  liveMatch: LiveMatchState;
  auction: AuctionState;
}
