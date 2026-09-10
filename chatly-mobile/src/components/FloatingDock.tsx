import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MessageCircle, UsersRound } from 'lucide-react-native';
import { colors, gradients, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type DockTab = 'chats' | 'friends';
const TABS: { key: DockTab; label: string; Icon: any }[] = [
  { key: 'chats', label: 'Chats', Icon: MessageCircle },
  { key: 'friends', label: 'Friends', Icon: UsersRound },
];

export function FloatingDock({
  active,
  navigation,
  unreadCount = 0,
}: {
  active: DockTab;
  navigation: any;
  unreadCount?: number;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [dockWidth, setDockWidth] = useState(0);

  const activeIndex = active === 'chats' ? 0 : 1;
  const highlightX = useSharedValue(activeIndex);

  React.useEffect(() => {
    highlightX.value = withSpring(activeIndex, { damping: 16, stiffness: 180, mass: 0.7 });
  }, [activeIndex, highlightX]);

  const tabWidth = dockWidth > 10 ? (dockWidth - 10) / 2 : 100;

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highlightX.value * tabWidth }],
    width: tabWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setDockWidth(e.nativeEvent.layout.width);
  };

  const bottom = Math.max(insets.bottom, 10) + 8;

  return (
    <BlurView
      intensity={72}
      tint={isDark ? 'dark' : 'light'}
      style={[styles.dock, isDark && styles.dockDark, { bottom }]}
      onLayout={onLayout}
    >
      <Animated.View pointerEvents="none" style={[styles.slidingHighlight, highlightStyle]}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHighlight}
        />
      </Animated.View>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.tab, isActive && styles.tabActive, pressed && styles.pressed]}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate(key === 'chats' ? 'Conversations' : 'Friends');
            }}
          >
            <View style={styles.iconWrap}>
              <Icon
                size={23}
                color={isActive ? '#FFFFFF' : colors.dockInactive}
                strokeWidth={isActive ? 2.5 : 1.9}
              />
              {key === 'chats' && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            {isActive && <Text style={styles.label}>{label}</Text>}
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: '17%',
    right: '17%',
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: radii.full,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    ...shadows.dock,
  },
  tab: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radii.full,
  },
  dockDark: { backgroundColor: 'rgba(28,28,30,0.78)', borderColor: 'rgba(255,255,255,0.14)' },
  tabActive: { backgroundColor: 'transparent' },
  slidingHighlight: {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.sm,
  },
  gradientHighlight: {
    flex: 1,
    borderRadius: radii.full,
  },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
});
