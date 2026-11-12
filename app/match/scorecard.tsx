import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { currentInningsIndex, teamTotal, wicketsDown } from '../../src/engine';
import { useMatchStore } from '../../src/store/matchStore';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { useTheme } from '../../src/theme/useTheme';
import { useT } from '../../src/i18n/useT';
import { useScorecardT } from '../../src/features/scorecard/useScorecardT';
import { InningsSwitcher } from '../../src/features/scorecard/InningsSwitcher';
import { ChaseHeader } from '../../src/features/scorecard/ChaseHeader';
import { BattingTable } from '../../src/features/scorecard/BattingTable';
import { BowlingTable } from '../../src/features/scorecard/BowlingTable';
import { ExtrasLine } from '../../src/features/scorecard/ExtrasLine';
import { FowList } from '../../src/features/scorecard/FowList';
import { ChartsPanel } from '../../src/features/scorecard/ChartsPanel';
import { Replay } from '../../src/features/scorecard/Replay';
import { PartnershipList } from '../../src/features/scorecard/PartnershipList';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const state = useMatchStore((s) => s.state);
  const loadById = useMatchStore((s) => s.loadById);
  const { spacing } = useTheme();
  const { t } = useT();
  const s = useScorecardT();
  const [selected, setSelected] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (id && state?.config.id !== id) {
      loadById(id).catch((e: unknown) => console.warn('Floodlight: load failed', e));
    }
    // Load once per id; the store state is the result, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!state) {
    return (
      <Screen header={<ScreenHeader title={s('title')} />}>
        <Text variant="body" color="textSecondary">{s('noMatch')}</Text>
      </Screen>
    );
  }

  const idx = selected ?? currentInningsIndex(state);
  const cfg = state.config;
  const first = cfg.battingFirst === 'A' ? cfg.teamA : cfg.teamB;
  const second = cfg.battingFirst === 'A' ? cfg.teamB : cfg.teamA;
  const battingTeam = idx === 0 ? first : second;

  return (
    <Screen header={<ScreenHeader title={`${cfg.teamA.name} vs ${cfg.teamB.name}`} />}>
      <View style={{ gap: spacing.lg }}>
        <InningsSwitcher value={idx} onChange={setSelected} labels={[first.name, second.name]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="heading" testID="innings-heading">{`${battingTeam.name} · ${t('innings')} ${idx + 1}`}</Text>
          <Text variant="heading" testID="innings-score">{`${teamTotal(state, idx)}/${wicketsDown(state, idx)}`}</Text>
        </View>
        <ChaseHeader state={state} inningsIndex={idx} />
        <Surface style={{ gap: spacing.sm }}>
          <BattingTable state={state} inningsIndex={idx} />
          <ExtrasLine state={state} inningsIndex={idx} />
        </Surface>
        <Surface><BowlingTable state={state} inningsIndex={idx} /></Surface>
        <Surface style={{ gap: spacing.lg }}>
          <FowList state={state} inningsIndex={idx} />
          <PartnershipList state={state} inningsIndex={idx} />
        </Surface>
        <ChartsPanel state={state} inningsIndex={idx} />
        <Replay state={state} />
      </View>
    </Screen>
  );
}
