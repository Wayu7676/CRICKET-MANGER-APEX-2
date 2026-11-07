# Cricket Apex Manager — Tactical Broadcast & Management Simulation

A high-performance, browser-based cricket management and televised broadcast simulation featuring genuine international and franchise cricketers, an interactive Hawk-Eye live match engine, a real-time multi-franchise auction room, tactical squad deployment, and a procedural Web Audio API stadium & soundtrack engine.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been confirmed from your answers and integrated with the master specification:

- **Confirmed Decision 1 — Dual Competition Modes & Season Selector**: Supports both **Franchise T20 League** (10-team franchise structure with full purses, overseas quotas, and auction mechanics) and **International Cricket** (major cricket nations across T20I, ODI, and Test series) with a live **Season Selector** (`2024`, `2025`, `2026`) that loads verified, season-accurate player-team rosters and authentic career statistics.
- **Confirmed Decision 2 — Procedural Web Audio API Sound & Crowd Engine**: Uses a self-contained, multi-channel Web Audio API synthesizer and dynamic stadium ambience generator. Guarantees zero broken external audio links, respects browser autoplay policies, crossfades smoothly between contexts (Dashboard ambient, Auction tension, Live Match stadium roar), and scales crowd intensity dynamically with match events (dot balls, boundaries, sixes, wickets, and high-tension chases).
- **Confirmed Decision 3 — Full Interactivity Across All 14 Sidebar Screens**: Every screen in the persistent left navigation (`Dashboard`, `Career Hub`, `Squad Management`, `Player Database`, `Scouting & Academy`, `Training Centre`, `Live Match Centre`, `Fixtures & Standings`, `Analytics & Scorecards`, `Auction Room`, `Transfers & Contracts`, `Finance & Sponsors`, `Stadium & Facilities`, `Settings`, and `Save / Load Game`) is built as a complete, stateful interactive module connected to the central career store.

---

## 1. Overview & Core Concept

- **What It Does**: Places the user in the role of a professional Cricket Director & Head Coach inside a dark-navy televised broadcast and tactical operations control room. Users manage squad selection, tactical matchups, live ball-by-ball Hawk-Eye match simulations, live player auctions, training regimens, scouting pipelines, club finances, and stadium upgrades.
- **Target Audience / Persona**: Cricket strategy enthusiasts and sports management gamers looking for authentic player data, deep tactical control over bowling lengths/lines and fielding setups, and broadcast-grade visual telemetry.
- **Key Value**: Unites a verified real-cricketer database (Virat Kohli, Rohit Sharma, Jasprit Bumrah, Pat Cummins, Travis Head, Jos Buttler, Rashid Khan, Kane Williamson, Heinrich Klaasen, Babar Azam, Mitchell Starc, Nicholas Pooran, etc.) with a responsive simulation engine where every tactical instruction and auction bid directly mutates match probabilities, player fatigue, and franchise budgets.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Command Dashboard & Pre-Match Preparation**:
   - Inspect club KPIs (League Position, Reputation, Squad OVR, Wage Bill, Board Trust, Morale), study the **Squad Strength Radar** (Batting Depth, Pace Attack, Spin Attack, Fielding Cohesion, Bowling Variations), review **Key Performers** with verified career metrics, resolve **Management Decisions** (contract renewals, pitch curator requests, academy promotions), and launch directly into the **Next Match Hero Panel** or **Lineup Confirmation**.
2. **Squad Tactical Deployment (Playing XI & Role Assignment)**:
   - Filter roster by role (`All`, `Batsmen`, `Bowlers`, `All-Rounders`, `Wicketkeepers`, `Academy`), reorder the Playing XI batting lineup via drag-and-drop or quick-swap controls, assign Captain (`C`) and Wicketkeeper (`WK`) badges, validate competition rules (max 4 overseas players in Franchise mode, minimum 5 bowling options, valid keeper), and configure individual player match instructions in the right-hand inspector.
