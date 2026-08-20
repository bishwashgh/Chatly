import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { MEDIA_URL } from '../config';

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
  online?: boolean;
};

export function Avatar({ uri, name, size = 48, style, gradient = false, online }: AvatarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[{ width: size, height: size }, style]}>
      {gradient ? (
        <LinearGradient
          colors={[colors.primary, colors.gradientSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 2, borderRadius: size / 2 }}
        >
          <InnerAvatar uri={uri} name={name} initials={initials} size={size} />
        </LinearGradient>
      ) : (
        <InnerAvatar uri={uri} name={name} initials={initials} size={size} />
      )}

      {online !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: online ? colors.success : colors.outline,
              borderColor: colors.background,
            },
          ]}
        />
      )}
    </View>
  );
}

function InnerAvatar({ uri, name, initials, size }: { uri?: string | null; name?: string; initials: string; size: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (uri) {
    return (
      <Image
        source={{ uri: MEDIA_URL(uri) }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={[colors.primary, colors.gradientSecondary]}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View style={styles.initialsWrap}>
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initialsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Manrope',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});