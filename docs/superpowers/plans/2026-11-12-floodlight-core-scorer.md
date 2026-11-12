# Floodlight — Core Offline Scorer Implementation Plan (Plan 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a runnable Expo/iOS app that sets up a gully match, scores it ball-by-ball on a fully-tested pure engine, autosaves locally, and shows a live scorecard — all offline.

**Architecture:** The match is an ordered log of ball events; all state is a pure fold over that log (`reduce(events, config) → MatchState`), which makes undo/redo, editing, and replay trivial and correct. A pure TypeScript engine (no React, no I/O) owns all cricket rules and is built test-first. A Zustand store binds the engine to the UI and orchestrates SQLite autosave. All custom visuals are real `react-native-svg` vector geometry; all motion is Reanimated. UI "feel" is verified same-day on the owner's iPhone via Expo Go.

**Tech Stack:** Expo (latest SDK), TypeScript, expo-router, Zustand, expo-sqlite, react-native-svg, react-native-reanimated + gesture-handler + moti, expo-haptics, expo-linear-gradient, expo-blur, expo-font, lottie-react-native; Jest + @testing-library/react-native.

**Spec:** `docs/specs/2026-11-12-gully-cricket-scorer-design.md` (read it alongside this plan).

**Scope note:** This is Plan 1 of 5. Out of scope here (later plans): animated analysis charts/replay (Plan 2), match history search + career/H2H stats (Plan 2/3), Follow Live pro cricket (Plan 4), live code-sharing via Supabase (Plan 5). This plan delivers a complete, usable scorer on its own, and its UUID-keyed schema and event-log engine are designed so the later plans bolt on without rework.

## Global Constraints

- **Run target:** must run in **Expo Go** on iOS — use only libraries bundled in the Expo SDK. No custom native modules (no Skia, no view-shot) in this plan.
- **No HTML/CSS/`<div>`-as-shape:** every custom visual (cricket ball, over-orbs, any gauge) is `react-native-svg` vector geometry. (Spec anti-goal.)
- **Engine is pure:** `src/engine/**` imports nothing from `react`, `react-native`, or any I/O; deterministic and serializable. (Spec §6.)
- **Event log is the single source of truth:** derived stats are never stored as authoritative state; they are computed by selectors. (Spec §6.)
- **Every persisted row carries a UUID** generated at creation (`expo-crypto` `randomUUID`). (Spec §7, decided.)
- **TypeScript strict mode on**; no `any` in `src/engine/**`.
- **Default rule values (verbatim):** wide = +1, no-ball = +1, free-hit on no-ball = ON, last-man-stands = OFF, byes enabled = ON, overs-per-bowler cap = none. All overridable per match. (Spec §6/§8.)
- **Shared-player dismissal is per-innings** — out for one side does not carry to the other. (Spec §6, decided.)
- **Over = 6 legal deliveries;** wides and no-balls are not legal deliveries. (Spec §6.)
- **Language:** all user-facing strings go through the i18n table (EN default, Hinglish toggle) — no hardcoded display strings in components. (Spec §4.)

## Review Focus

Inputs the spec implies but that are easy to get wrong; each has a pinned test in the owning task:
1. **Wide/no-ball combined with a wicket or with runs run** (e.g. wide + 2 run-out; no-ball + 4 off bat on a free hit) → extras, bowler charge, legal-ball count, and dismissal validity must all be right. *(Task E2 + E3)*
2. **Over completes only after 6 legal balls** — an over containing wides/no-balls must demand more deliveries, and strike must rotate correctly at the true end of the over. *(Task E1/E2)*
3. **All-out vs overs-exhausted vs target-reached**, including **last-man-stands** (one batter continues) and **shared player** counting toward the batting side's wickets. *(Task E3/E4/E5)*
4. **Undo across an innings boundary / after a wicket** must restore the exact prior state (striker, bowler, free-hit flag, innings), because state is re-folded from the log. *(Task E6)*
5. **App killed mid-over** → on relaunch the exact in-progress match (down to striker on strike and balls left in the over) is resumed with no data loss. *(Task P1 + U2)*

---

## File Structure

