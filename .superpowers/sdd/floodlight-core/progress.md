# SDD ledger — plan: docs/superpowers/plans/2026-11-12-floodlight-core-scorer.md

Scope ruling: build Plans 1-3 (offline scorer, analysis, history/career/polish); EXCLUDE live sharing (Supabase) and Follow Live (pro cricket API) per user 2026-11-12.
Ruling: scaffold used blank-typescript; Task S0 adds expo-router + jest. Branch feat/core-scorer off master.
Task S0: implemented (commit ea848b1) — deps+router+jest; tcs clean, jest 2/2. Ruling: accept implementer deviations (worklets plugin, babel-preset-expo hoist, react-dom@19.3.0 pin, tsconfig types:[jest], dev-deps via npm) — standard for SDK58/RN0.88; cost if wrong: config churn, caught by first RN-component test. Review: pending (config-focused).
Task E1: dispatched, BASE ea848b1.
Task S0: complete (commit ea848b1, review APPROVED clean). Deferred minors: @testing-library/jest-native deprecated (swap later); app.json userInterfaceStyle=light -> set when D1 dark theme lands.
Task E1: complete (commit 15261ec, review Spec OK / Quality Approved). Deferred minors: strengthen no-mutation test; onStrikeId returns empty-string sentinel on zero events; ball id `${matchId}-${n}` can reuse after undo+redo -> CARRY TO E6 (undo/redo must key balls safely).
Task E2: dispatched, BASE 15261ec.
