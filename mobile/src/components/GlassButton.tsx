import React, { useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, ThemeColors, spacing } from '../theme';
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
  fullWidth?: boolean;
};

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
  icon,
  iconPosition = 'left',
  fullWidth = false,
}: GlassButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const variantStyles = useMemo(() => makeVariantStyles(colors), [colors]);
  const variantTextStyles = useMemo(() => makeVariantTextStyles(colors), [colors]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(rippleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 18 }),
        Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(rippleAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const isFluid = variant === 'fluid';
  const isGlass = variant === 'glass';

  const renderContent = () => (
    <Animated.View
      style={[
        styles.container,
        variantStyles[variant],
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.ripple,
          {
            opacity: rippleAnim,
            transform: [{ scale: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }],
          },
        ]}
      />
      {icon && iconPosition === 'left' && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.text, variantTextStyles[variant]]}>{title}</Text>
      {icon && iconPosition === 'right' && <View style={styles.iconWrapRight}>{icon}</View>}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowAnim,
          },
        ]}
      />
    </Animated.View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { marginHorizontal: spacing.gutter }]}
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
            fullWidth && styles.fullWidth,
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
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
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
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const width = useRef(0);
  
  useEffect(() => {
    if (!disabled) {
      const loop = () => {
        shimmerAnim.setValue(0);
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start(() => {
          if (!disabled) loop();
        });
      };
      loop();
    }
  }, [disabled]);

  const shimmerPos = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-100, 0, 100], // Use pixel values, not percentages
  });

  return (
    <View style={[style, { borderRadius: 9999, overflow: 'hidden' }]}>
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
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: 9999 },
          {
            backgroundColor: 'rgba(255,255,255,0.3)',
            transform: [{ translateX: shimmerPos }],
          },
        ]}
      />
    </View>
  );
};

const makeVariantStyles = (colors: ThemeColors) => ({
  primary: {},
  glass: {
    backgroundColor: colors.surfaceContainerHighest + 'CC',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  fluid: {},
  outline: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 1.5,
    borderColor: colors.primary + '66',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  ghost: {
    backgroundColor: colors.surfaceContainerLow + '80',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  danger: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1.5,
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
});

const makeVariantTextStyles = (colors: ThemeColors) => ({
  primary: { color: colors.surfaceContainerLowest, fontWeight: '700' as const },
  glass: { color: colors.onSurface, fontWeight: '600' as const, letterSpacing: 0.2 },
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
    position: 'relative',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
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
    zIndex: 1,
  },
  iconWrap: {
    marginRight: 8,
    zIndex: 1,
  },
  iconWrapRight: {
    marginLeft: 8,
    zIndex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});