3. **Live Match Centre (Hawk-Eye Broadcast & Tactical Directives)**:
   - Control ball-by-ball simulation (`Next Ball`, `Simulate Over`, `Simulate Innings/Match`, playback speed, auto-pause on wicket/milestone).
   - Adjust **Batting Mindset** (`Defend`, `Rotate Strike`, `Balanced`, `Attack`, `Loft`), **Bowling Delivery** (`Yorker`, `Bouncer`, `Good Length`, `Short Ball`, `Slower Ball`, `Wide Line`, `Off-Stump`, `Leg-Stump`), and **Field Placement** (`Attacking`, `Balanced`, `Defensive`, `Death Overs`, or drag individual fielder tokens directly on the interactive SVG oval).
   - Watch live ball trajectories, pitch bounce maps, win probability curves, and ball-by-ball commentary accompanied by dynamic stadium floodlights and reactive crowd audio.
4. **Live Auction Room**:
   - Inspect the current player lot (verified career stats, role, base price, tactical attributes), place `Raise Bid` or `Aggressive Bid` actions against competing AI franchise war rooms operating with real purse and overseas slot constraints, or `Pass` / `Instant Hammer` while monitoring the upcoming player queue.
5. **Full Club Operations (10 Additional Modules)**:
   - Manage multi-season progression in **Career Hub**, search and compare every verified cricketer in **Player Database**, scout domestic/youth tournaments in **Scouting & Academy**, allocate weekly drills in **Training Centre**, inspect tournament tables in **Fixtures & Standings**, review Manhattan/Worm charts in **Analytics & Scorecards**, negotiate deals in **Transfers & Contracts**, select kit/title sponsors in **Finance & Sponsors**, upgrade floodlights/capacity/academies in **Stadium & Facilities**, and manage multi-slot persistence in **Save / Load Game** and **Settings**.

### Visual Identity & Theme

- **Aesthetic Direction**: Premium televised cricket broadcast graphics fused with a high-density tactical operations war room.
- **Color Palette & Surface Hierarchy**:
  - **Main Canvas (`#07111F`)**: Deep broadcast midnight navy (60% dominant viewport canvas).
  - **Secondary Surface (`#0B1728`)**: Persistent left navigation sidebar, top status header, and recessed telemetry wells.
  - **Card Surface (`#101F32`) & Elevated Surface (`#17283D`)**: Structured single-elevation data panels framed by crisp `1px solid #1F3552` borders (30% structural surfaces).
  - **Semantic & Broadcast Accents (10% intentional budget)**:
    - **Championship Gold (`#D8B15B`)**: Active navigation state, primary CTAs, captain/trophy badges, elite OVR highlights, and auction gavel animations.
    - **Turf Emerald (`#23B875`)**: Boundaries, positive NRR/form, high fitness, and win-probability surges.
    - **Hawk-Eye Cyan (`#38BDF8`)**: Ball pitch tracking, trajectory vectors, spin/swing telemetry, and analytical overlays.
    - **Stump Danger (`#E45B63`)**: Wickets, injuries, low morale, and budget warnings.
  - **Typography Hierarchy**:
    - **Display & Scoreboards (`Chivo`)**: Bold, athletic broadcast headers, match scorebugs, and team titles with `text-wrap: balance`.
    - **UI & Commentary (`Inter`)**: Crisp navigation labels, tactical descriptions, and ball-by-ball commentary prose.
    - **Telemetry & Statistics (`JetBrains Mono`)**: Strictly `tabular-nums` (`font-variant-numeric: tabular-nums`) for all scores, overs (`14.3`), strike rates, economies, run rates, and financial purses (`₹18.50 Cr` / `$2.4M`).
