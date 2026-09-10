import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';

function Blob({ style, color }: { style: any; color: string }) {
  return (
    <View pointerEvents="none" style={[styles.blobWrap, style]}>
      <LinearGradient
        colors={[color, 'rgba(247,246,251,0)']}
        style={styles.blob}
      />
    </View>
  );
}

export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        style={styles.topWash}
      />
      <Blob style={styles.blobTopRight} color={colors.blobPink} />
      <Blob style={styles.blobMidLeft} color={colors.blobLavender} />
      <Blob style={styles.blobBottomCenter} color={colors.blobGray} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg },
  topWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  blobWrap: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    overflow: 'hidden',
  },
  blob: { flex: 1 },
  blobTopRight: { top: -145, right: -105, opacity: 0.85 },
  blobMidLeft: { top: '24%', left: -160, width: 320, height: 320, borderRadius: 160, opacity: 0.75 },
  blobBottomCenter: { bottom: -175, left: '30%', width: 410, height: 410, borderRadius: 205, opacity: 0.72 },
});