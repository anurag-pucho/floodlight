# Gully Cricket Scorer — Design Document

**Working title:** *Floodlight* — a street-cricket scorer with a broadcast soul.
**Date:** 2026-11-12
**Author:** Design captured from brainstorming with the product owner (chintan@pucho.ai).
**Status:** Awaiting approval (nothing is built until this document is approved).

---

## 1. Intent & Why

People scoring casual / gully / tape-ball matches today use a paper scorebook or a phone notes app. Both are clumsy: strike rotation is error-prone, nobody can compute economy or a run-worm by hand, mistakes can't be undone cleanly, and the result is a scrap of paper nobody keeps. Meanwhile, the big cricket apps are built for pro matches, bloated with ads, and can't model the realities of gully cricket (odd squad sizes, a player shared across both teams, last-man-stands, custom rules).

**Floodlight** is a native iOS app that makes scoring a street match feel like running a broadcast: tap through each ball, watch a beautiful live scoreboard tick, and walk away with a permanent, shareable, deeply-analysed scorecard. It *also* lets users follow real professional matches live, so it's useful even on days they aren't playing.

The emotional target: it should feel **premium, tactile, and alive** — never a generic dark-mode dashboard, never anything that looks template-generated or cliché.

## 2. Goals / Non-Goals / Anti-Goals

**Goals**
- Score a full gully match ball-by-ball, offline, faster and more reliably than paper.
- Model gully realities: any squad size, a shared/"union" player, custom rules, last-man-stands.
- Produce max-detail analysis (the kind a TV broadcast shows) from the scored data.
- Keep every match forever, revisitable offline, with cross-match career stats.
- Let users follow real live pro matches in the same app.
- Look and feel genuinely out-of-the-box — a distinctive identity, real motion, real native/vector graphics.

**Non-Goals**
- Not a social network; no accounts required to score (accounts only enter if/when live-sharing demands it).
- Not a betting/fantasy app.
- Not trying to be a certified official scorer (no DLS/Duckworth-Lewis in v1).

**Anti-Goals (these would make it a failure even if it "works")**
- Looking like an AI-generated template: default blues, generic card grids, emoji-as-icons, lifeless layouts.
- Fake-native UI: HTML/CSS/`<div>` shapes pretending to be a ball. Every custom visual must be real native/vector geometry.
- A scoring flow that loses data on a crash, or can't undo a misclick.
- Charts and numbers that jitter, lag, or feel cheap.

## 3. Users & Key Scenarios

- **The Scorer** (primary): one friend who runs the match on their phone, standing at the edge of the pitch, often one-handed, sometimes in sunlight. Needs big tap targets, instant feedback, zero ambiguity, undo.
- **The Spectator**: a friend who wants to watch the score without being handed the scorer's phone → *Follow Live (sharing)*, later phase.
- **The Fan**: anyone wanting to follow a real pro match → *Follow Live (pro cricket)*.

**Signature scenario:** It's a weekend tape-ball match, 8 a side, one guy (Raju) is short so he bats for both teams. The scorer sets up both squads in under a minute, marks Raju as shared, sets 12 overs, flips the toss, and starts tapping. Boundaries fire a haptic thud and a burst of colour; the over-orbs fill one by one; at the innings break the chase screen says "Need 94 off 72, 7.83 rpo." Afterwards everyone passes around a gorgeous scorecard, and it's saved forever.

## 4. Platform & Technical Decisions *(my calls, stated plainly)*

- **Framework:** React Native via **Expo** (latest SDK), **TypeScript** throughout.
- **Run target (important, honest constraint):** Default is **Expo Go** — the free launcher app from the App Store — so the owner (on Windows, no Mac, no Apple Developer account) can run it on their real iPhone *today at zero cost*. This constrains us to libraries bundled in Expo Go. That set is still rich enough for everything "max-level" below.
  - **Upgrade path (documented, not required):** a small number of top-tier enhancements — Skia-accelerated charts, pixel-perfect view-to-image share cards — need a custom **EAS dev build**, which on iOS requires either a Mac or a paid Apple Developer account ($99/yr). The app is architected so these are drop-in upgrades, not rewrites. Until then, their Expo Go-compatible equivalents (SVG charts, text/share-sheet export) ship and look great.
