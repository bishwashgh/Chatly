import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, UserPlus } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../lib/theme';

export type DockTab = 'chats' | 'friends';

const TABS: { key: DockTab; label: string; Icon: any }[] = [
  { key: 'chats', label: 'Chats', Icon: MessageCircle },
  { key: 'friends', label: 'Friends', Icon: UserPlus },
];

const DOCK_HEIGHT = 60;

type FloatingDockProps = { active: DockTab; navigation: any };

export function FloatingDock({ active, navigation }: FloatingDockProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10) + 8;

  return (
    <View style={[styles.dock, { bottom }]}>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.tab, isActive && styles.tabActive, pressed && styles.pressed]}
            onPress={() => navigation.navigate(key === 'chats' ? 'Conversations' : 'Friends')}
          >
            <Icon size={19} color={isActive ? '#FFFFFF' : colors.dockInactive} strokeWidth={isActive ? 2.5 : 2} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: DOCK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(23,21,33,0.94)',
    borderRadius: radii.xl,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...shadows.dock,
  },
  tab: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  tabActive: { backgroundColor: colors.dockActive, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  label: { color: colors.dockInactive, fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#FFFFFF', fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
