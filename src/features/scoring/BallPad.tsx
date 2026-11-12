import { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import type { ExtraType } from '../../engine';
import { composeDelivery, useScoringT, type DeliveryPart } from './useScoring';

export interface BallPadProps {
  disabled?: boolean;
  byesEnabled: boolean;
  onDelivery: (part: DeliveryPart) => void;
  /** Opens the wicket sheet carrying the currently selected modifier. */
  onWicket: (extra: ExtraType | null) => void;
  onMore: () => void;
}

const RUNS = [0, 1, 2, 3, 4, 6] as const;

export function BallPad({ disabled = false, byesEnabled, onDelivery, onWicket, onMore }: BallPadProps) {
  const sc = useScoringT();
  const { spacing, colors } = useTheme();
  const [extra, setExtra] = useState<ExtraType | null>(null);

  const toggle = (e: ExtraType) => setExtra((cur) => (cur === e ? null : e));
  const mods: { key: ExtraType; label: string; hidden?: boolean }[] = [
    { key: 'wide', label: sc('wide') },
    { key: 'noball', label: sc('noBall') },
    { key: 'bye', label: sc('bye'), hidden: !byesEnabled },
    { key: 'legbye', label: sc('legBye'), hidden: !byesEnabled },
  ];
  const needsRuns = extra === 'bye' || extra === 'legbye';
  const active = mods.find((m) => m.key === extra);

  return (
    <View style={{ gap: spacing.md }} testID="ball-pad">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {RUNS.map((r) => (
          <View key={r} style={{ width: '31%', flexGrow: 1 }}>
            <TapButton
              testID={`run-${r}`}
              label={String(r)}
              variant={r === 4 || r === 6 ? 'primary' : 'secondary'}
              haptic={r === 4 || r === 6 ? 'medium' : 'light'}
              disabled={disabled || (needsRuns && r === 0)}
              onPress={() => {
                onDelivery(composeDelivery(extra, r));
                setExtra(null);
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {mods
          .filter((m) => !m.hidden)
          .map((m) => (
            <View key={m.key} style={{ flexGrow: 1 }}>
              <TapButton
                testID={`mod-${m.key}`}
                label={m.label}
                variant={extra === m.key ? 'primary' : 'ghost'}
                disabled={disabled}
                onPress={() => toggle(m.key)}
                style={{ paddingHorizontal: spacing.md }}
              />
            </View>
          ))}
        <View style={{ flexGrow: 1 }}>
          <TapButton
            testID="more"
            label={sc('more')}
            variant="ghost"
            disabled={disabled}
            onPress={onMore}
            style={{ paddingHorizontal: spacing.md }}
          />
        </View>
        <View style={{ flexGrow: 1 }}>
          <TapButton
            testID="wicket"
            label={sc('wicket')}
            variant="secondary"
            haptic="heavy"
            disabled={disabled}
            onPress={() => {
              onWicket(extra);
              setExtra(null);
            }}
            style={{ backgroundColor: colors.wicket, paddingHorizontal: spacing.md }}
          />
        </View>
      </View>
      {active ? (
        <Text variant="caption" color="textSecondary">
          {`${active.label} +`}
        </Text>
      ) : null}
    </View>
  );
}
