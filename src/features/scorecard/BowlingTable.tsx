import { View } from 'react-native';
import { bowlingCard, bowlingSide } from '../../engine';
import type { MatchState } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Cell, NUM_COL } from './Cell';
import { useScorecardT } from './useScorecardT';
import { NameWithRoles } from './RoleTag';

const NARROW = 32;

export function BowlingTable({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing, colors } = useTheme();
  const { t } = useT();
  const s = useScorecardT();
  const rows = bowlingCard(state, inningsIndex);
  const side = bowlingSide(state, inningsIndex);
  const row = { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs } as const;
  return (
    <View testID="bowling-table">
      <Text variant="label" color="primary">{t('bowling').toUpperCase()}</Text>
      <View style={row}>
        <Cell header>{s('bowlerCol')}</Cell>
        <Cell header width={NUM_COL}>{s('colO')}</Cell>
        <Cell header width={NARROW}>{s('colM')}</Cell>
        <Cell header width={NUM_COL}>{s('colR')}</Cell>
        <Cell header width={NARROW}>{s('colW')}</Cell>
        <Cell header width={NUM_COL + 12}>{s('colEcon')}</Cell>
        <Cell header width={NARROW}>{s('colDots')}</Cell>
        <Cell header width={NARROW}>{s('colWd')}</Cell>
        <Cell header width={NARROW}>{s('colNb')}</Cell>
      </View>
      {rows.map((r) => (
        <View
          key={r.playerId}
          testID={`bowl-row-${r.playerId}`}
          style={[row, { borderTopWidth: 1, borderTopColor: colors.hairline }]}
        >
          <View style={{ flex: 1 }}>
            <NameWithRoles
              config={state.config}
              side={side}
              playerId={r.playerId}
              name={state.config.players[r.playerId]?.name ?? r.playerId}
            />
          </View>
          <Cell numeric width={NUM_COL}>{r.overs}</Cell>
          <Cell numeric width={NARROW}>{r.maidens}</Cell>
          <Cell numeric width={NUM_COL}>{r.runs}</Cell>
          <Cell numeric width={NARROW}>{r.wickets}</Cell>
          <Cell numeric width={NUM_COL + 12}>{r.economy.toFixed(2)}</Cell>
          <Cell numeric width={NARROW}>{r.dots}</Cell>
          <Cell numeric width={NARROW}>{r.wides}</Cell>
          <Cell numeric width={NARROW}>{r.noBalls}</Cell>
        </View>
      ))}
    </View>
  );
}
