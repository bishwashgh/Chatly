import React, { useMemo } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type GlassButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function GlassButton({ title, onPress, variant = 'primary', style, disabled, icon }: GlassButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const variantStyles = useMemo(() => makeVariantStyles(colors), [colors]);
  const variantTextStyles = useMemo(() => makeVariantTextStyles(colors), [colors]);
  const content = (
    <View style={[styles.container, variantStyles[variant], disabled && styles.disabled]}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.text, variantTextStyles[variant]]}>{title}</Text>
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={style}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.primary, colors.gradientSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, styles.gradientBorder]}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, styles.primaryText]}>{title}</Text>
        </LinearGradient>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
}

const makeVariantStyles = (colors: ThemeColors) => ({
  primary: {},
  ghost: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  outline: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  danger: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
});

const makeVariantTextStyles = (colors: ThemeColors) => ({
  primary: { color: colors.surfaceContainerLowest, fontWeight: '700' as const },
  ghost: { color: colors.onSurface },
  outline: { color: colors.primary },
  danger: { color: colors.error },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 9999,
  },
  gradientBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  text: {
    ...typography.labelSm,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  ghostText: {
    color: colors.onSurface,
  },
  outlineText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.error,
  },
  iconWrap: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});