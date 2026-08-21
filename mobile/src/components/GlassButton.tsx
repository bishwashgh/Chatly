import React, { useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type GlassButtonVariant = 'primary' | 'glass' | 'fluid' | 'outline' | 'ghost' | 'danger';

type GlassButtonProps = {
  title: string;
  onPress: () => void;
  variant?: GlassButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
};

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
  icon,
  iconPosition = 'left',
}: GlassButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const variantStyles = useMemo(() => makeVariantStyles(colors), [colors]);
  const variantTextStyles = useMemo(() => makeVariantTextStyles(colors), [colors]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();
    }
  };

  const isFluid = variant === 'fluid';
  const isGlass = variant === 'glass';

  const renderContent = () => (
    <View
      style={[
        styles.container,
        variantStyles[variant],
        disabled && styles.disabled,
      ]}
    >
      {icon && iconPosition === 'left' && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.text, variantTextStyles[variant]]}>{title}</Text>
      {icon && iconPosition === 'right' && <View style={styles.iconWrapRight}>{icon}</View>}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
    >
      {isFluid ? (
        <FluidGradientButton colors={colors} style={styles.container} disabled={disabled}>
          {renderContent()}
        </FluidGradientButton>
      ) : isGlass ? (
        <GlassMorphismButton colors={colors} style={styles.container} disabled={disabled}>
          {renderContent()}
        </GlassMorphismButton>
      ) : variant === 'primary' ? (
        <LinearGradient
          colors={[colors.primary, colors.gradientSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            styles.gradientBorder,
            disabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      ) : (
        renderContent()
      )}
    </TouchableOpacity>
  );
}

const GlassMorphismButton = ({ 
  colors, 
  children, 
  style, 
  disabled 
}: { 
  colors: ThemeColors; 
  children: React.ReactNode; 
  style?: StyleProp<ViewStyle>; 
  disabled?: boolean 
}) => (
  <View
    style={[
      style,
      {
        backgroundColor: disabled ? colors.surfaceContainerLow + '80' : colors.surfaceContainerHighest + 'CC',
        borderWidth: 1,
        borderColor: disabled ? colors.glassBorder + '80' : colors.glassBorder,
      } as ViewStyle,
    ]}
  >
    {children}
  </View>
);

const FluidGradientButton = ({ 
  colors, 
  children, 
  style, 
  disabled 
}: { 
  colors: ThemeColors; 
  children: React.ReactNode; 
  style?: StyleProp<ViewStyle>; 
  disabled?: boolean 
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!disabled) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        if (!disabled) {
          anim.setValue(0);
        }
      });
    }
  }, [disabled]);

  return (
    <LinearGradient
      colors={[colors.primary, colors.gradientSecondary, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        style,
        { borderRadius: 9999 } as ViewStyle,
      ]}
    >
      <View style={{ flex: 1, borderRadius: 9999 }}>
        {children}
      </View>
    </LinearGradient>
  );
};

const makeVariantStyles = (colors: ThemeColors) => ({
  primary: {},
  glass: {
    backgroundColor: colors.surfaceContainerHighest + 'CC',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fluid: {},
  outline: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  ghost: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  danger: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
});

const makeVariantTextStyles = (colors: ThemeColors) => ({
  primary: { color: colors.surfaceContainerLowest, fontWeight: '700' as const },
  glass: { color: colors.onSurface, fontWeight: '600' as const },
  fluid: { color: colors.surfaceContainerLowest, fontWeight: '700' as const },
  outline: { color: colors.primary, fontWeight: '600' as const },
  ghost: { color: colors.onSurface, fontWeight: '500' as const },
  danger: { color: colors.error, fontWeight: '600' as const },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 9999,
    minHeight: 50,
  },
  gradientBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  text: {
    ...typography.labelSm,
    fontSize: 15,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  iconWrapRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});