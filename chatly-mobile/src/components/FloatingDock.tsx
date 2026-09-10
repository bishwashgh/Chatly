import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, UsersRound } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../lib/theme';

export type DockTab = 'chats' | 'friends';
const TABS: { key: DockTab; label: string; Icon: any }[] = [
  { key: 'chats', label: 'Chats', Icon: MessageCircle },
  { key: 'friends', label: 'Friends', Icon: UsersRound },
];

export function FloatingDock({ active, navigation }: { active: DockTab; navigation: any }) {
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
            <Icon size={23} color={isActive ? '#FFFFFF' : colors.dockInactive} strokeWidth={isActive ? 2.5 : 1.9} />
            {isActive && <Text style={styles.label}>{label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radii.full,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
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
  tabActive: { backgroundColor: colors.primary, ...shadows.sm },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
});
