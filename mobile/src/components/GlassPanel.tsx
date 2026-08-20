import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { glassShadows, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type GlassPanelProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  variant?: 'panel' | 'card' | 'bubble';
  rounded?: 'sm' | 'default' | 'md' | 'lg' | 'xl' | 'pill';
};

// Clean white card with a subtle border and soft shadow
export function GlassPanel({
  style,
  children,
  variant = 'panel',
  rounded = 'default',
}: GlassPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const variantStyle =
    variant === 'panel'
      ? styles.panel
      : variant === 'card'
        ? styles.card
        : styles.bubble;

  const radiusStyle = {
    sm: styles.radiusSm,
    default: styles.radiusDefault,
    md: styles.radiusMd,
    lg: styles.radiusLg,
    xl: styles.radiusXl,
    pill: styles.radiusPill,
  }[rounded];

  return (
    <View style={[styles.base, variantStyle, radiusStyle, style]}>
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...glassShadows.panel,
  },
  card: {
    backgroundColor: colors.glassFillCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...glassShadows.panel,
  },
  bubble: {
    backgroundColor: colors.glassFillStrong,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  radiusSm: { borderRadius: 8 },
  radiusDefault: { borderRadius: 12 },
  radiusMd: { borderRadius: 16 },
  radiusLg: { borderRadius: 20 },
  radiusXl: { borderRadius: 28 },
  radiusPill: { borderRadius: 9999 },
});