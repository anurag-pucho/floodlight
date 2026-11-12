import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import { useTheme } from '../../theme/useTheme';
import { nameKey } from './buildConfig';
import { useSetupT } from './setupStrings';
import { filterSuggestions } from './squadTools';

export interface RoleMarks {
  captain?: string;
  wicketkeeper?: string;
}

export interface SquadRoles extends RoleMarks {
  /** Shared players of the match, shown read-only so they can also be marked C / WK. */
  shared: string[];
}

export interface SquadEditorProps {
  players: string[];
  /** Second argument is present (both keys) whenever the C/WK marks changed with the list. */
  onChange: (players: string[], marks?: RoleMarks) => void;
  /** Prefix for testIDs, e.g. "teamA". */
  testIDPrefix: string;
  /** When given, each row gets Captain (C) / Wicketkeeper (WK) chips. */
  roles?: SquadRoles;
  /** When given, each own player row gets a control that sends the player to the other team. */
  onMove?: (index: number) => void;
  /** Name of the other team, shown in the move control. */
  moveTargetName?: string;
  /** Player names from previous matches offered while typing a name. */
  knownNames?: readonly string[];
}

export function SquadEditor({
  players,
  onChange,
  testIDPrefix,
  roles,
  onMove,
  moveTargetName,
  knownNames,
}: SquadEditorProps) {
  const { colors, spacing, radii, typography, elevation } = useTheme();
  const st = useSetupT();
  const [focused, setFocused] = useState<number | null>(null);

  const isMarked = (mark: string | undefined, name: string): boolean =>
    mark !== undefined && name.trim().length > 0 && nameKey(mark) === nameKey(name);

  const chip = (
    id: string,
    label: string,
    a11y: string,
    active: boolean,
    name: string,
    onPress: () => void,
  ) => (
    <Pressable
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={`${a11y} ${name}`}
      accessibilityState={{
        selected: active,
        disabled: name.trim().length === 0,
      }}
      disabled={name.trim().length === 0}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={{
        minWidth: spacing['4xl'],
        minHeight: spacing['4xl'],
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.gold : colors.surfaceAlt,
        borderWidth: elevation.hairlineWidth,
        borderColor: active ? colors.gold : colors.hairline,
        opacity: name.trim().length === 0 ? 0.4 : 1,
      }}
    >
      <Text variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );

  const toggle = (marks: RoleMarks, field: keyof RoleMarks, name: string): RoleMarks => {
    const next: RoleMarks = {
      captain: marks.captain,
      wicketkeeper: marks.wicketkeeper,
    };
    next[field] = isMarked(marks[field], name) ? undefined : name.trim();
    return next;
  };

  const marks: RoleMarks = {
    captain: roles?.captain,
    wicketkeeper: roles?.wicketkeeper,
  };

  const rename = (i: number, v: string): void => {
    const name = players[i] ?? '';
    const next = players.map((p, j) => (j === i ? v : p));
    // A renamed C / WK keeps its mark.
    const renamed = (m: string | undefined): string | undefined =>
      isMarked(m, name) ? v.trim() : m;
    if (roles && (isMarked(marks.captain, name) || isMarked(marks.wicketkeeper, name))) {
      onChange(next, {
        captain: renamed(marks.captain),
        wicketkeeper: renamed(marks.wicketkeeper),
      });
    } else {
      onChange(next);
    }
  };

  const suggestionsFor = (i: number): string[] =>
    knownNames
      ? filterSuggestions(knownNames, players[i] ?? '', [
          ...players.filter((_, j) => j !== i),
          ...(roles?.shared ?? []),
        ])
      : [];

  const roleChips = (idPrefix: string, name: string, onMarks: (m: RoleMarks) => void) => (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {chip(
        `${idPrefix}-captain`,
        st('captainChip'),
        st('captainLabel'),
        isMarked(marks.captain, name),
        name,
        () => onMarks(toggle(marks, 'captain', name)),
      )}
      {chip(
        `${idPrefix}-keeper`,
        st('keeperChip'),
        st('keeperLabel'),
        isMarked(marks.wicketkeeper, name),
        name,
        () => onMarks(toggle(marks, 'wicketkeeper', name)),
      )}
    </View>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {roles ? (
        <Text variant="caption" color="textSecondary">
          {st('rolesHint')}
        </Text>
      ) : null}
      {roles && roles.shared.some((n) => n.trim().length > 0) ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            {st('sharedPlayers')}
          </Text>
          {roles.shared.map((name, i) =>
            name.trim().length === 0 ? null : (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Text style={{ flex: 1 }}>{name}</Text>
                {roleChips(`${testIDPrefix}-shared-${i}`, name, (m) => onChange(players, m))}
              </View>
            ),
          )}
        </View>
      ) : null}
      {players.map((name, i) => (
        <View key={i} style={{ gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Text variant="numeric" color="textMuted" style={{ width: spacing['2xl'] }}>
              {i + 1}
            </Text>
            <TextInput
              testID={`${testIDPrefix}-player-${i}`}
              accessibilityLabel={st('playerName')}
              placeholder={st('playerName')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(v) => rename(i, v)}
              onFocus={() => setFocused(i)}
              onSubmitEditing={() => setFocused(null)}
              style={{
                flex: 1,
                minWidth: 0,
                color: colors.textPrimary,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radii.md,
                borderWidth: elevation.hairlineWidth,
                borderColor: colors.hairline,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
              }}
            />
            {roles ? roleChips(`${testIDPrefix}-${i}`, name, (m) => onChange(players, m)) : null}
            <TapButton
              testID={`${testIDPrefix}-remove-${i}`}
              label={st('removePlayer')}
              variant="ghost"
              haptic="none"
              onPress={() =>
                onChange(
                  players.filter((_, j) => j !== i),
                  roles
                    ? {
                        captain: isMarked(marks.captain, name) ? undefined : marks.captain,
                        wicketkeeper: isMarked(marks.wicketkeeper, name)
                          ? undefined
                          : marks.wicketkeeper,
                      }
                    : undefined,
                )
              }
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
              }}
            />
          </View>
          {onMove && name.trim().length > 0 ? (
            <TapButton
              testID={`${testIDPrefix}-move-${i}`}
              label={`${st('moveTo')} ${moveTargetName ?? ''}`.trim()}
              variant="ghost"
              haptic="none"
              onPress={() => onMove(i)}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
          {focused === i && suggestionsFor(i).length > 0 ? (
            <View style={{ gap: spacing.xs }} testID={`${testIDPrefix}-suggestions-${i}`}>
              <Text variant="caption" color="textSecondary">
                {st('previousPlayers')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                }}
              >
                {suggestionsFor(i).map((n) => (
                  <Pressable
                    key={n}
                    testID={`${testIDPrefix}-suggestion-${i}-${nameKey(n)}`}
                    accessibilityRole="button"
                    accessibilityLabel={n}
                    onPress={() => {
                      rename(i, n);
                      setFocused(null);
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.pill,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: elevation.hairlineWidth,
                      borderColor: colors.hairline,
                    }}
                  >
                    <Text variant="label">{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ))}
      <TapButton
        testID={`${testIDPrefix}-add`}
        label={st('addPlayer')}
        variant="secondary"
        onPress={() => onChange([...players, ''])}
      />
    </View>
  );
}