- **Navigation:** `expo-router` (file-based).
- **State:** `zustand` for the live match engine state; selectors keep re-renders surgical.
- **Persistence / offline:** `expo-sqlite` as the system of record for matches (enables cross-match career/H2H queries), with a typed data-access layer; `@react-native-async-storage/async-storage` for light prefs. **Autosave** the in-progress match on every ball so a crash/close never loses data.
- **Graphics (all custom visuals):** `react-native-svg` — the cricket ball + seam, the six over-orbs, manhattan/worm charts, gauges, wagon wheel, milestone bursts are all **real vector geometry**, never styled boxes. (Skia is the optional dev-build upgrade for the heaviest charts.)
- **Animation:** `react-native-reanimated` (v3) + `react-native-gesture-handler` + `moti`, plus `lottie-react-native` for crafted celebration animations (all Expo Go-compatible). Target: 60fps, physics-based springs, animated number rolls, shared-element-style transitions.
- **Polish:** `expo-linear-gradient`, `expo-blur` (glass surfaces), `expo-haptics` (tactile feedback), `expo-av` (optional sound FX, user-toggleable).
- **Real-cricket data:** pluggable provider interface; default implementation targets a **free-tier cricket API** (e.g. cricketdata.org / CricAPI) requiring a user-supplied free key, with graceful degradation when an endpoint (e.g. live commentary) isn't on the free tier. Exact provider confirmed during build after live endpoint testing.
- **Live sharing backend (last phase):** **Supabase** (Postgres + Realtime) — scorer publishes ball events to a short share code; viewers subscribe read-only.
- **Testing:** `jest` + `@testing-library/react-native`; the scoring engine is pure TypeScript with exhaustive unit tests (TDD).
- **i18n:** `i18n-js` + `expo-localization`; ship **English with a Hinglish (Latin-script) toggle** (e.g. "Chauka", "Out", "Chakka") — natural for a gully crowd, no extra font needed. *(Decided with owner 2026-11-12; Devanagari deferred.)*

## 5. Information Architecture (screens)

Tab bar (custom, animated — not the default): **Play** · **Matches** · **Follow Live** · **Stats** · **Settings**

- **Play (Home):** resume in-progress match (if any), "New Match", quick-start with a saved team.
- **New Match setup (wizard):** Team A (name, colour, players), Team B, mark shared player(s), squad size, overs, rule toggles, toss & bat-first.
- **Scoring screen (the core):** live scoreboard, the two batsmen + bowler, current-over orb track, the ball-input pad, undo/redo, menu (end over, retire, swap, edit).
- **Scorecard / Analysis:** innings switcher; tabs — Summary, Batting, Bowling, Fall of Wickets, Partnerships, Charts (manhattan/worm/run-rate), Extras, Commentary, Replay scrubber.
- **Matches (history):** all saved matches, searchable/filterable, offline; open any to its full scorecard.
- **Stats (career):** aggregates across all saved matches — batting/bowling leaderboards, head-to-head, bests, saved teams/players.
- **Follow Live (pro):** live/upcoming/recent real matches, a match's live scorecard + commentary + stats, follow favourites with local match-start reminders.
- **Follow Live (share) [last phase]:** "Watch a match" → enter 6-char code → read-only live scorecard.
- **Settings:** theme (Floodlight dark default + a bright day theme), sound/haptics, language, API key, data export, about.

## 6. Scoring Engine — Rules Specification *(the spec the TDD tests encode)*

The engine is a **pure, UI-independent TypeScript module**: `(state, event) → newState`. Deterministic, serializable, fully replayable (the match *is* the ordered list of ball events; everything else is derived). This is what makes undo/redo and the replay scrubber trivial and correct.

**Delivery outcomes a single ball can record**
- Runs off the bat: 0,1,2,3,4,5,6 (and rare 5s/overthrows as "runs + extras").
- **Wide:** +1 (configurable) to team & bowler; **not** a legal ball; any runs run while wide add on; can combine with a wicket (run-out/stumping).
- **No-ball:** +1 (configurable) to team & bowler; **not** a legal ball; runs off bat credited to striker; triggers **free hit** if that rule is on (next legal ball: only run-out dismissals count).
- **Bye / Leg-bye:** legal ball; runs to team Extras (byes vs leg-byes tracked separately), **not** to striker, **not** charged to bowler's runs.
- **Dot ball:** tracked (for economy/pressure stats).

