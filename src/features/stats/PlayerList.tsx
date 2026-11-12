import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { fill } from '../home/copy';
import { statsCopy } from './copy';
import type { PlayerCareer } from './aggregate';

/** Case-insensitive name filter, alphabetical. */
export function filterPlayers(players: readonly PlayerCareer[], query: string): PlayerCareer[] {
  const q = query.trim().toLowerCase();
  return players
    .filter((p) => q === '' || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function PlayerList({ players, onSelect }: { players: readonly PlayerCareer[]; onSelect: (id: string) => void }) {
  const { spacing, colors, radii, elevation, typography } = useTheme();
  const { lang } = useT();
  const [query, setQuery] = useState('');
  const rows = filterPlayers(players, query);
  return (
    <View style={{ gap: spacing.sm }} testID="player-list">
      <Text variant="heading">{statsCopy('players', lang)}</Text>
      <TextInput
        testID="player-search"
        accessibilityLabel={statsCopy('searchPlayers', lang)}
        placeholder={statsCopy('searchPlayers', lang)}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        style={{
          color: colors.textPrimary,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.md,
          borderWidth: elevation.hairlineWidth,
          borderColor: colors.hairline,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          minHeight: 44,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
        }}
      />
      <Surface elevation="low" padded={false}>
        {rows.length === 0 ? (
          <Text variant="caption" color="textSecondary" style={{ padding: spacing.lg }} testID="player-list-empty">
            {statsCopy('noPlayerMatch', lang)}
          </Text>
        ) : (
          rows.map((p, i) => (
            <Pressable
              key={p.playerId}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              testID={`player-row-${p.playerId}`}
              onPress={() => onSelect(p.playerId)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 52,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.hairline,
              }}
            >
              <Text variant="body" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                {p.name}
              </Text>
              <Text variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
                {fill(statsCopy('matchesShort', lang), { n: String(p.matches) })}
              </Text>
            </Pressable>
          ))
        )}
      </Surface>
    </View>
  );
}
