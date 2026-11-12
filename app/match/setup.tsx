import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Surface } from '../../src/components/Surface';
import { TapButton } from '../../src/components/TapButton';
import { Text } from '../../src/components/Text';
import { useMatchStore } from '../../src/store/matchStore';
import { useTheme } from '../../src/theme/useTheme';
import type { MatchSummary } from '../../src/db/types';
import {
  buildConfig,
  isValid,
  nameKey,
  prefillFromConfig,
  validateSetup,
  type RulesInput,
  type SetupErrorCode,
  type SetupInput,
  type Side,
  type TeamInput,
  type TossInput,
} from '../../src/features/setup/buildConfig';
import { RuleToggles } from '../../src/features/setup/RuleToggles';
import { openSavedMatchSource, type SavedMatchSource } from '../../src/features/setup/savedMatches';
import { loadKnownPlayerNames, movePlayer } from '../../src/features/setup/squadTools';
import { SquadEditor } from '../../src/features/setup/SquadEditor';
import { TossFlip } from '../../src/features/setup/TossFlip';
import { useSetupT, type SetupStrings } from '../../src/features/setup/setupStrings';

type Step = 'shared' | 'teamA' | 'teamB' | 'rules' | 'toss';
const STEPS: Step[] = ['shared', 'teamA', 'teamB', 'rules', 'toss'];

const ERROR_KEY: Record<SetupErrorCode, keyof SetupStrings> = {
  teamNameEmpty: 'errTeamName',
  duplicatePlayer: 'errDuplicate',
  squadTooSmall: 'errSquad',
  oversInvalid: 'errOvers',
  roleNotInSquad: 'errRole',
};

const DEFAULT_RULES: RulesInput = {
  overs: 20,
  wideRuns: 1,
  noBallRuns: 1,
  freeHitOnNoBall: true,
  lastManStands: false,
  byesEnabled: true,
  maxOversPerBowler: 0,
};

export interface SetupScreenProps {
  /** Saved-match source for "use teams from a previous match"; defaults to the on-device DB. */
  repo?: SavedMatchSource;
  /** Injectable coin randomness (tests). */
  random?: () => number;
}