```
app/                                   # expo-router screens
  _layout.tsx                          # root: providers, fonts, theme
  index.tsx                            # Home/Play
  match/setup.tsx                      # setup wizard host
  match/score.tsx                      # scoring screen
  match/scorecard.tsx                  # live scorecard
  matches.tsx                          # saved matches list
src/
  engine/
    types.ts                           # domain types (no logic)
    createMatch.ts                     # createMatch, startNextInnings
    applyDelivery.ts                   # applyDelivery (core append + numbering + strike)
    rules.ts                           # over/innings/all-out/chase predicates
    undo.ts                            # undo/redo/editBall, replayTo
    select.ts                          # derived selectors (cards, FoW, partnerships, rates)
    index.ts                           # public surface re-export
  store/
    matchStore.ts                      # Zustand store binding engine + autosave
  db/
    schema.ts                          # SQLite DDL + migration
    matchRepo.ts                       # save/load/list matches (serialized event log)
  theme/
    tokens.ts                          # Floodlight color/space/radius/typography tokens
    ThemeProvider.tsx                  # theme context + light/dark
    useTheme.ts
  i18n/
    strings.ts                         # EN + Hinglish tables + t()
  components/
    Text.tsx  TapButton.tsx  Surface.tsx  Screen.tsx
    CricketBall.tsx                    # SVG ball w/ seam
    OverOrbs.tsx                       # SVG six-orb over track
    Scoreboard.tsx                     # LED-style animated score
  features/
    setup/                             # wizard steps + squad editor
    scoring/                           # ball pad, wicket sheet, extras sheet
    scorecard/                         # batting/bowling/extras tables
tests/
  engine/*.test.ts
  db/*.test.ts
```

---

### Task E1: Engine core — types, createMatch, legal-run deliveries, strike & over numbering

**Files:**
- Create: `src/engine/types.ts`, `src/engine/createMatch.ts`, `src/engine/applyDelivery.ts`, `src/engine/index.ts`
- Test: `tests/engine/core.test.ts`

**Interfaces:**
- Consumes: nothing (first engine task).
- Produces (later tasks and the store rely on these exact names/types):
  - Types in `types.ts`: `ExtraType = 'wide'|'noball'|'bye'|'legbye'`; `WicketType = 'bowled'|'caught'|'lbw'|'runout'|'stumped'|'hitwicket'|'retired'`; `Player {id:string;name:string}`; `MatchRules {oversPerInnings:number; wideRuns:number; noBallRuns:number; freeHitOnNoBall:boolean; lastManStands:boolean; byesEnabled:boolean; maxOversPerBowler?:number}`; `SquadPlayer {playerId:string; isShared:boolean}`; `TeamConfig {id:string;name:string;color:string;players:SquadPlayer[]}`; `MatchConfig {id:string; teamA:TeamConfig; teamB:TeamConfig; players:Record<string,Player>; rules:MatchRules; battingFirst:'A'|'B'}`; `DeliveryInput {strikerId:string; nonStrikerId:string; bowlerId:string; runsBat:number; extra?:{type:ExtraType;runs:number}; wicket?:{type:WicketType; outPlayerId:string; fielderId?:string}}`; `BallRecord = DeliveryInput & {id:string; inningsIndex:0|1; legal:boolean; freeHit:boolean; overNumber:number; ballInOver:number}`; `MatchState {config:MatchConfig; events:BallRecord[]; redo:BallRecord[]}`.
  - `createMatch(config: MatchConfig): MatchState`
  - `applyDelivery(state: MatchState, input: DeliveryInput): MatchState` — appends a `BallRecord` with computed `legal`, `overNumber`, `ballInOver`, `inningsIndex` (current), `freeHit`; clears `redo`.
  - Selectors used by tests this task: `legalBallsInCurrentOver(state): number`, `onStrikeId(state): string`.

