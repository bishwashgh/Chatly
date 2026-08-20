import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type IncomingCallOverlayProps = {
  callType: 'audio' | 'video';
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallOverlay({ callType, callerName, onAccept, onDecline }: IncomingCallOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation (add a ringtone mp3 to assets/ringtone.mp3 and it will auto-play)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <LinearGradient
      colors={['#0f1a2e', '#0a1220', '#060b14']}
      style={styles.container}
    >
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.content}>
        <View style={styles.topInfo}>
          <Text style={styles.callingLabel}>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</Text>
        </View>

        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={[colors.primary, colors.gradientSecondary]}
            style={styles.avatarRing}
          >
            <View style={styles.avatarCircle}>
              <Ionicons
                name={callType === 'video' ? 'videocam' : 'call'}
                size={48}
                color={colors.primary}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.statusText}>Calling on Chatly...</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.8}>
            <Ionicons name="call" size={30} color={colors.error} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
            <Ionicons name="call" size={30} color={colors.surfaceContainerLowest} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Ringing...</Text>
      </View>
    </LinearGradient>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orb1: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 132, 255, 0.14)',
  },
  orb2: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 178, 255, 0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  topInfo: {
    position: 'absolute',
    top: 80,
    alignItems: 'center',
  },
  callingLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  avatarWrap: {
    marginBottom: 24,
  },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 12,
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 67,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerName: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: 'center',
    fontSize: 28,
  },
  statusText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 48,
    marginTop: 64,
  },
  declineButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  acceptButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  hint: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 24,
    opacity: 0.7,
  },
});