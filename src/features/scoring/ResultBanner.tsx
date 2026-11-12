import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import { useScoringT } from './useScoring';

export interface ResultBannerProps {
  tie: boolean;
  winnerName: string;
  margin: string;
  onScorecard: () => void;
  onUndo: () => void;
}

export function ResultBanner({ tie, winnerName, margin, onScorecard, onUndo }: ResultBannerProps) {
  const sc = useScoringT();
  const { spacing } = useTheme();
  return (
    <Surface gradient elevation="medium" testID="result-banner" style={{ gap: spacing.lg }}>
      <Text variant="caption" color="textSecondary">
        {sc('matchResult')}
      </Text>
      <Text variant="heading" color="primary">
        {tie ? sc('tied') : sc('winnerLine', { team: winnerName, margin })}
      </Text>
      <View style={{ gap: spacing.sm }}>
        <TapButton testID="view-scorecard" label={sc('viewScorecard')} onPress={onScorecard} />
        <TapButton testID="result-undo" variant="ghost" label={sc('undo')} onPress={onUndo} />
      </View>
    </Surface>
  );
}
