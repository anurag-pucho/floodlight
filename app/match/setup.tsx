import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { TapButton } from '../../src/components/TapButton';
import { Text } from '../../src/components/Text';
import { useMatchStore } from '../../src/store/matchStore';
import { useTheme } from '../../src/theme/useTheme';
import {
  buildConfig,
  isValid,
  validateSetup,
  type RulesInput,
  type SetupErrorCode,
  type SetupInput,
  type Side,
  type TeamInput,
  type TossInput,
} from '../../src/features/setup/buildConfig';
import { RuleToggles } from '../../src/features/setup/RuleToggles';
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

export default function SetupScreen() {
  const { colors, spacing, radii, typography, elevation } = useTheme();
  const st = useSetupT();
  const router = useRouter();
  const newMatch = useMatchStore((s) => s.newMatch);

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [teamA, setTeamA] = useState<TeamInput>({ name: '', color: colors.primary, players: ['', ''] });
  const [teamB, setTeamB] = useState<TeamInput>({ name: '', color: colors.secondary, players: ['', ''] });
  const [shared, setShared] = useState<string[]>([]);
  const [rules, setRules] = useState<RulesInput>(DEFAULT_RULES);
  const [toss, setToss] = useState<Partial<TossInput>>({});

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
    const input: SetupInput = { teamA, teamB, shared, rules, toss: { winner: toss.winner, choice: toss.choice } };
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
        {st('squadCount')}{' '}
        <Text variant="numeric">{team.players.length + shared.length}</Text>
      </Text>
      <SquadEditor
        players={team.players}
        onChange={(players) => setTeam({ ...team, players })}
        testIDPrefix={`team${side}`}
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
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text variant="heading">{st('title')}</Text>
        <Text variant="label" color="textSecondary" testID="setup-step">
          {`${step + 1}/${STEPS.length} · ${st(titleKey[current])}`}
        </Text>
        <Surface>
          {current === 'shared' ? (
            <View style={{ gap: spacing.md }}>
              <Text color="textSecondary">{st('sharedHint')}</Text>
              <SquadEditor players={shared} onChange={setShared} testIDPrefix="shared" />
            </View>
          ) : null}
          {current === 'teamA' ? renderTeam('A', teamA, setTeamA) : null}
          {current === 'teamB' ? renderTeam('B', teamB, setTeamB) : null}
          {current === 'rules' ? <RuleToggles rules={rules} onChange={setRules} /> : null}
          {current === 'toss' ? (
            <TossFlip
              teamAName={teamA.name.trim()}
              teamBName={teamB.name.trim()}
              toss={toss}
              onChange={setToss}
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
      </ScrollView>
    </Screen>
  );
}
