import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import type { ExtraType } from '../../engine';
import { useScoringT } from './useScoring';

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Selectable pill used by every sheet. */
export function Chip({ label, selected = false, disabled = false, onPress, testID }: ChipProps) {
  const { colors, radii, spacing, elevation } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
        borderWidth: elevation.hairlineWidth,
        borderColor: selected ? colors.primary : colors.hairline,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}

export function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="textSecondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

export interface SheetFrameProps {
  visible: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  testID?: string;
}

/** Bottom sheet shell. Backdrop dismisses when `onClose` is provided. */
export function SheetFrame({ visible, title, onClose, children, testID }: SheetFrameProps) {
  const { colors, spacing } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill} testID={testID}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.6 }]}
          onPress={onClose}
        />
        <Surface elevation="high" radius="xl" style={{ maxHeight: '80%' }}>
          <Text variant="heading" style={{ marginBottom: spacing.md }}>
            {title}
          </Text>
          <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }}>{children}</ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, justifyContent: 'flex-end' } });

export interface ExtrasChoice {
  extra: ExtraType | null;
  runs: number;
}

export interface ExtrasSheetProps {
  visible: boolean;
  byesEnabled: boolean;
  onConfirm: (choice: ExtrasChoice) => void;
  onClose: () => void;
}

const RUNS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** Full-form entry: any extra type with any number of runs (covers 5s and overthrows). */
export function ExtrasSheet({ visible, byesEnabled, onConfirm, onClose }: ExtrasSheetProps) {
  const sc = useScoringT();
  const { spacing } = useTheme();
  const [extra, setExtra] = useState<ExtraType | null>(null);
  const [runs, setRuns] = useState(0);

  const types: { key: ExtraType | null; label: string; hidden?: boolean }[] = [
    { key: null, label: sc('plainRuns') },
    { key: 'wide', label: sc('wide') },
    { key: 'noball', label: sc('noBall') },
    { key: 'bye', label: sc('bye'), hidden: !byesEnabled },
    { key: 'legbye', label: sc('legBye'), hidden: !byesEnabled },
  ];

  return (
    <SheetFrame visible={visible} title={sc('extras')} onClose={onClose} testID="extras-sheet">
      <SheetSection title={sc('extraType')}>
        <ChipRow>
          {types
            .filter((x) => !x.hidden)
            .map((x) => (
              <Chip
                key={x.label}
                testID={`extras-type-${x.key ?? 'none'}`}
                label={x.label}
                selected={extra === x.key}
                onPress={() => setExtra(x.key)}
              />
            ))}
        </ChipRow>
      </SheetSection>
      <SheetSection title={sc('runs')}>
        <ChipRow>
          {RUNS.map((r) => (
            <Chip
              key={r}
              testID={`extras-run-${r}`}
              label={String(r)}
              selected={runs === r}
              onPress={() => setRuns(r)}
            />
          ))}
        </ChipRow>
      </SheetSection>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TapButton style={{ flex: 1 }} variant="ghost" label={sc('cancel')} onPress={onClose} />
        <TapButton
          style={{ flex: 1 }}
          testID="extras-confirm"
          label={sc('confirm')}
          onPress={() => {
            onConfirm({ extra, runs });
            setExtra(null);
            setRuns(0);
          }}
        />
      </View>
    </SheetFrame>
  );
}
