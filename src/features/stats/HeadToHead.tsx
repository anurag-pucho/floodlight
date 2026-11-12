import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { homeCopy } from '../home/copy';
import { statsCopy } from './copy';
import type { H2H } from './aggregate';

const tabular = { fontVariant: ['tabular-nums' as const] };

function Cell({ label, value }: { label: string; value: number }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text variant="numeric" style={tabular}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function HeadToHead({ records }: { records: readonly H2H[] }) {
  const { spacing } = useTheme();
  const { lang } = useT();
  if (records.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }} testID="head-to-head">
      <Text variant="heading">{statsCopy('headToHead', lang)}</Text>
      {records.map((r) => (
        <Surface key={`${r.teamA}|${r.teamB}`} elevation="low" testID={`h2h-${r.teamA}-${r.teamB}`}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="body" numberOfLines={2}>
              {`${r.teamA} ${homeCopy('vs', lang)} ${r.teamB}`}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Cell label={`${statsCopy('won', lang)} ${r.teamA}`} value={r.teamAWins} />
              <Cell label={statsCopy('tied', lang)} value={r.ties} />
              <Cell label={`${statsCopy('won', lang)} ${r.teamB}`} value={r.teamBWins} />
            </View>
            <Text variant="caption" color="textSecondary" style={tabular}>
              {`${statsCopy('played', lang)} ${r.played}`}
            </Text>
          </View>
        </Surface>
      ))}
    </View>
  );
}
