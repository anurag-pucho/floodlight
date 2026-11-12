import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/tokens';

export type TextVariant = 'display' | 'heading' | 'body' | 'label' | 'caption' | 'numeric';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof Colors;
}

export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  const { typography, colors } = useTheme();
  const map = {
    display: typography.display,
    heading: typography.h1,
    body: typography.body,
    label: typography.label,
    caption: typography.caption,
    numeric: typography.numeric,
  } as const;
  return <RNText {...rest} style={[map[variant], { color: colors[color] }, style]} />;
}
