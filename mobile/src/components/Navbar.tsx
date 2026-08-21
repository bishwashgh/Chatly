import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { GlassButton } from './GlassButton';

type NavbarProps = {
  onSignIn: () => void;
  onSignUp: () => void;
  scrollY?: Animated.Value;
  title?: string;
};

export function Navbar({ onSignIn, onSignUp, scrollY, title = 'Chatly' }: NavbarProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const y = useRef(scrollY ?? new Animated.Value(0)).current;
  const opacity = y.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.8, 0.4],
    extrapolate: 'clamp',
  });
  const bgOpacity = y.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [0.1, 0.5, 0.9],
    extrapolate: 'clamp',
  });

  const titleScale = y.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={styles.container}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.surfaceContainerLowest,
            opacity: bgOpacity,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.glassBorder,
          },
        ]}
      />
      <View
        style={[
          styles.blurLayer,
          { opacity: bgOpacity },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Animated.View style={{ transform: [{ scale: titleScale }] }}>
              <Text style={styles.title}>{title}</Text>
            </Animated.View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onSignIn}
                activeOpacity={0.7}
                style={styles.actionButton}
              >
                <Ionicons name="log-in-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <GlassButton
                title="Sign in"
                variant="glass"
                onPress={onSignIn}
                style={styles.signInBtn}
              />
              <GlassButton
                title="Get Started"
                variant="fluid"
                onPress={onSignUp}
                style={styles.signUpBtn}
                icon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
                iconPosition="right"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    height: 56 + (Platform.OS === 'ios' ? 24 : 0),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerLowest + '80',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: Platform.OS === 'ios' ? 28 : 16,
    paddingBottom: 12,
    height: 56 + (Platform.OS === 'ios' ? 24 : 0),
  },
  title: {
    ...typography.headlineMd,
    color: colors.onBackground,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest + 'CC',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
  },
  signUpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 120,
  },
});