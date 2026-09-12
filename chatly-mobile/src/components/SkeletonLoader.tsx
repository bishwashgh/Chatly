import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radii } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

/**
 * Placeholder loaders shaped like the content that is coming.
 *
 * Mirrors the `animate-pulse` design: a 48px circle next to two stacked
 * 20px-tall bars (112px and 144px wide) that fade between full and half
 * opacity. Tailwind's pulse is 1 -> .5 -> 1 over 2s, so this runs a 1s timing
 * and lets Reanimated reverse it.
 */
const PULSE_MS = 1000;

function usePulseStyle() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

type SkeletonRowProps = {
  /** Diameter of the leading circle. */
  avatarSize?: number;
  style?: ViewStyle;
};

/** One placeholder contact/conversation row. */
export function SkeletonRow({ avatarSize = 48, style }: SkeletonRowProps) {
  const pulse = usePulseStyle();
  const { isDark } = useTheme();
  const blockColor = isDark ? styles.blockDark : styles.block;

  return (
    <Animated.View style={[styles.row, pulse, style]}>
      <View
        style={[
          blockColor,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      />
      <View style={styles.lines}>
        <View style={[blockColor, styles.line, styles.lineShort]} />
        <View style={[blockColor, styles.line, styles.lineLong]} />
      </View>
    </Animated.View>
  );
}

/** A stack of placeholder rows. */
export function SkeletonList({
  count = 5,
  avatarSize,
  style,
}: {
  count?: number;
  avatarSize?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={style} accessibilityLabel="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonRow
          key={index}
          avatarSize={avatarSize}
          style={index > 0 ? styles.rowSpacing : undefined}
        />
      ))}
    </View>
  );
}

/**
 * Placeholder for a message thread. Same pulse, but messages alternate sides
 * and have no avatar, so the row shape above would be misleading.
 */
export function SkeletonMessages({
  count = 6,
  style,
}: {
  count?: number;
  style?: ViewStyle;
}) {
  const pulse = usePulseStyle();
  const { isDark } = useTheme();
  const blockColor = isDark ? styles.blockDark : styles.block;

  return (
    <View style={style} accessibilityLabel="Loading">
      {Array.from({ length: count }).map((_, index) => {
        const mine = index % 3 === 1;
        return (
          <Animated.View
            key={index}
            style={[
              styles.bubbleRow,
              mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
              pulse,
            ]}
          >
            <View
              style={[
                blockColor,
                styles.bubble,
                mine ? styles.bubbleMine : styles.bubbleTheirs,
              ]}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // bg-gray-300 / a matching tone for dark mode
  block: {
    backgroundColor: '#D1D5DB',
  },
  blockDark: {
    backgroundColor: '#3A3B40',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  rowSpacing: {
    marginTop: 16,
  },
  lines: {
    flex: 1,
    gap: 8, // gap-2
  },
  // h-5 rounded-full, w-28 and w-36 respectively
  line: {
    height: 20,
    borderRadius: radii.full,
  },
  lineShort: {
    width: 112,
    maxWidth: '80%',
  },
  lineLong: {
    width: 144,
    maxWidth: '95%',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    height: 38,
    borderRadius: 18,
    marginVertical: 6,
  },
  bubbleTheirs: {
    width: '62%',
  },
  bubbleMine: {
    width: '48%',
  },
});