export function SetupScreen({ repo, random }: SetupScreenProps) {
  const { colors, spacing, radii, typography, elevation } = useTheme();
  const st = useSetupT();
  const router = useRouter();
  const newMatch = useMatchStore((s) => s.newMatch);

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [teamA, setTeamA] = useState<TeamInput>({
    name: '',
    color: colors.primary,
    players: ['', ''],
  });
  const [teamB, setTeamB] = useState<TeamInput>({
    name: '',
    color: colors.secondary,
    players: ['', ''],
  });
  const [shared, setShared] = useState<string[]>([]);
  const [rules, setRules] = useState<RulesInput>(DEFAULT_RULES);
  const [toss, setToss] = useState<Partial<TossInput>>({});
  const [picker, setPicker] = useState<MatchSummary[] | 'loading' | null>(null);
  const [loadedFromPrevious, setLoadedFromPrevious] = useState(false);
  const [knownNames, setKnownNames] = useState<string[]>([]);

  // Previous-player suggestions load lazily the first time a squad step is reached.
  const onSquadStep = STEPS[step] === 'teamA' || STEPS[step] === 'teamB';
  useEffect(() => {
    if (!onSquadStep) return;
    let live = true;
    (repo ? Promise.resolve(repo) : openSavedMatchSource())
      .then(loadKnownPlayerNames)
      .then((names) => {
        if (live) setKnownNames(names);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [onSquadStep, repo]);

  const openPicker = (): void => {
    setPicker('loading');
    (repo ? Promise.resolve(repo) : openSavedMatchSource())
      .then((r) => r.listMatches())
      .then((list) => setPicker([...list].sort((a, b) => b.updatedAt - a.updatedAt)))
      .catch(() => setPicker([]));
  };

  const pickPrevious = (id: string): void => {
    (repo ? Promise.resolve(repo) : openSavedMatchSource())
      .then((r) => r.loadMatch(id))
      .then((state) => {
        if (!state) return;
        const pre = prefillFromConfig(state.config);
        setTeamA(pre.teamA);
        setTeamB(pre.teamB);
        setShared(pre.shared);
        setLoadedFromPrevious(true);
        setAttempted(false);
      })
      .catch(() => undefined)
      .finally(() => setPicker(null));
  };

  /** Renaming a shared player keeps it marked as captain / keeper of each team. */
  const changeShared = (next: string[]): void => {
    if (next.length === shared.length) {
      const remap = (team: TeamInput): TeamInput => {
        let out = team;
        next.forEach((name, i) => {
          const old = shared[i];
          if (old === name) return;
          if (out.captain && nameKey(out.captain) === nameKey(old))
            out = { ...out, captain: name.trim() };
          if (out.wicketkeeper && nameKey(out.wicketkeeper) === nameKey(old))
            out = { ...out, wicketkeeper: name.trim() };
        });
        return out;
      };
      setTeamA(remap);
      setTeamB(remap);
    }
    setShared(next);
  };

  const palette = [colors.primary, colors.secondary, colors.four, colors.six, colors.gold];
  const current = STEPS[step];
  const errors = useMemo(
    () =>
      validateSetup({
        teamA,
        teamB,
        shared,
        rules,
        toss: { winner: toss.winner ?? 'A', choice: toss.choice ?? 'bat' },
      }),
    [teamA, teamB, shared, rules, toss],
  );

  const stepErrors = (): SetupErrorCode[] => {
    switch (current) {
      case 'shared':
        return errors.shared;
      case 'teamA':
        return errors.teamA;
      case 'teamB':
        return errors.teamB;
      case 'rules':
        return errors.rules;
      default:
        return [];
    }
  };
  const visibleErrors = attempted ? stepErrors() : [];
  const tossDone = toss.winner !== undefined && toss.choice !== undefined;
  const canAdvance = stepErrors().length === 0;

  const goNext = (): void => {
    if (!canAdvance) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = (): void => {
    if (!isValid(errors) || toss.winner === undefined || toss.choice === undefined) {
      setAttempted(true);
      return;
    }
    const input: SetupInput = {
      teamA,
      teamB,
      shared,
      rules,
      toss: { winner: toss.winner, choice: toss.choice },
    };
    newMatch(buildConfig(input));
    router.push('/match/score');
  };

  const inputStyle = {
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: elevation.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  } as const;

  const renderTeam = (side: Side, team: TeamInput, setTeam: (t: TeamInput) => void) => (
    <View style={{ gap: spacing.lg }}>
      <TextInput
        testID={`team-${side}-name`}
        accessibilityLabel={st('teamName')}
        placeholder={st('teamName')}
        placeholderTextColor={colors.textMuted}
        value={team.name}
        onChangeText={(v) => setTeam({ ...team, name: v })}
        style={inputStyle}
      />
      <Text variant="label" color="textSecondary">
        {st('teamColor')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {palette.map((c, i) => (
          <Pressable
            key={c}
            testID={`team-${side}-color-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`${st('teamColor')} ${i + 1}`}
            accessibilityState={{ selected: team.color === c }}
            onPress={() => setTeam({ ...team, color: c })}
            style={{
              width: spacing['3xl'],
              height: spacing['3xl'],
              borderRadius: radii.pill,
              backgroundColor: c,
              borderWidth: team.color === c ? spacing.xs : elevation.hairlineWidth,
              borderColor: team.color === c ? colors.textPrimary : colors.hairline,
            }}
          />
        ))}
      </View>
      <Text variant="label" color="textSecondary">
        {st('squadCount')} <Text variant="numeric">{team.players.length + shared.length}</Text>
      </Text>
      <SquadEditor
        players={team.players}
        onChange={(players, marks) => setTeam({ ...team, players, ...(marks ?? {}) })}
        testIDPrefix={`team${side}`}
        knownNames={knownNames}
        moveTargetName={
          (side === 'A' ? teamB : teamA).name.trim() || st(side === 'A' ? 'stepTeamB' : 'stepTeamA')
        }
        onMove={(index) => {
          const moved = movePlayer({ teamA, teamB }, side, index);
          setTeamA(moved.teamA);
          setTeamB(moved.teamB);
        }}
        roles={{
          shared,
          captain: team.captain,
          wicketkeeper: team.wicketkeeper,
        }}
      />
    </View>
  );

  const titleKey: Record<Step, keyof SetupStrings> = {
    shared: 'stepShared',
    teamA: 'stepTeamA',
    teamB: 'stepTeamB',
    rules: 'stepRules',
    toss: 'stepToss',
  };

  return (
    <Screen header={<ScreenHeader title={st('title')} />} style={{ gap: spacing.lg }}>
      <Text variant="label" color="textSecondary" testID="setup-step">
        {`${step + 1}/${STEPS.length} · ${st(titleKey[current])}`}
      </Text>
      {current === 'shared' ? (
        <Surface>
          <View style={{ gap: spacing.md }}>
            <TapButton
              testID="setup-use-previous"
              label={st('usePrevious')}
              variant="secondary"
              onPress={openPicker}
            />
            {loadedFromPrevious ? (
              <Text variant="caption" color="primary" testID="setup-loaded-previous">
                {st('loadedPrevious')}
              </Text>
            ) : null}
            {picker === 'loading' ? (
              <Text variant="caption" color="textSecondary">
                {st('loadingPrevious')}
              </Text>
            ) : null}
            {Array.isArray(picker) ? (
              <View style={{ gap: spacing.sm }} testID="setup-previous-list">
                <Text variant="label" color="textSecondary">
                  {st('previousTitle')}
                </Text>
                {picker.length === 0 ? (
                  <Text variant="caption" color="textSecondary">
                    {st('noPrevious')}
                  </Text>
                ) : (
                  picker.map((m) => (
                    <Pressable
                      key={m.id}
                      testID={`previous-match-${m.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.teamAName} ${st('vs')} ${m.teamBName}`}
                      onPress={() => pickPrevious(m.id)}
                      style={{
                        padding: spacing.md,
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: elevation.hairlineWidth,
                        borderColor: colors.hairline,
                        gap: spacing.xs,
                      }}
                    >
                      <Text variant="label">{`${m.teamAName} ${st('vs')} ${m.teamBName}`}</Text>
                      <Text variant="caption" color="textSecondary">
                        {`${m.overs} ${st('overs')}`}
                      </Text>
                    </Pressable>
                  ))
                )}
                <TapButton
                  testID="setup-previous-close"
                  label={st('closePicker')}
                  variant="ghost"
                  haptic="none"
                  onPress={() => setPicker(null)}
                />
              </View>
            ) : null}
          </View>
        </Surface>
      ) : null}
      <Surface>
        {current === 'shared' ? (
          <View style={{ gap: spacing.md }}>
            <Text color="textSecondary">{st('sharedHint')}</Text>
            <SquadEditor players={shared} onChange={changeShared} testIDPrefix="shared" />
          </View>
        ) : null}
        {current === 'teamA' ? renderTeam('A', teamA, setTeamA) : null}
        {current === 'teamB' ? renderTeam('B', teamB, setTeamB) : null}
        {current === 'rules' ? <RuleToggles rules={rules} onChange={setRules} /> : null}
        {current === 'toss' ? (
          <TossFlip
            teamAName={teamA.name.trim()}
            teamBName={teamB.name.trim()}
            teamAColor={teamA.color}
            teamBColor={teamB.color}
            toss={toss}
            onChange={setToss}
            random={random}
          />
        ) : null}
      </Surface>
      {visibleErrors.map((code) => (
        <Text key={code} color="wicket" testID={`error-${code}`}>
          {st(ERROR_KEY[code])}
        </Text>
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {step > 0 ? (
          <TapButton
            testID="setup-back"
            label={st('back')}
            variant="ghost"
            onPress={() => {
              setAttempted(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            style={{ flex: 1 }}
          />
        ) : null}
        {current === 'toss' ? (
          <TapButton
            testID="setup-start"
            label={st('startMatch')}
            disabled={!tossDone}
            onPress={submit}
            style={{ flex: 2 }}
          />
        ) : (
          <TapButton testID="setup-next" label={st('next')} onPress={goNext} style={{ flex: 2 }} />
        )}
      </View>
    </Screen>
  );
}

export default function Setup() {
  return <SetupScreen />;
}
