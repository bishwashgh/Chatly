import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useQuery, useSubscription } from '@apollo/client';
import {
  MY_CONVERSATIONS_QUERY,
  CONVERSATION_UPDATED_SUBSCRIPTION,
} from '../graphql/conversations.gql';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { colors, spacing } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import { FloatingDock, DockTab } from '../components/FloatingDock';
import { ConversationsScreen } from './ConversationsScreen';
import { FriendsScreen } from './FriendsScreen';

export function MainScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();

  // Determine initial tab from route params or route name
  const initialTab: DockTab =
    route?.params?.initialTab ?? (route?.name === 'Friends' ? 'friends' : 'chats');
  const [activeTab, setActiveTab] = useState<DockTab>(initialTab);

  // 0 = chats, 1 = friends
  const progress = useSharedValue(initialTab === 'friends' ? 1 : 0);

  const handleTabChange = useCallback(
    (tab: DockTab) => {
      setActiveTab(tab);
      progress.value = withTiming(tab === 'friends' ? 1 : 0, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    },
    [progress]
  );

  // Sync with route params if passed
  useEffect(() => {
    if (route?.params?.initialTab && route.params.initialTab !== activeTab) {
      handleTabChange(route.params.initialTab);
    }
  }, [route?.params?.initialTab, activeTab, handleTabChange]);

  // Query conversation unread counts for dock badge
  const { data, refetch } = useQuery(MY_CONVERSATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  // Refresh the inbox the moment a message arrives in any conversation, so
  // badges and previews no longer need a thread switch (or polling) to update.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useSubscription(CONVERSATION_UPDATED_SUBSCRIPTION, {
    variables: { userId: currentUser?.id ?? '' },
    skip: !currentUser?.id,
    onData: () => {
      // Coalesce bursts (e.g. a fast back-and-forth) into one refetch.
      if (refetchTimerRef.current) return;
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null;
        refetch().catch(() => {});
      }, 750);
    },
  });

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, []);

  const unreadTotal = (data?.myConversations ?? []).reduce(
    (acc: number, c: any) => acc + (c.unreadCount ?? 0),
    0
  );

  const chatsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.65, 1], [1, 0, 0]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, -width * 0.18]) }],
    zIndex: progress.value < 0.5 ? 1 : 0,
  }));

  const friendsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [width * 0.18, 0]) }],
    zIndex: progress.value >= 0.5 ? 1 : 0,
  }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      {/* 1. FIXED TOP HEADER: Never flickers or re-mounts */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/chatly_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>Chatly</Text>
        </View>

        {/* Top-Right Profile Avatar: shows user's actual photo */}
        <Pressable
          style={styles.headerProfileBtn}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => navigation.navigate('Settings')}
        >
          <Avatar
            uri={currentUser?.avatarUrl}
            name={currentUser?.name || currentUser?.username}
            size={36}
            isOnline
            showRing
          />
        </Pressable>
      </View>

      {/* 2. SMOOTH ANIMATED PAGE CONTENT */}
      <View style={styles.contentArea}>
        <Animated.View
          style={[styles.pane, chatsAnimatedStyle]}
          pointerEvents={activeTab === 'chats' ? 'auto' : 'none'}
        >
          <ConversationsScreen navigation={navigation} hideHeader hideDock />
        </Animated.View>

        <Animated.View
          style={[styles.pane, friendsAnimatedStyle]}
          pointerEvents={activeTab === 'friends' ? 'auto' : 'none'}
        >
          <FriendsScreen navigation={navigation} hideHeader hideDock />
        </Animated.View>
      </View>

      {/* 3. FIXED BOTTOM FLOATING DOCK: Zero gap to mobile navbar */}
      <FloatingDock
        active={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadTotal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1B1F',
    letterSpacing: -0.3,
  },
  headerProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  pane: {
    ...StyleSheet.absoluteFillObject,
  },
  textDark: {
    color: '#F1F0F5',
  },
});