- **Component Styling & Spatial Rhythm**:
  - Cards use `8px` border radius with `1px solid #1F3552` borders; standard buttons use `4px` radius (`py-2 px-4`).
  - Data tables enforce consistent `36px–44px` compact row heights with right-aligned tabular numeric columns and unboxed metadata separated by middle dots (`·`).
  - Responsive 16-column desktop tactical grid (`1440px+`), 12-column adaptive layout (`1024px–1439px`), and touch-optimized collapsible drawer + persistent scorebug below `1024px`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Verified Real Cricketer Dataset & Transparent Game Rating Formula**:
  - *Chosen Approach*: Bundle a comprehensive, verified dataset of real international and franchise cricketers across 10 major cricketing nations and 10 premier T20 franchises, complete with real full names, dates of birth, batting/bowling styles, and verified career statistics. Game ratings (`OVR`, `Batting Power`, `Timing`, `Control`, `Variations`, `Fielding`) are explicitly badged as *Game Calculated Attributes* derived deterministically from real career averages, strike rates, and economy rates. For player portraits, use clean, rights-safe vector role silhouettes with national/franchise jersey colors and verified player initials/numbers so no AI-generated fictional faces are ever passed off as real cricketer photos.
  - *Why*: Strictly honors the zero-fake-player rule and portrait authenticity requirements while ensuring 100% offline/sandbox reliability.
- **Decision 2 — Physics-Informed Ball-by-Ball Match Engine**:
  - *Chosen Approach*: Calculate every delivery outcome from the interaction of Batter Attributes (Timing, Power vs Pace/Spin, Fatigue, Confidence), Bowler Attributes (Speed/Spin, Accuracy, Variation, Stamina), Pitch & Weather Modifiers (Grass, Dryness, Dew Factor, Overcast swing), and the user's active Tactical Directives (Batting Mindset, Bowling Line/Length, and actual SVG Fielder Coordinates).
  - *Why*: Ensures tactical controls genuinely influence shot angles, edge probabilities, dot-ball pressure, and boundary zones on the Hawk-Eye field map.
- **Decision 3 — Dual Storage Persistence (LocalStorage + IndexedDB)**:
  - *Chosen Approach*: Synchronize active career state, custom squads, auction results, match history, and audio preferences automatically to `localStorage` for instant boot recovery, backed by an `IndexedDB` multi-slot save manager (`Save Slot 1–5` + JSON export/import).
  - *Why*: Preserves existing browser data seamlessly across refreshes and allows multiple parallel careers (e.g., Franchise T20 vs International).

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        CRICKET APEX MANAGER — APPLICATION SHELL                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────────────┐  │
│  │ Persistent Left Nav  │  │ Global Broadcast Top Header                          │  │
│  │ (14 Modules + Mode)  │  │ (Date · Season · Team · Purse · Form · Audio Mixer)  │  │
│  └──────────┬───────────┘  └──────────────────────────┬───────────────────────────┘  │
└─────────────┼─────────────────────────────────────────┼──────────────────────────────┘
              │                                         │
              ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         CENTRAL GAME STATE & PERSISTENCE STORE                       │
│  • Verified Cricketer & Team DB (Season 2024 / 2025 / 2026 · Franchise & Intl)       │
│  • Career State (Fixtures, Standings, Finances, Sponsors, Stadium, Decisions, News)  │
│  • Dual Persistence Engine (LocalStorage Auto-Save + IndexedDB Multi-Slot Manager)   │
└──────┬──────────────────────┬─────────────────────────┬──────────────────────┬───────┘
       │                      │                         │                      │
       ▼                      ▼                         ▼                      ▼
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐    ┌────────────────┐
│  DASHBOARD   │     │ LIVE MATCH ENGINE│     │  AUCTION ENGINE  │    │ SQUAD & CLUB   │
│  • Next Hero │     │ • Hawk-Eye Field │     │ • 3-Col War Room │    │ • Playing XI   │
│  • Radar SVG │     │ • Draggable XI   │     │ • AI Franchise   │    │ • Drag Order   │
│  • Standings │     │ • Tactical Panel │     │   Bidding Logic  │    │ • Scouting/Acad│
│  • Decisions │     │ • Win Prob Model │     │ • Countdown/Gavel│    │ • Training/Fin │
└──────────────┘     └────────┬─────────┘     └─────────┬────────┘    └────────────────┘
                              │                         │
                              ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                    PROCEDURAL WEB AUDIO API & STADIUM SOUND ENGINE                   │
