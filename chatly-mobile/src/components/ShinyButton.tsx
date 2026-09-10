import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { gradients, shadows } from '../lib/theme';

type ShinyButtonProps = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export function ShinyButton({ label, onPress, style, disabled }: ShinyButtonProps) {
  const glow = useSharedValue(0.52);
  const shineX = useSharedValue(-90);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.48, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    shineX.value = withRepeat(
      withSequence(
        withTiming(390, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-90, { duration: 400 }),
      ),
      -1,
      false,
    );
  }, [glow, shineX]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shineX.value }, { rotate: '20deg' }] }));

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} />
          <View style={styles.highlight} />
          {disabled ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.label}>{label}</Text>}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', position: 'relative' },
  glow: {
    position: 'absolute',
    top: -9,
    bottom: -9,
    left: -9,
    right: -9,
    borderRadius: 999,
    backgroundColor: '#A68BFF',
    shadowColor: '#8D6CF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 12,
  },
  btn: { width: '100%', borderRadius: 999, overflow: 'hidden', ...shadows.md },
  gradient: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 38, backgroundColor: 'rgba(255,255,255,0.28)' },
  highlight: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.62)' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  disabled: { opacity: 0.62 },
  label: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
});
