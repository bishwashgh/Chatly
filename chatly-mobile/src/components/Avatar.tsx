import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../lib/theme';

type AvatarProps = {
  uri?: string;
  name?: string;
  size?: number;
  isOnline?: boolean;
  showRing?: boolean;
};

export function Avatar({ uri, name, size = 48, isOnline, showRing }: AvatarProps) {
  const initials = (name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fallback = (
    <LinearGradient colors={gradients.primary} style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </LinearGradient>
  );

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      transition={150}
    />
  ) : fallback;

  return (
    <View style={{ width: size, height: size }}>
      {showRing ? (
        <LinearGradient
          colors={gradients.primary}
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <View style={[styles.ringInner, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
            {inner}
          </View>
        </LinearGradient>
      ) : (
        inner
      )}
      {isOnline && (
        <View
          style={[
            styles.dot,
            { width: Math.max(9, size * 0.25), height: Math.max(9, size * 0.25), borderRadius: size * 0.14, right: -1, bottom: -1 },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '800', letterSpacing: 0.2 },
  ring: { padding: 2, alignItems: 'center', justifyContent: 'center' },
  ringInner: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dot: {
    position: 'absolute',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