│  • Context Music Synthesizer (Menu Theme · Dashboard Ambient · Auction Tension)      │
│  • Dynamic Stadium Crowd Generator (Noise Filter + Event Roar Envelope + Chants)     │
│  • Tactical & Broadcast SFX (Bat Crack · Timber Wicket · Gavel Sold · UI Clicks)     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Player Record (`RealCricketer`)**: `id`, `fullName`, `shortName`, `nationality`, `dob`, `age`, `role` (`Batsman` | `Fast Bowler` | `Spin Bowler` | `All-Rounder` | `Wicketkeeper`), `battingStyle`, `bowlingStyle`, `jerseyNumber`, `franchiseTeams` (mapped by season `2024` | `2025` | `2026`), `internationalTeam`, `verifiedStats` (`matches`, `runs`, `battingAvg`, `strikeRate`, `hundreds`, `fifties`, `wickets`, `bowlingAvg`, `economy`, `bestBowling`), and `calculatedAttributes` (`ovr`, `battingPower`, `battingTiming`, `paceSkill`, `spinSkill`, `control`, `variations`, `fieldingReflexes`, `fitness`, `form`, `morale`, `basePriceCr`, `contractValueCr`).
- **Match State (`LiveMatchState`)**: `matchId`, `competition`, `venue`, `weather`, `pitchCondition`, `dewFactor`, `innings` (1 or 2), `score`, `wickets`, `ballsBowled`, `target`, `currentOverBalls`, `strikerId`, `nonStrikerId`, `bowlerId`, `partnershipRuns`, `partnershipBalls`, `battingMindset`, `bowlingLength`, `bowlingLine`, `fieldPreset`, `fielderCoordinates` (array of 9 movable `{id, role, x, y}` tokens), `lastBallTrajectory` (`{startX, startY, bounceX, bounceY, endX, endY, outcome}`), `winProbability` (calculated dynamically via resources-remaining & required-run-rate logistic formula), and `commentaryFeed`.
- **Auction State (`AuctionState`)**: `currentLotIndex`, `activePlayerId`, `currentBidCr`, `leadingTeamId`, `countdownSeconds`, `status` (`BIDDING` | `GOING_ONCE` | `GOING_TWICE` | `SOLD` | `UNSOLD`), `bidHistory`, `teamWarRooms` (each tracking `purseRemainingCr`, `squadSize`, `overseasCount`, `targetRoles`), and `upcomingQueue`.

### Interactive Component & State Mapping

- **Dashboard**: Clicking any Management Decision (`Approve Renewal`, `Prepare Green Top`, `Promote Prospect`) immediately updates club budget, pitch modifiers for the next fixture, or squad roster, and logs a verified press ticker item.
- **Live Match Centre**: Selecting a Batting Mindset, Bowling Length/Line, or dragging a fielder token on the Hawk-Eye SVG canvas immediately updates the tactical state for the next ball calculation. Playback controls (`Next Ball`, `Sim Over`, `Sim Match`, `1x/2x/4x Speed`, `Auto-Pause on Wicket/50`) drive the simulation loop and trigger real-time Web Audio bat cracks, crowd roars, and scoreboard animations.
- **Auction Room**: Clicking `Raise Bid (+₹0.25 Cr)` or `Aggressive Jump (+₹1.00 Cr)` places the user's franchise in the lead, resets the auction countdown timer, triggers AI rival war rooms to evaluate player OVR vs remaining purse/role need, and upon timer expiry triggers the SOLD presentation and transfers the player to the winning squad.
- **Squad & Club Modules**: Reordering the Playing XI, toggling Captain/WK badges, assigning training drills, signing free agents, accepting sponsor offers, or upgrading stadium facilities immediately mutates the central store and persists to LocalStorage/IndexedDB.
