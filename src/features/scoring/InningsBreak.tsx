import { useState } from 'react';
import { useTheme } from '../../theme/useTheme';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import type { Player } from '../../engine';
import { Chip, ChipRow, SheetFrame, SheetSection } from './ExtrasSheet';
import { useScoringT } from './useScoring';

export interface InningsBreakProps {
  mode: 'setup' | 'break';
  title: string;
  summary?: string;
  targetLine?: string;
  battingTeam: string;
  batters: Player[];
  bowlers: Player[];
  /** Shared players: can't be an opener and the opening bowler at once. */
  sharedIds?: string[];
  onStart: (strikerId: string, nonStrikerId: string, bowlerId: string) => void;
  onUndo?: () => void;
}

/** Opening pair + opening bowler selection; in `break` mode also shows the first-innings summary. */
export function InningsBreak({
  mode,
  title,
  summary,
  targetLine,
  battingTeam,
  batters,
  bowlers,
  sharedIds = [],
  onStart,
  onUndo,
}: InningsBreakProps) {
  const sc = useScoringT();
  const { spacing } = useTheme();
  const [striker, setStriker] = useState<string | null>(null);
  const [non, setNon] = useState<string | null>(null);
  const [bowler, setBowler] = useState<string | null>(null);
  const isShared = (id: string): boolean => sharedIds.includes(id);
  const opens = (id: string): boolean => striker === id || non === id;
  const batterBlocked = (id: string): boolean => isShared(id) && bowler === id;
  const bowlerBlocked = (id: string): boolean => isShared(id) && opens(id);
  const noBowlers = bowlers.length > 0 && bowlers.every((p) => bowlerBlocked(p.id));
  const ready = striker !== null && non !== null && bowler !== null && striker !== non;

  return (
    <Surface gradient testID="innings-break" style={{ gap: spacing.lg }}>
      <Text variant="heading">{title}</Text>
      {summary ? (
        <Text variant="body" color="textSecondary">
          {summary}
        </Text>
      ) : null}
      {targetLine ? (
        <Text variant="numeric" color="primary">
          {targetLine}
        </Text>
      ) : null}
      <SheetSection title={`${battingTeam} - ${sc('striker')}`}>
        <ChipRow>
          {batters.map((p) => (
            <Chip
              key={p.id}
              testID={`open-striker-${p.id}`}
              label={p.name}
              selected={striker === p.id}
              disabled={non === p.id || batterBlocked(p.id)}
              onPress={() => setStriker(p.id)}
            />
          ))}
        </ChipRow>
      </SheetSection>
      <SheetSection title={sc('nonStriker')}>
        <ChipRow>
          {batters.map((p) => (
            <Chip
              key={p.id}
              testID={`open-non-${p.id}`}
              label={p.name}
              selected={non === p.id}
              disabled={striker === p.id || batterBlocked(p.id)}
              onPress={() => setNon(p.id)}
            />
          ))}
        </ChipRow>
      </SheetSection>
      <SheetSection title={sc('bowler')}>
        {noBowlers ? (
          <Text variant="caption" color="textSecondary" testID="open-bowler-hint">
            {sc('noBowlerShared')}
          </Text>
        ) : null}
        <ChipRow>
          {bowlers.map((p) => (
            <Chip
              key={p.id}
              testID={`open-bowler-${p.id}`}
              label={p.name}
              selected={bowler === p.id}
              disabled={bowlerBlocked(p.id)}
              onPress={() => setBowler(p.id)}
            />
          ))}
        </ChipRow>
      </SheetSection>
      <TapButton
        testID="start-innings"
        label={mode === 'break' ? sc('startSecondInnings') : sc('startInnings')}
        disabled={!ready}
        onPress={() => {
          if (ready) onStart(striker, non, bowler);
        }}
      />
      {onUndo ? <TapButton testID="break-undo" variant="ghost" label={sc('undo')} onPress={onUndo} /> : null}
    </Surface>
  );
}

export interface PlayerPromptProps {
  visible: boolean;
  title: string;
  players: Player[];
  onPick: (id: string) => void;
  /** Escape hatch for a mis-tapped ball: reverts the last delivery. */
  onUndo: () => void;
  hint?: string;
  testID?: string;
}

/** Blocking prompt: choose the next batter or the next over's bowler (or undo the last ball). */
export function PlayerPrompt({ visible, title, players, onPick, onUndo, hint, testID }: PlayerPromptProps) {
  const sc = useScoringT();
  return (
    <SheetFrame visible={visible} title={title} onClose={onUndo} testID={testID}>
      {hint ? (
        <Text variant="caption" color="textSecondary" testID="prompt-hint">
          {hint}
        </Text>
      ) : null}
      <ChipRow>
        {players.map((p) => (
          <Chip key={p.id} testID={`pick-${p.id}`} label={p.name} onPress={() => onPick(p.id)} />
        ))}
      </ChipRow>
      <TapButton testID="prompt-undo" variant="ghost" label={sc('undoLast')} onPress={onUndo} />
    </SheetFrame>
  );
}