- [ ] **Step 1: Write failing tests** in `tests/engine/core.test.ts`:
  - `createMatch` returns `{events:[], redo:[]}` with config intact.
  - A single `runsBat:1` delivery makes `events.length===1`, `legal===true`, `overNumber===0`, `ballInOver===1`, and **strike rotates** (`onStrikeId` is the previous non-striker).
  - `runsBat:2` does **not** rotate strike; `runsBat:0` does not.
  - Six legal deliveries → `legalBallsInCurrentOver` goes 1..6 then resets to 0 on the 7th ball (new over, `overNumber===1`), and **strike rotates at end of over** (net effect of a 6-dot over: non-striker is now on strike).
  - `runsBat` of 4 and 6 are accepted and counted.
- [ ] **Step 2: Run tests, verify they fail** — `npx jest tests/engine/core.test.ts` → FAIL (functions undefined).
- [ ] **Step 3: Implement** `types.ts`, `createMatch`, `applyDelivery` (+ the two selectors in `index.ts` or `select.ts` stub). Strike rule: rotate when `runsBat` is odd; additionally rotate at over end (after assigning the 6th legal ball). Over numbering from legal-ball count within the current innings.
- [ ] **Step 4: Run tests, verify PASS.**
- [ ] **Step 5: Commit** — `feat(engine): match core with legal deliveries, strike rotation, over numbering`.

### Task E2: Extras — wide, no-ball (+free hit), byes & leg-byes

**Files:** Modify `src/engine/applyDelivery.ts`, `src/engine/rules.ts` (create); Test: `tests/engine/extras.test.ts`
**Interfaces:**
- Consumes: E1 types + `applyDelivery`.
- Produces: `isFreeHit(state): boolean`; extras handling inside `applyDelivery`; `teamExtras(state, inningsIndex): {wides:number;noBalls:number;byes:number;legByes:number;total:number}` in `select.ts`.

- [ ] **Step 1: Write failing tests:**
  - **Wide:** `extra:{type:'wide',runs:0}` adds `rules.wideRuns` (1) to team total, is **not legal** (`legalBallsInCurrentOver` unchanged), charges the bowler; extra runs run on a wide add on (`runs:2` → 1+2=3). Strike rotates only if the *ran* runs are odd (wide of 1+1 ran → rotate).
  - **No-ball:** adds `rules.noBallRuns` (1), not legal, charges bowler; `runsBat` off a no-ball credits the striker; sets free-hit for the next legal ball (`isFreeHit` true after a no-ball, false otherwise and cleared after the next legal ball).
  - **Free hit:** on a free-hit delivery, a `wicket` of type other than `runout`/`stumped` is rejected/ignored (batter not out); run-out still allowed.
  - **Bye / leg-bye:** legal ball, runs go to byes/legByes extras, **not** to striker and **not** charged to bowler; strike rotates on odd byes.
  - `teamExtras` reconciles: sum of extra components equals total.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement extras branch in `applyDelivery`; `freeHit` computed from prior ball; legal-ball flag false for wide/no-ball, true for byes/leg-byes; add `isFreeHit`, `teamExtras`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `feat(engine): wides, no-balls with free hit, byes and leg-byes`.

### Task E3: Wickets, fall-of-wickets, new-batter flow, all-out & last-man-stands

**Files:** Modify `applyDelivery.ts`, `rules.ts`, `select.ts`; Test: `tests/engine/wickets.test.ts`
**Interfaces:**
- Consumes: E1/E2.
- Produces: `wicketsDown(state, inningsIndex): number`; `isInningsComplete(state): boolean`; `fallOfWickets(state, inningsIndex): {wicketNo:number; score:number; over:string; outPlayerId:string}[]`; `batsmenAtCrease(state): {strikerId:string; nonStrikerId:string}`; `dismissedIds(state, inningsIndex): Set<string>`.

- [ ] **Step 1: Write failing tests:**
  - Each `WicketType` records a dismissal; `runout` and `stumped` can co-occur with runs/extras; `runout` credits **no** bowler wicket, others do.
  - After a wicket, the **out batter** is replaced by the striker/non-striker supplied on the *next* delivery; crease tracking (`batsmenAtCrease`) is correct.
  - `fallOfWickets` entries capture running score + over string (e.g. `"3.4"`).
  - **All-out:** innings complete when `wicketsDown === battingSquadSize − 1` (default LMS off). With **last-man-stands ON**, innings continues to `wicketsDown === battingSquadSize` (last batter bats alone); `isInningsComplete` reflects the rule.
  - Innings also complete when legal balls === `oversPerInnings*6`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement wicket handling, FoW, crease tracking, all-out predicate (reads `rules.lastManStands` and batting squad size incl. shared player). Batting squad size derives from `config` for the side batting this innings.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `feat(engine): wickets, fall of wickets, all-out and last-man-stands`.