**Wicket types:** Bowled, Caught, LBW, Run-out (specify which batsman; runs completed before the run-out still count), Stumped, Hit-wicket, (optional) Retired-out vs Retired-hurt. Each records bowler credit where applicable (run-out → no bowler credit), the new batsman, and the fall-of-wicket entry (score, over, partnership).

**Strike & over management**
- Odd runs off the bat (or odd total completed on byes/leg-byes) rotate strike.
- End of a completed over rotates strike; new bowler required; a bowler can't bowl consecutive overs; optional overs-per-bowler cap enforced.
- Over completes after 6 **legal** deliveries (wides/no-balls don't count down the six).

**Innings end conditions**
- Overs exhausted, OR all out (wickets = (batting side size − 1), adjusted for shared player & last-man-stands rule), OR (2nd innings) target reached.
- **Last-man-stands** rule: when 1 batsman remains he may continue batting alone (configurable), altering the all-out condition.

**Second innings / chase**
- Target = first-innings total + 1; live required runs, balls remaining, required run rate, projected score; win/tie/loss resolution; **Super Over** path on a tie.

**Shared ("union") player**
- One `Player` identity; appears in both squads' lineups. All batting/bowling/fielding events attribute to the side he's currently representing. Career stats aggregate across both.
- **Dismissal is per-innings** *(decided with owner)*: being dismissed while batting for Team A does **not** carry over — he is available and "not out" when batting for Team B. He counts as a normal member of whichever side is batting; that side's all-out condition is unchanged ((squad − 1) wickets, or last-man-stands if enabled).

**Derived views (computed, never stored as source of truth):** batsman card (R, B, 4s, 6s, SR, dismissal), bowler card (O, M, R, W, Econ, dots, wd, nb), team total & extras breakdown, FoW, partnerships, per-over runs (manhattan), cumulative run rate (worm), run rate / required rate.

## 7. Data Model (SQLite, sketch)

`teams`, `players`, `team_players` (incl. `is_shared`), `matches` (overs, rules JSON, toss, status, timestamps), `innings`, `balls` (the event log: over, ball-in-over, legal flag, striker, non-striker, bowler, runs_bat, extra_type, extra_runs, wicket_type, out_player, fielder, free_hit flag, commentary text), plus derived snapshots cached for fast history open. Career stats are SQL aggregates over `balls`/`innings`. Everything local; export to JSON/CSV.
- **Every row carries a globally-unique UUID from day one** *(decided)* so Phase-8 live-sharing can publish/sync events with no schema retrofit — cheap now, costly later.

## 8. Feature Specifications

- **New-match wizard:** fast multi-step; validates squad sizes, prevents duplicate names, shared-player picker, colour pick per team, rule toggles (free-hit, last-man-stands, overs/bowler cap, wide/no-ball run values, byes on/off), toss flip animation, choose bat/bowl.
- **Ball-input pad:** primary run buttons (0–6) with a big tactile feel; secondary row for Wide / No-ball / Bye / Leg-bye / Wicket; modifiers combine (e.g. No-ball + 4). Every tap: haptic + micro-animation + optimistic scoreboard update. Long-press for overthrows/odd runs.
- **Undo / Redo / Edit:** full stack; edit any prior ball → engine recomputes everything downstream deterministically.
- **Milestone celebrations:** fifty, century, hat-trick, maiden over, team 100/150, last-ball finish → crafted Lottie + Reanimated burst + distinct haptic; tasteful, skippable, never blocking.
- **Analysis suite:** all cards + charts in §6; charts are animated SVG (manhattan bars grow, worm draws on, both innings overlaid for comparison).
- **Replay scrubber:** a gesture-driven timeline that re-derives the match state at any ball and animates the scoreboard through it.
- **Player-of-the-Match:** auto-suggested via a transparent impact score (runs, SR vs match, wickets, economy, catches), overridable.
- **Export / share:** share-sheet with a formatted text scorecard (works in Expo Go everywhere); a designed image/PDF-style card is the dev-build upgrade.
- **Career & head-to-head:** leaderboards, bests, team/player history, reusable saved squads.
- **Settings:** themes, haptics/sound, language (EN + HI/Hinglish), API key, export, data reset.

## 9. "Follow Live" — Real Pro Cricket Module

- **Chosen provider (verified 2026-11-12):** **cricketdata.org (CricAPI)**, **Lifetime Free** plan. Verified terms: $0 forever, **100 API hits/day** hard cap, **all features included** on free (live scores, full/fantasy scorecard, ball-by-ball, series, players), data **"a few minutes behind real-time"** (true real-time WebSocket is paid/in-testing). This is the only *actually* free end-to-end option; competitors are vendor-marketing free tiers of similar/smaller size with unverified coverage.
- **Quota-aware design (because of the 100/day cap):** **no background polling.** Fetch on screen-open, honour **manual pull-to-refresh**, cache the last-seen scorecard/commentary offline, de-dupe in-flight requests, and show a lightweight "last updated Xs ago / tap to refresh" affordance. A small request-budget guard warns before the daily cap is hit.
- **Provider abstraction:** `CricketDataProvider` interface (fixtures, live scores, scorecard, commentary, series/standings, player/team info). CricAPI adapter is default; the interface lets a paid key or a different provider drop in for real-time/high-volume with **zero rewrite**. Key supplied by user in Settings.
- **Optional self-hosted scraper adapter (open-source path, verified 2026-11-12):** a second adapter can point at a user-deployed **open-source Cricbuzz scraper** (e.g. `omkarcloud/cricbuzz-scraper`, maintained Oct 2026) that returns unlimited, keyless, richer, near-real-time JSON (live scores, scorecards, commentary, stats). Trade-offs documented honestly: requires the user to **deploy & maintain a small backend** (these are server-side Python scrapers a phone app can't run), is **fragile to Cricbuzz HTML changes**, and is **ToS-grey / non-commercial**. Ships as an advanced, opt-in option — default stays the clean, legal, zero-server CricAPI. ESPNcricinfo's public keyless JSON is a possible fallback source for fixtures/results.
- **Screens:** Live / Upcoming / Recent lists; match detail with live score, full scorecard, commentary feed and stats; follow favourites; **best-effort** local match-start reminders (`expo-notifications`; local notifications work in Expo Go, so this is low-risk — if ever limited, it degrades to an in-app reminder).
- **Honest degradation:** offline or over-quota → show cached last-seen data with a clear state; near-live delay is surfaced, never hidden.

## 10. Live Sharing Module *(LAST phase — needs backend)*

- Scorer toggles "Share live" → gets a 6-char code backed by **Supabase**; each ball event is published; viewers entering the code **subscribe read-only** via Supabase Realtime and see the scoreboard/scorecard update live. Reconnect-safe; the local scorer never depends on connectivity. Scheduled last so the offline-first app is complete before any backend work.

## 11. Design System — *"Floodlight"* identity

Deliberately not a generic dark dashboard.

- **Concept:** a night match under floodlights — deep near-black pitch, electric accents, broadcast-grade numerals.
- **Colour:** midnight charcoal base with a cool undertone; **primary accent an electric lime/seam-green** (floodlit grass / ball seam); **secondary a hot leather-red**; **gold** reserved for milestones (50/100). Full dark theme + an optional bright "Day" theme.
- **Typography:** a strong condensed/grotesk display face for the big scoreboard; **tabular/monospaced numerals** so scores never jitter as digits change; a clean geometric sans for body. (Self-hosted via `expo-font`.)
- **Signature elements:** a hero **LED-style scoreboard** that ticks and rolls; the **six over-orbs** that fill and pop per ball; a real **cricket ball** (drawn seam) as a recurring motif; glassmorphic surfaces (blur + gradient) over a subtle textured pitch backdrop; custom animated tab bar; crafted empty states.
- **Iconography:** a consistent custom/line icon set (e.g. `lucide-react-native`), never emoji.
- **Layout:** opinionated, asymmetric where it earns attention; generous negative space; one clear focal point per screen.

## 12. Animation & Haptics Spec ("max-level")

- Physics-based springs (Reanimated) everywhere; no linear tweens for interactive elements.
- Number rolls on every score change; over-orbs pop with overshoot; boundary → screen-edge light bloom + Lottie; wicket → distinct stinger + haptic; chase milestones animate the required-runs readout.
- Gesture-driven: swipe between innings/scorecard tabs, drag the replay scrubber, pull-to-refresh Follow Live.
- Haptics mapped to meaning: light tick on runs, medium on boundary, heavy/notification on wicket & match end; all user-toggleable.
- Strict 60fps budget; animations run on the UI thread (Reanimated worklets); nothing blocks scoring input.

## 13. Offline, Storage, Crash-Safety

- 100% of your-own-match scoring works airplane-mode.
- Autosave every ball to SQLite; on launch, offer to resume any in-progress match.
- All history & career stats are local and offline. Follow Live caches last-seen data. Export all data to JSON/CSV; optional wipe.

## 14. QA / QC Strategy

- **Engine first, test-first (TDD):** the scoring engine is built via `superpowers:test-driven-development`. A written **test matrix** covers every rule: each run value, wide/no-ball (+combinations, +free-hit), byes/leg-byes, every wicket type, strike rotation on odd runs & over-end, over completion with illegal balls, all-out vs overs-out vs chase-complete, last-man-stands, shared-player attribution, Super Over, undo/redo/edit recomputation, and full-match replay determinism. Property-based checks where useful (e.g. derived totals always reconcile to the ball log).
- **Parallel agents (as requested):** after approval and a written plan (`superpowers:writing-plans`), work is split into independent tracks and built with **`superpowers:subagent-driven-development` / `dispatching-parallel-agents`** — e.g. engine, design-system/components, scoring UI, analysis/charts, history/career, Follow-Live — each delivered with its own tests and a **`superpowers:requesting-code-review`** pass; integration verified with `superpowers:verification-before-completion` (evidence, not assertions).
- **Device reality check (same-day cadence):** the owner tests on their real iPhone via Expo Go **frequently, same-day** *(confirmed)* — so feel/animation/haptics are verified in tight loops, not just at phase boundaries. Each increment ships with a 1-scan Expo build and a short "what to feel for" checklist.

## 15. Build Sequencing (phases)

1. **Foundations:** Expo project, design tokens, core components, navigation, SQLite layer.
2. **Scoring engine (TDD)** + match setup wizard.
3. **Scoring screen** (pad, orbs, scoreboard, undo/redo) wired to the engine.
4. **Analysis suite** (cards + animated SVG charts) + replay + share(text).
5. **History & career stats.**
6. **Follow Live (pro cricket)** via provider adapter.
7. **Polish pass:** milestones, haptics, sound, themes, i18n, empty states.
8. **Live sharing (Supabase)** — last.

## 16. Left to the Builder (minor calls)

- Exact CricAPI endpoint/field mapping (provider decided: cricketdata.org Lifetime Free; map fields during build).
- Final font families within the specified style.
- Precise impact-score weights for Player-of-the-Match.
- SQLite schema final column details & migration helper.
- Whether sound FX ship on by default (default: off).

*Resolved during brainstorming (2026-11-12): language = English + Hinglish toggle; testing = same-day on device; shared-player dismissal per-innings; UUID IDs from Phase 1; Follow Live = near-live viewer with best-effort reminders; optional self-hosted scraper adapter deployable to Vercel Hobby (personal use).*

## 17. Risks & Mitigations

- **Free cricket API limits/instability** → provider abstraction + caching + honest degraded states; swap adapter if needed.
- **Expo Go library ceiling** → ship beautiful SVG/Reanimated/Lottie equivalents now; Skia/view-shot documented as clean dev-build upgrades.
- **iOS install cost reality** → Expo Go keeps it free today; paid/Mac path only if they later want a standalone build.
- **Scope breadth** → strict phasing; the offline scorer (phases 1–5) is a complete, shippable product before Follow Live and sharing.

---

*Approval gate: nothing gets built — no scaffolding, dependencies, or code — until you approve this document. On approval, the next step is a written implementation plan (`superpowers:writing-plans`), then parallel-agent build + QA.*
