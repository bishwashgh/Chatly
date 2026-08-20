import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, ThemeColors } from '../theme';
import { GlassPanel } from './GlassPanel';
import { useTheme } from '../store/themeStore';

export type TabKey = 'messages' | 'groups' | 'discover' | 'profile';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
  { key: 'groups', label: 'Groups', icon: 'people-outline', activeIcon: 'people' },
  { key: 'discover', label: 'People', icon: 'person-add-outline', activeIcon: 'person-add' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

type BottomNavProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { bottom: insets.bottom + 16 }]}>
      <GlassPanel variant="panel" rounded="pill" style={styles.nav}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={26}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </GlassPanel>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.marginMain,
    right: spacing.marginMain,
    zIndex: 50,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});