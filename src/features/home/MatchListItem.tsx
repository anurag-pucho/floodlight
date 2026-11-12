import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import type { MatchConfig } from '../../engine';
import type { MatchSummary } from '../../db/types';
import { homeCopy } from './copy';

export interface MatchListEntry {
  summary: MatchSummary;
  /** Localised result line; only present for completed matches. */
  result: string | null;
  /** Config of a completed match, used to start a rematch. */
  config?: MatchConfig;
}

export interface MatchListItemProps {
  entry: MatchListEntry;
  onPress: (id: string) => void;
  onRematch?: (config: MatchConfig) => void;
}

export function MatchListItem({ entry, onPress, onRematch }: MatchListItemProps) {
  const { spacing } = useTheme();
  const { t, lang } = useT();
  const { summary, result, config } = entry;
  const done = summary.status === 'complete';
  const status = homeCopy(done ? 'complete' : 'inProgress', lang);
  const title = `${summary.teamAName} ${homeCopy('vs', lang)} ${summary.teamBName}`;
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${status}`}
        testID={`match-${summary.id}`}
        onPress={() => onPress(summary.id)}
      >
        <Surface elevation="low">
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">{title}</Text>
            <Text variant="caption" color="textSecondary">
              {`${summary.overs} ${t('overs')}`}
            </Text>
            <Text variant="label" color={done ? 'textSecondary' : 'primary'}>
              {status}
            </Text>
            {result ? <Text variant="body">{result}</Text> : null}
          </View>
        </Surface>
      </Pressable>
      {done && config && onRematch ? (
        <TapButton
          variant="secondary"
          label={homeCopy('rematch', lang)}
          testID={`rematch-${summary.id}`}
          onPress={() => onRematch(config)}
        />
      ) : null}
    </View>
  );
}
