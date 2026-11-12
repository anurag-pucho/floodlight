import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { TapButton } from '../../components/TapButton';
import type { ExtraType, Player, WicketType } from '../../engine';
import { Chip, ChipRow, SheetFrame, SheetSection } from './ExtrasSheet';
import { allowedWickets, useScoringT, type CreaseLine } from './useScoring';

export interface WicketChoice {
  wicket: { type: WicketType; outPlayerId: string; fielderId?: string };
  runs: number;
}

export interface WicketSheetProps {
  visible: boolean;
  striker: CreaseLine | null;
  nonStriker: CreaseLine | null;
  fielders: Player[];
  freeHit: boolean;
  /** Modifier already selected on the pad (wide / no-ball restrict dismissals). */
  extra: ExtraType | null;
  onConfirm: (choice: WicketChoice) => void;
  onClose: () => void;
}

const RUN_CHOICES = [0, 1, 2, 3] as const;

export function WicketSheet({ visible, striker, nonStriker, fielders, freeHit, extra, onConfirm, onClose }: WicketSheetProps) {
  const sc = useScoringT();
  const { spacing } = useTheme();
  const allowed = allowedWickets(freeHit, extra);
  const [type, setType] = useState<WicketType | null>(null);
  const [outId, setOutId] = useState<string | null>(null);
  const [fielderId, setFielderId] = useState<string | null>(null);
  const [runs, setRuns] = useState(0);

  useEffect(() => {
    if (!visible) {
      setType(null);
      setOutId(null);
      setFielderId(null);
      setRuns(0);
    }
  }, [visible]);

  const runOut = type === 'runout';
  const outPlayerId = runOut ? (outId ?? striker?.id ?? '') : (striker?.id ?? '');
  const canConfirm = type !== null && outPlayerId !== '';
  const usesFielder = type === 'caught' || type === 'stumped' || type === 'runout';

  return (
    <SheetFrame visible={visible} title={sc('wicket')} onClose={onClose} testID="wicket-sheet">
      <SheetSection title={sc('wicketType')}>
        <ChipRow>
          {allowed.map((w) => (
            <Chip key={w} testID={`wicket-type-${w}`} label={sc(w)} selected={type === w} onPress={() => setType(w)} />
          ))}
        </ChipRow>
      </SheetSection>
      {runOut ? (
        <SheetSection title={sc('outBatter')}>
          <ChipRow>
            {[striker, nonStriker].map((b) =>
              b ? (
                <Chip
                  key={b.id}
                  testID={`wicket-out-${b.id}`}
                  label={b.name}
                  selected={outPlayerId === b.id}
                  onPress={() => setOutId(b.id)}
                />
              ) : null,
            )}
          </ChipRow>
        </SheetSection>
      ) : null}
      {usesFielder ? (
        <SheetSection title={sc('fielder')}>
          <ChipRow>
            <Chip label={sc('noFielder')} selected={fielderId === null} onPress={() => setFielderId(null)} />
            {fielders.map((p) => (
              <Chip
                key={p.id}
                testID={`wicket-fielder-${p.id}`}
                label={p.name}
                selected={fielderId === p.id}
                onPress={() => setFielderId(p.id)}
              />
            ))}
          </ChipRow>
        </SheetSection>
      ) : null}
      {runOut ? (
        <SheetSection title={sc('runsCompleted')}>
          <ChipRow>
            {RUN_CHOICES.map((r) => (
              <Chip key={r} testID={`wicket-run-${r}`} label={String(r)} selected={runs === r} onPress={() => setRuns(r)} />
            ))}
          </ChipRow>
        </SheetSection>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TapButton style={{ flex: 1 }} variant="ghost" label={sc('cancel')} onPress={onClose} />
        <TapButton
          style={{ flex: 1 }}
          testID="wicket-confirm"
          label={sc('confirm')}
          disabled={!canConfirm}
          onPress={() => {
            if (type === null) return;
            onConfirm({
              wicket: {
                type,
                outPlayerId,
                ...(usesFielder && fielderId ? { fielderId } : {}),
              },
              runs: runOut ? runs : 0,
            });
          }}
        />
      </View>
    </SheetFrame>
  );
}
