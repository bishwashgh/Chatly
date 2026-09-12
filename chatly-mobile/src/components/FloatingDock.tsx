import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Users } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type DockTab = 'chats' | 'friends';

const TABS: { key: DockTab; label: string; Icon: any }[] = [
  { key: 'chats', label: 'Chats', Icon: MessageSquare },
  { key: 'friends', label: 'Friends', Icon: Users },
];

const SELECT_DURATION = 300;
const PARTICLE_DURATION = 500;
const PARTICLE_TRAVEL = 10;

/**
 * The two dots that fly out of the selected segment and fade away, matching the
 * `::before` / `::after` particles in the design: opacity 0 -> 1 at the halfway
 * point -> 0, while translating outwards by 10px.
 */
function SelectionParticles({ active, color }: { active: boolean; color: string }) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: PARTICLE_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, [active, progress]);

  const fade = (p: number) => (p < 0.5 ? p * 2 : (1 - p) * 2);

  const topStyle = useAnimatedStyle(() => ({
    opacity: fade(progress.value),
    transform: [{ translateY: -PARTICLE_TRAVEL * progress.value }],
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: fade(progress.value),
    transform: [{ translateY: PARTICLE_TRAVEL * progress.value }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.particle, styles.particleTop, { backgroundColor: color }, topStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.particle, styles.particleBottom, { backgroundColor: color }, bottomStyle]}
      />
    </>
  );
}

function DockSegment({
  label,
  Icon,
  isActive,
  isDark,
  unreadCount = 0,
  onPress,
}: {
  label: string;
  Icon: any;
  isActive: boolean;
  isDark: boolean;
  unreadCount?: number;
  onPress: () => void;
}) {
  // The `select` keyframes from the design: 0.95 -> 1.05 -> 1.
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isActive) return;
    scale.value = withSequence(
      withTiming(0.95, { duration: 0 }),
      withTiming(1.05, { duration: SELECT_DURATION / 2, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: SELECT_DURATION / 2, easing: Easing.in(Easing.quad) }),
    );
  }, [isActive, scale]);

  const selectStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const iconColor = isActive
    ? isDark
      ? '#72FE88'
      : colors.primary
    : isDark
      ? '#8E9A8C'
      : '#334155';

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <Animated.View
        style={[
          styles.pill,
          isActive && (isDark ? styles.pillActiveDark : styles.pillActive),
          isActive && selectStyle,
        ]}
      >
        {isActive && (
          <SelectionParticles active color={isDark ? '#72FE88' : colors.primary} />
        )}

        <View style={styles.iconWrap}>
          <Icon size={20} color={iconColor} strokeWidth={isActive ? 2.5 : 1.9} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.label,
            isActive
              ? isDark
                ? styles.labelActiveDark
                : styles.labelActive
              : isDark
                ? styles.labelInactiveDark
                : styles.labelInactive,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingDock({
  active,
  navigation,
  onTabChange,
  unreadCount = 0,
}: {
  active: DockTab;
  navigation?: any;
  onTabChange?: (tab: DockTab) => void;
  unreadCount?: number;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const handlePress = (key: DockTab) => {
    if (key === active) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onTabChange) {
      onTabChange(key);
    } else if (navigation) {
      navigation.navigate(key === 'chats' ? 'Conversations' : 'Friends');
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView
        intensity={95}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.dockBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
          isDark && styles.dockBarDark,
        ]}
      >
        {/* Segmented track: 1px ring, inset padding, sliding filled pill. */}
        <View style={[styles.track, isDark && styles.trackDark]}>
          {TABS.map(({ key, label, Icon }) => (
            <DockSegment
              key={key}
              label={label}
              Icon={Icon}
              isActive={active === key}
              isDark={isDark}
              unreadCount={key === 'chats' ? unreadCount : 0}
              onPress={() => handlePress(key)}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  dockBar: {
    backgroundColor: 'rgba(250, 249, 254, 0.90)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  dockBarDark: {
    backgroundColor: 'rgba(18, 19, 22, 0.92)',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.md,
    backgroundColor: '#EEEEEE',
    padding: 4,
    // box-shadow: 0 0 0 1px rgba(0,0,0,0.06)
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  trackDark: {
    backgroundColor: '#24252A',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  option: {
    flex: 1,
    borderRadius: radii.md,
  },
  optionPressed: {
    opacity: 0.75,
  },
  pill: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pillActiveDark: {
    backgroundColor: '#3A3B40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  particle: {
    position: 'absolute',
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  particleTop: {
    top: 4,
  },
  particleBottom: {
    bottom: 4,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
  },
  labelActive: {
    color: '#1A1B1F',
    fontWeight: '700',
  },
  labelActiveDark: {
    color: '#F1F0F5',
    fontWeight: '700',
  },
  labelInactive: {
    color: '#334155',
    fontWeight: '500',
  },
  labelInactiveDark: {
    color: '#8E9A8C',
    fontWeight: '500',
  },
});
