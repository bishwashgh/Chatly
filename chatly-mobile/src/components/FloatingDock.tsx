import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Users } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export type DockTab = 'chats' | 'friends';

const TABS: { key: DockTab; label: string; Icon: any }[] = [
  { key: 'chats', label: 'Chats', Icon: MessageSquare },
  { key: 'friends', label: 'Friends', Icon: Users },
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

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView
        intensity={85}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.dockBar, isDark && styles.dockBarDark]}
      >
        <View style={styles.tabsRow}>
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.tabButton,
                  isActive && (isDark ? styles.tabButtonActiveDark : styles.tabButtonActive),
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate(key === 'chats' ? 'Conversations' : 'Friends');
                }}
              >
                <View style={styles.iconWrap}>
                  <Icon
                    size={22}
                    color={isActive ? (isDark ? '#72FE88' : colors.primary) : (isDark ? '#8E9A8C' : '#6D7B6B')}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  {key === 'chats' && unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? (isDark ? styles.tabLabelActiveDark : styles.tabLabelActive) : styles.tabLabelInactive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
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
    backgroundColor: 'rgba(250, 249, 254, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 27, 31, 0.06)',
    paddingTop: 8,
    paddingBottom: 4,
    ...shadows.dock,
  },
  dockBarDark: {
    backgroundColor: 'rgba(18, 19, 22, 0.94)',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    width: 86,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(114, 254, 136, 0.22)',
  },
  tabButtonActiveDark: {
    backgroundColor: 'rgba(114, 254, 136, 0.16)',
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
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelActiveDark: {
    color: '#72FE88',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#6D7B6B',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
