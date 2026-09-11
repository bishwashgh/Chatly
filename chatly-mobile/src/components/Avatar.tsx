import React, { useState, useEffect } from 'react';
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
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const innerSize = showRing ? size - 4 : size;

  const fallback = (
    <LinearGradient colors={gradients.primary} style={[styles.fallback, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
      <Text style={[styles.initials, { fontSize: innerSize * 0.36 }]}>{initials}</Text>
    </LinearGradient>
  );

  const showImage = Boolean(uri && !imageError);

  const inner = showImage ? (
    <Image
      source={{ uri }}
      style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}
      contentFit="cover"
      transition={150}
      onError={() => setImageError(true)}
    />
  ) : fallback;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {showRing ? (
        <LinearGradient
          colors={gradients.primary}
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <View style={[styles.ringInner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
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
            {
              width: Math.max(10, size * 0.28),
              height: Math.max(10, size * 0.28),
              borderRadius: Math.max(5, size * 0.14),
              right: -1,
              bottom: -1,
            },
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
