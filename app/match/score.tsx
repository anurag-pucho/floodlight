import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Screen } from '../../src/components/Screen';
import { Surface } from '../../src/components/Surface';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Text } from '../../src/components/Text';
import { TapButton } from '../../src/components/TapButton';
import { Scoreboard } from '../../src/components/Scoreboard';
import { OverOrbs } from '../../src/components/OverOrbs';
import { BallPad } from '../../src/features/scoring/BallPad';
import { CreaseStrip } from '../../src/features/scoring/CreaseStrip';
import { ExtrasSheet } from '../../src/features/scoring/ExtrasSheet';
import { InningsBreak, PlayerPrompt } from '../../src/features/scoring/InningsBreak';
import { ResultBanner } from '../../src/features/scoring/ResultBanner';
import { WicketSheet } from '../../src/features/scoring/WicketSheet';
import {
  composeDelivery,
  useScoring,
  useScoringT,
  type ScoringStore,
} from '../../src/features/scoring/useScoring';
import type { ExtraType } from '../../src/engine';

export interface ScoreScreenProps {
  /** Injectable for tests; defaults to the app singleton. */
  store?: ScoringStore;
}

export default function ScoreScreen({ store }: ScoreScreenProps) {
  const v = useScoring(store);
  const sc = useScoringT();
  const router = useRouter();
  const { spacing, colors, radii } = useTheme();
  const [wicket, setWicket] = useState<{ open: boolean; extra: ExtraType | null }>({ open: false, extra: null });
  const [moreOpen, setMoreOpen] = useState(false);

  const topBar = <ScreenHeader title={sc('scoringTitle')} />;

  if (v.phase === 'none') {
    return (
      <Screen scroll={false} header={topBar}>
        <Text variant="body" color="textSecondary">
          {sc('noMatch')}
        </Text>
      </Screen>
    );
  }

  const board = (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color="textSecondary">
        {`${v.battingTeam} - ${sc('innings')} ${v.inningsIndex + 1}`}
      </Text>
      <Scoreboard runs={v.runs} wickets={v.wickets} overs={v.overs} />
    </View>
  );

  if (v.phase === 'setup' || v.phase === 'break') {
    return (
      <Screen scroll={false} header={topBar}>
        <ScrollView contentContainerStyle={{ gap: spacing.lg }}>
          <InningsBreak
            key={`inn-${v.inningsIndex}`}
            mode={v.phase}
            title={v.phase === 'break' ? sc('inningsBreak') : sc('selectOpeners')}
            summary={v.phase === 'break' ? v.firstInningsLine : undefined}
            targetLine={v.phase === 'break' && v.chase ? sc('targetIs', { runs: v.chase.target }) : undefined}
            battingTeam={v.battingTeam}
            batters={v.batterChoices}
            bowlers={v.bowlerChoices}
            sharedIds={v.sharedIds}
            onStart={v.begin}
            onUndo={v.canUndo ? v.undo : undefined}
          />
        </ScrollView>
      </Screen>
    );
  }

  const live = v.phase === 'live';
  return (
    <Screen scroll={false} header={topBar}>
      <ScrollView contentContainerStyle={{ gap: spacing.lg }}>
        {board}
        {v.freeHit && live ? (
          <View
            testID="free-hit"
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.gold,
              borderRadius: radii.pill,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text variant="label" color="onPrimary">
              {sc('freeHit')}
            </Text>
          </View>
        ) : null}
        {v.chase ? (
          <Text variant="label" color="textSecondary" testID="chase-line">
            {`${sc('targetIs', { runs: v.chase.target })} - ${sc('needFrom', {
              runs: v.chase.runsNeeded,
              balls: v.chase.ballsRemaining,
            })}`}
          </Text>
        ) : null}
        <OverOrbs balls={v.orbs} max={Math.max(6, v.orbs.length)} orbSize={v.orbs.length > 6 ? 30 : 38} />
        <CreaseStrip striker={v.striker} nonStriker={v.nonStriker} bowler={v.bowler} />
        {v.phase === 'result' ? (
          <ResultBanner
            tie={v.result.tie === true}
            winnerName={v.winnerName}
            margin={(v.result.margin ?? '').replace(/^by /, '')}
            onScorecard={() => router.push('/match/scorecard')}
            onUndo={v.undo}
          />
        ) : (
          <Surface padded={false} style={{ padding: spacing.md, gap: spacing.md }}>
            <BallPad
              disabled={!live || v.need !== null}
              byesEnabled={v.byesEnabled}
              onDelivery={(part) => v.submit(part)}
              onWicket={(extra) => setWicket({ open: true, extra })}
              onMore={() => setMoreOpen(true)}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TapButton testID="undo" variant="ghost" label={sc('undo')} disabled={!v.canUndo} onPress={v.undo} />
              </View>
              <View style={{ flex: 1 }}>
                <TapButton testID="redo" variant="ghost" label={sc('redo')} disabled={!v.canRedo} onPress={v.redo} />
              </View>
            </View>
          </Surface>
        )}
      </ScrollView>

      <WicketSheet
        visible={wicket.open && live && v.need === null}
        striker={v.striker}
        nonStriker={v.nonStriker}
        fielders={v.fielderChoices}
        keeperId={v.keeperId}
        freeHit={v.freeHit}
        extra={wicket.extra}
        onClose={() => setWicket({ open: false, extra: null })}
        onConfirm={({ wicket: w, runs }) => {
          v.submit(composeDelivery(wicket.extra, runs, w));
          setWicket({ open: false, extra: null });
        }}
      />
      <ExtrasSheet
        visible={moreOpen && live && v.need === null}
        byesEnabled={v.byesEnabled}
        onClose={() => setMoreOpen(false)}
        onConfirm={({ extra, runs }) => {
          v.submit(composeDelivery(extra, runs));
          setMoreOpen(false);
        }}
      />
      <PlayerPrompt
        testID="batter-prompt"
        visible={live && v.need === 'batter'}
        title={sc('newBatter')}
        players={v.batterChoices}
        onPick={v.pickBatter}
        onUndo={v.undo}
        hint={v.batterChoices.length === 0 ? sc('noBatterShared') : undefined}
      />
      <PlayerPrompt
        testID="bowler-prompt"
        visible={live && v.need === 'bowler'}
        title={sc('selectBowler')}
        players={v.bowlerChoices}
        onPick={v.pickBowler}
        onUndo={v.undo}
        hint={v.bowlerChoices.length === 0 ? sc('noBowlerShared') : v.capHint ? sc('capReached') : undefined}
      />
    </Screen>
  );
}
