import { View } from 'react-native';
import { battingCard, battingSide } from '../../engine';
import type { MatchState } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Cell, NUM_COL } from './Cell';
import { useScorecardT } from './useScorecardT';
import { NameWithRoles } from './RoleTag';

export function BattingTable({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing, colors } = useTheme();
  const { t } = useT();
  const s = useScorecardT();
  const rows = battingCard(state, inningsIndex);
  const side = battingSide(state, inningsIndex);
  const row = { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs } as const;
  return (
    <View testID="batting-table">
      <Text variant="label" color="primary">{t('batting').toUpperCase()}</Text>
      <View style={row}>
        <Cell header>{s('batter')}</Cell>
        <Cell header width={NUM_COL}>{s('colR')}</Cell>
        <Cell header width={NUM_COL}>{s('colB')}</Cell>
        <Cell header width={NUM_COL}>{s('colFours')}</Cell>
        <Cell header width={NUM_COL}>{s('colSixes')}</Cell>
        <Cell header width={NUM_COL + 12}>{s('colSR')}</Cell>
      </View>
      {rows.map((r) => {
        const name = state.config.players[r.playerId]?.name ?? r.playerId;
        return (
          <View
            key={r.playerId}
            testID={`bat-row-${r.playerId}`}
            style={[row, { borderTopWidth: 1, borderTopColor: colors.hairline }]}
          >
            <View style={{ flex: 1 }}>
              <NameWithRoles config={state.config} side={side} playerId={r.playerId} name={name} />
              <Text variant="caption" color={r.out ? 'wicket' : 'textSecondary'}>
                {r.out ? r.dismissal ?? t('out') : s('notOut')}
              </Text>
            </View>
            <Cell numeric width={NUM_COL}>{r.runs}</Cell>
            <Cell numeric width={NUM_COL}>{r.balls}</Cell>
            <Cell numeric width={NUM_COL}>{r.fours}</Cell>
            <Cell numeric width={NUM_COL}>{r.sixes}</Cell>
            <Cell numeric width={NUM_COL + 12}>{r.strikeRate.toFixed(1)}</Cell>
          </View>
        );
      })}
    </View>
  );
}
