import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type AmbientBackgroundProps = ViewProps & {
  orbs?: boolean;
};

// Light, clean background with a whisper of soft blue glow
export function AmbientBackground({ style, orbs = true, children, ...props }: AmbientBackgroundProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={[colors.surfaceContainerLow, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      {orbs && (
        <>
          {/* Soft blue glow - top left */}
          <View
            style={[
              styles.orb,
              {
                top: -120,
                left: -100,
                width: 320,
                height: 320,
                backgroundColor: 'rgba(0, 132, 255, 0.05)',
              },
            ]}
          />
          {/* Soft cyan glow - bottom right */}
          <View
            style={[
              styles.orb,
              {
                bottom: -140,
                right: -100,
                width: 340,
                height: 340,
                backgroundColor: 'rgba(0, 178, 255, 0.04)',
              },
            ]}
          />
          {/* Gentle green glow - drifting */}
          <View
            style={[
              styles.orb,
              {
                top: '40%',
                right: -80,
                width: 220,
                height: 220,
                backgroundColor: 'rgba(49, 162, 76, 0.03)',
              },
            ]}
          />
        </>
      )}
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
});