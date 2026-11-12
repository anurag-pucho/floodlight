import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CricketBall } from '../../components/CricketBall';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import type { Side, TossInput } from './buildConfig';
import { useSetupT } from './setupStrings';

export interface TossFlipProps {
  teamAName: string;
  teamBName: string;
  toss: Partial<TossInput>;
  onChange: (toss: Partial<TossInput>) => void;
  /** Injectable for deterministic tests. */
  random?: () => number;
}

export function TossFlip({ teamAName, teamBName, toss, onChange, random = Math.random }: TossFlipProps) {
  const { spacing } = useTheme();
  const st = useSetupT();
  const turns = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  const spin = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${turns.value}deg` }],
  }));

  const flip = (): void => {
    turns.value = withTiming(turns.value + 1080, { duration: 900 });
    setFlipped(true);
    onChange({ ...toss, winner: random() < 0.5 ? 'A' : 'B' });
  };

  const sides: { side: Side; name: string }[] = [
    { side: 'A', name: teamAName },
    { side: 'B', name: teamBName },
  ];

  return (
    <View style={{ gap: spacing.lg, alignItems: 'stretch' }}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={spin} testID="toss-ball">
          <CricketBall size={96} />
        </Animated.View>
      </View>
      <TapButton testID="toss-flip" label={st('flip')} variant="secondary" onPress={flip} />
      <Text variant="label" color="textSecondary">
        {st('tossWinner')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {sides.map(({ side, name }) => (
          <TapButton
            key={side}
            testID={`toss-winner-${side}`}
            label={name}
            variant={toss.winner === side ? 'primary' : 'ghost'}
            onPress={() => onChange({ ...toss, winner: side })}
            style={{ flex: 1 }}
          />
        ))}
      </View>
      {toss.winner ? (
        <>
          <Text variant="label" color="textSecondary">
            {st('tossChoice')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['bat', 'bowl'] as const).map((c) => (
              <TapButton
                key={c}
                testID={`toss-choice-${c}`}
                label={st(c)}
                variant={toss.choice === c ? 'primary' : 'ghost'}
                onPress={() => onChange({ ...toss, choice: c })}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </>
      ) : null}
      {flipped && toss.winner ? (
        <Text color="textSecondary" testID="toss-result">
          {(toss.winner === 'A' ? teamAName : teamBName) + ' ' + st('wonToss')}
        </Text>
      ) : null}
    </View>
  );
}