### Task E4: Innings transition, chase target & result, Super Over hook

**Files:** Modify `createMatch.ts` (add `startNextInnings`), `rules.ts`, `select.ts`; Test: `tests/engine/chase.test.ts`
**Interfaces:**
- Consumes: E1–E3.
- Produces: `startNextInnings(state): MatchState` (sets subsequent deliveries to `inningsIndex:1`); `currentInningsIndex(state):0|1`; `target(state): number|null`; `chaseStatus(state): {runsNeeded:number; ballsRemaining:number; requiredRunRate:number} | null`; `matchResult(state): {decided:boolean; winner?:'A'|'B'; tie?:boolean; margin?:string}`; `needsSuperOver(state): boolean`.

- [ ] **Step 1: Write failing tests:**
  - After innings 0 completes, `startNextInnings` makes new deliveries `inningsIndex:1`; `target === innings0Total + 1`.
  - `chaseStatus` computes `runsNeeded`, `ballsRemaining`, `requiredRunRate` correctly mid-chase.
  - Chase reached (score ≥ target) → `matchResult.decided` with winner = chasing side, margin "by N wickets".
  - Innings-1 overs/all-out short of target → winner = first side, margin "by N runs".
  - Scores level at end → `tie:true` and `needsSuperOver` true.
- [ ] **Step 2:** Run → FAIL. [ ] **Step 3:** Implement. [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(engine): second innings chase, result resolution, super-over flag`.

### Task E5: Shared ("union") player attribution & custom rule values

**Files:** Modify `select.ts`, `applyDelivery.ts`; Test: `tests/engine/shared-and-rules.test.ts`
**Interfaces:**
- Consumes: E1–E4.
- Produces: no new public functions; guarantees that a `playerId` marked `isShared` in both squads is attributed to the batting/bowling side of the current innings, and that `dismissedIds` is tracked **per innings**.

- [ ] **Step 1: Write failing tests:**
  - A shared player batting in innings 0 who gets out is in `dismissedIds(0)` but **not** `dismissedIds(1)`; he can bat (and score) again in innings 1.
  - A shared player bowling is charged to the side he's bowling for in the current innings only.
  - `rules.wideRuns:2` / `noBallRuns:2` change extra totals accordingly.
  - `maxOversPerBowler` is exposed for the UI to enforce (selector `bowlerOversBowled(state, bowlerId, inningsIndex)`); engine does not hard-block but provides the count.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(engine): shared-player per-innings attribution and custom rule values`.

### Task E6: Undo / redo / edit-ball / replay-to

**Files:** Create `src/engine/undo.ts`; Test: `tests/engine/undo.test.ts`
**Interfaces:**
- Consumes: E1–E5.
- Produces: `undo(state): MatchState`; `redo(state): MatchState`; `editBall(state, ballId: string, input: DeliveryInput): MatchState` (replaces that record and re-folds downstream numbering/flags); `replayTo(state, ballIndex: number): MatchState` (pure view for Plan 2).

- [ ] **Step 1: Write failing tests:**
  - `undo` after a normal ball restores prior `onStrikeId`, over/ball count, and pushes onto `redo`; `redo` re-applies identically.
  - `undo` across an **over boundary** and across a **wicket** restores exact crease + free-hit state (re-fold, not patch).
  - `undo` of the first ball of innings 1 returns to innings 0 complete state.
  - `editBall` changing a `1` to a `wide` re-numbers subsequent legal balls (over boundaries shift correctly); all downstream selectors recompute.
  - `replayTo(k)` equals folding the first `k` events.
- [ ] **Step 2:** FAIL → **Step 3:** implement (undo = pop last event, re-fold derived; editBall = splice + re-fold) → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(engine): undo, redo, edit-ball and replay via log re-fold`.

### Task E7: Derived stats — batting & bowling cards, partnerships, manhattan, worm, rates

**Files:** Modify `src/engine/select.ts`; Test: `tests/engine/stats.test.ts`
**Interfaces:**
- Consumes: E1–E6.
- Produces: `battingCard(state, inningsIndex): {playerId;runs;balls;fours;sixes;strikeRate;out:boolean;dismissal?:string}[]`; `bowlingCard(state, inningsIndex): {playerId;overs:string;maidens;runs;wickets;economy;dots;wides;noBalls}[]`; `partnerships(state, inningsIndex): {forWicket:number;runs:number;balls:number;playerIds:[string,string]}[]`; `manhattan(state, inningsIndex): {over:number;runs:number;wickets:number}[]`; `worm(state, inningsIndex): {ball:number;runs:number}[]`; `runRate(state, inningsIndex): number`.

- [ ] **Step 1: Write failing tests** with a fixed scripted innings (a known sequence of deliveries) asserting exact values for each selector, including: SR = runs/balls*100 (balls exclude wides/no-balls for the striker; a no-ball faced counts as a ball faced per standard — assert chosen convention explicitly: **balls faced excludes wides, includes no-balls**), bowler economy = runs/overs with runs excluding byes/leg-byes, a **maiden** over detection, dot-ball count, partnership attribution across a wicket, manhattan per-over totals summing to the innings total, worm monotonic non-decreasing ending at innings total.
- [ ] **Step 2:** FAIL → **Step 3:** implement selectors → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(engine): batting/bowling cards, partnerships, manhattan, worm, rates`.

### Task S0: Expo app scaffold, TypeScript, routing, Jest

**Files:** Create Expo project files (`app/_layout.tsx`, `app/index.tsx`, `package.json`, `tsconfig.json`, `babel.config.js`, `jest.config.js`, `app.json`). This task may precede or run parallel to the engine tasks (engine needs only the TS/Jest toolchain).
**Interfaces:** Produces a running `npx expo start` app and a working `npx jest`.

- [ ] **Step 1:** Scaffold with `npx create-expo-app@latest` (TypeScript, expo-router). Add deps from Tech Stack. Configure Reanimated babel plugin, `jest-expo` preset + testing-library, strict TS.
- [ ] **Step 2:** Add a placeholder passing test `tests/smoke.test.ts` and a Home screen rendering the app name.
- [ ] **Step 3: Verify** — `npx jest` PASS; `npx expo start` boots; **owner scans in Expo Go and confirms the Home screen loads on their iPhone.**
- [ ] **Step 4: Commit** — `chore: scaffold Expo + TypeScript + router + jest`.

### Task D1: Floodlight design tokens, theme provider, fonts, i18n

**Files:** Create `src/theme/tokens.ts`, `ThemeProvider.tsx`, `useTheme.ts`, `src/i18n/strings.ts`; Test: `tests/theme/tokens.test.ts`
**Interfaces:** Produces `useTheme()` → tokens (colors: `pitch`, `seamGreen`, `leatherRed`, `gold`, surfaces, text; spacing scale; radii; typography with **tabular numerals**), `ThemeProvider` (dark default + day theme), `t(key)` i18n with EN + Hinglish.

- [ ] **Step 1:** Write a small test asserting token shape (required keys present, both themes defined) and `t()` falls back to EN for missing Hinglish keys.
- [ ] **Step 2:** FAIL → **Step 3:** implement tokens per Spec §11 (exact palette finalized here as a builder call within the stated style), load display + tabular-numeral + body fonts via `expo-font`, wire provider into `app/_layout.tsx`.
- [ ] **Step 4:** test PASS; **owner confirms the colour/typography feel on device.**
- [ ] **Step 5: Commit** — `feat(ui): Floodlight theme tokens, fonts, i18n scaffold`.

### Task D2: Primitive components + SVG cricket ball + over-orbs + Scoreboard

**Files:** Create `src/components/{Text,TapButton,Surface,Screen,CricketBall,OverOrbs,Scoreboard}.tsx`; Test: `tests/components/render.test.tsx`
**Interfaces:** Produces `TapButton` (haptic + Reanimated press), `CricketBall` (SVG circle + seam path, `size`/`color` props), `OverOrbs` (`balls: BallGlyph[]` → six SVG orbs that fill/colour by outcome), `Scoreboard` (`runs`,`wickets`,`overs` → animated rolling tabular numerals).

- [ ] **Step 1:** Render tests: each component mounts without crashing; `OverOrbs` renders exactly 6 orb nodes; `CricketBall` renders an `<Svg>` (not a styled `View`); `Scoreboard` shows provided numbers.
- [ ] **Step 2:** FAIL → **Step 3:** implement with `react-native-svg` (ball seam as two arc paths; orbs as `<Circle>` with outcome fills) and Reanimated (press scale, number roll). **No View-as-shape.**
- [ ] **Step 4:** tests PASS; **owner confirms the ball, orbs and scoreboard look/animate right on device.**
- [ ] **Step 5: Commit** — `feat(ui): primitives, SVG cricket ball, over-orbs, animated scoreboard`.

### Task P1: SQLite persistence — schema, repo, serialize match, autosave/resume

**Files:** Create `src/db/schema.ts`, `src/db/matchRepo.ts`; Test: `tests/db/matchRepo.test.ts`
**Interfaces:** Produces `initDb()`; `saveMatch(state: MatchState): Promise<void>` (upsert by `config.id`, stores serialized event log + status + timestamps, UUID keys); `loadMatch(id): Promise<MatchState|null>`; `listMatches(): Promise<MatchSummary[]>`; `getResumable(): Promise<MatchState|null>`.

- [ ] **Step 1:** Write tests (using `expo-sqlite`'s in-memory/test DB or a mock) asserting: save then load round-trips a `MatchState` exactly (events preserved, re-fold reproduces identical derived values); `listMatches` returns summaries; a match with status `in_progress` is returned by `getResumable`; re-saving the same `config.id` updates, not duplicates.
- [ ] **Step 2:** FAIL → **Step 3:** implement DDL (tables per Spec §7, all PKs UUID), serialization (store `events` JSON), repo functions.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(db): sqlite schema and match repository with serialized event log`.

### Task Z1: Zustand match store binding engine + autosave

**Files:** Create `src/store/matchStore.ts`; Test: `tests/store/matchStore.test.ts`
**Interfaces:** Produces a store with `state: MatchState|null` and actions `newMatch(config)`, `delivery(input)`, `undo()`, `redo()`, `editBall(id,input)`, `startNextInnings()`, `resume()`, plus selector hooks. Each mutating action calls the engine then **debounced `saveMatch`** (autosave every ball).

- [ ] **Step 1:** Write tests: `delivery` updates store via `applyDelivery`; `undo` reverts; actions trigger `saveMatch` (spy); `resume` loads from `getResumable`.
- [ ] **Step 2:** FAIL → **Step 3:** implement (engine is pure, so store just wires it + persistence; mock repo in test).
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(store): zustand match store with engine binding and autosave`.

### Task U1: Match setup wizard

**Files:** Create `app/match/setup.tsx`, `src/features/setup/*`; Test: `tests/features/setup.test.tsx`
**Interfaces:** Consumes `matchStore.newMatch`, engine types. Produces a wizard: Team A (name, colour, players), Team B, mark shared player(s), squad size, overs, rule toggles (free-hit, LMS, overs/bowler cap, wide/no-ball runs, byes), toss flip, choose bat-first → builds `MatchConfig` (UUIDs via `expo-crypto`) and calls `newMatch`, routes to scoring.

- [ ] **Step 1:** Write tests: a valid setup produces a `MatchConfig` with the expected teams/rules/battingFirst and navigates; validation blocks empty team names and duplicate player names; shared player appears in both squads.
- [ ] **Step 2:** FAIL → **Step 3:** implement screens/components; animated toss flip uses `CricketBall` + Reanimated.
- [ ] **Step 4:** tests PASS; **owner runs the wizard on device and confirms flow/feel.**
- [ ] **Step 5: Commit** — `feat(setup): match setup wizard producing MatchConfig`.

### Task U2: Scoring screen — scoreboard, orbs, ball pad, extras/wicket sheets, undo/redo

**Files:** Create `app/match/score.tsx`, `src/features/scoring/*`; Test: `tests/features/scoring.test.tsx`
**Interfaces:** Consumes `matchStore` + engine selectors + D2 components. Produces the core scoring UI: `Scoreboard` (live), batsmen + bowler strip, `OverOrbs` for the current over, run buttons 0–6, secondary row (Wide / No-ball / Bye / Leg-bye / Wicket) with modifier combining, a **wicket sheet** (type + out batter + fielder + new batter), an **extras sheet**, **undo/redo**, and an **innings-break / match-result** state. Every tap: `expo-haptics` + Reanimated feedback + optimistic update.

- [ ] **Step 1:** Write tests driving the store: tapping `4` calls `delivery({runsBat:4,...})` and the displayed total/orbs update; `Wide` then `2` sends a wide with 2 ran; opening the wicket sheet and confirming a `bowled` records the wicket and prompts the new batter; `undo` reverts the last ball in the UI; reaching innings end shows the break screen; reaching the target shows the result.
- [ ] **Step 2:** FAIL → **Step 3:** implement (free-hit indicator from `isFreeHit`; enforce `maxOversPerBowler` using `bowlerOversBowled`; disallow illegal bowler choices at over start).
- [ ] **Step 4:** tests PASS; **owner scores a full mock over on device and confirms tap ergonomics, haptics, 60fps, and that force-closing mid-over then reopening resumes exactly (Review Focus #5).**
- [ ] **Step 5: Commit** — `feat(scoring): ball-by-ball scoring screen with extras, wickets, undo/redo`.

### Task U3: Live scorecard screen

**Files:** Create `app/match/scorecard.tsx`, `src/features/scorecard/*`; Test: `tests/features/scorecard.test.tsx`
**Interfaces:** Consumes engine selectors (`battingCard`, `bowlingCard`, `teamExtras`, `fallOfWickets`, `partnerships`, `runRate`, `chaseStatus`, `matchResult`). Produces an innings-switchable scorecard: batting table (R,B,4s,6s,SR,dismissal), bowling table (O,M,R,W,Econ + dots/wd/nb), extras line, fall-of-wickets, partnerships, and the chase/result header. (Animated charts are Plan 2 — leave a placeholder section.)

- [ ] **Step 1:** Write tests: given a store with a scripted innings, the batting/bowling tables render the selector values; innings switch toggles data; chase header shows "need N off M" in innings 1.
- [ ] **Step 2:** FAIL → **Step 3:** implement tables with tabular numerals; reachable from scoring screen and matches list.
- [ ] **Step 4:** tests PASS; **owner confirms readability on device.**
- [ ] **Step 5: Commit** — `feat(scorecard): live batting/bowling/extras/FoW/partnerships scorecard`.

### Task U4: Home + saved matches list + resume

**Files:** Modify `app/index.tsx`; Create `app/matches.tsx`; Test: `tests/features/home.test.tsx`
**Interfaces:** Consumes `matchStore.resume`, `listMatches`, `loadMatch`. Produces: Home with "New Match", "Resume" (when a resumable match exists), and "Matches"; the Matches list opens any saved match's scorecard offline.

- [ ] **Step 1:** Write tests: Home shows Resume only when `getResumable` returns a match; tapping a saved match loads its scorecard; New Match routes to setup.
- [ ] **Step 2:** FAIL → **Step 3:** implement; crafted empty state for no matches.
- [ ] **Step 4:** tests PASS; **owner: full end-to-end on device — set up a match, score it to a result, kill the app mid-match and resume, reopen it later from the list.**
- [ ] **Step 5: Commit** — `feat(home): home, resume, and offline saved-matches list`.

---

## Definition of Done (Plan 1)

All engine tests green; a full match can be set up, scored to a decided result (incl. extras, wickets, free hits, shared player, last-man-stands, chase), autosaved, resumed after force-close, and revisited from the saved list — verified on the owner's iPhone via Expo Go. Charts/replay, history search, career stats, Follow Live, and live-sharing follow in Plans 2–5.
