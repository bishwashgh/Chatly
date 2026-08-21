import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassButton } from '../components/GlassButton';
import { Navbar } from '../components/Navbar';

const { width } = Dimensions.get('window');

export function HomeScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 200, friction: 25 }),
    ]).start();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  return (
    <AmbientBackground>
      <Navbar
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        scrollY={scrollY}
      />

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <Animated.View style={styles.refreshControl} />
        }
      >
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.heroContent}>
            <LinearGradient
              colors={[colors.primary, colors.gradientSecondary]}
              style={styles.logoRing}
            >
              <View style={styles.logoCircle}>
                <Ionicons name="chatbubble-ellipses" size={56} color={colors.primary} />
              </View>
            </LinearGradient>
            <Text style={styles.heroTitle}>Welcome to Chatly</Text>
            <Text style={styles.heroSubtitle}>
              Fast, secure messaging built for Nepal
            </Text>
            <View style={styles.heroStats}>
              <StatItem label="End-to-End" value="Encrypted" colors={colors} styles={styles} />
              <StatItem label="Offline" value="Ready" colors={colors} styles={styles} />
              <StatItem label="120Hz" value="Smooth" colors={colors} styles={styles} />
            </View>
          </View>
        </Animated.View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Chatly?</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <Animated.View
                key={f.id}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [30 * (i + 1), 0] }) }],
                  },
                ]}
              >
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={28} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.ctaSection}>
          <GlassPanel variant="card" rounded="xl" style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to connect?</Text>
            <Text style={styles.ctaDesc}>Join thousands of users in Nepal</Text>
            <View style={styles.ctaButtons}>
              <GlassButton
                title="Create Account"
                variant="fluid"
                onPress={onSignUp}
                style={styles.ctaBtn}
                icon={<Ionicons name="person-add-outline" size={18} color="#fff" />}
                iconPosition="right"
              />
              <GlassButton
                title="Sign In"
                variant="glass"
                onPress={onSignIn}
                style={[styles.ctaBtn, styles.ctaBtnSecondary]}
              />
            </View>
          </GlassPanel>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with care for Nepal • Secure • Private • Fast
          </Text>
        </View>
      </ScrollView>
    </AmbientBackground>
  );
}

const FEATURES = [
  { id: 1, icon: 'lock-closed-outline' as const, title: 'Private by Default', desc: 'End-to-end encryption on every message and call' },
  { id: 2, icon: 'cloud-outline' as const, title: 'Works Offline', desc: 'Local-first architecture syncs when you\'re back online' },
  { id: 3, icon: 'flash-outline' as const, title: '120Hz Smooth', desc: 'Butter-smooth animations at any refresh rate' },
  { id: 4, icon: 'shield-outline' as const, title: 'Secure Media', desc: 'Photos & files encrypted before upload' },
  { id: 5, icon: 'people-outline' as const, title: 'Groups & Calls', desc: 'Group chats, voice & video calls built-in' },
  { id: 6, icon: 'moon-outline' as const, title: 'True Dark Mode', desc: 'System-aware theming with OLED-friendly blacks' },
];

function StatItem({ label, value, colors, styles }: { label: string; value: string; colors: ThemeColors; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.statItem, { borderColor: colors.glassBorder }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.stackXl,
  },
  refreshControl: {
    height: 60,
  },
  hero: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 100,
    paddingBottom: spacing.stackLg,
    alignItems: 'center',
  },
  heroContent: {
    width: '100%',
    alignItems: 'center',
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 48,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...typography.headlineLg,
    color: colors.onBackground,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackLg,
    lineHeight: 26,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.stackMd,
    flexWrap: 'wrap',
  },
  statItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerHighest + '60',
    borderWidth: 1,
    borderRadius: 16,
  },
  statValue: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.stackLg,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.onBackground,
    fontWeight: '700',
    marginBottom: spacing.stackMd,
  },
  featuresGrid: {
    gap: spacing.gutter,
  },
  featureCard: {
    flex: 1,
    minWidth: (width - spacing.gutter * 3) / 2,
    padding: 20,
    backgroundColor: colors.surfaceContainerHighest + '40',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    ...typography.bodyMd,
    color: colors.onBackground,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.stackXl,
  },
  ctaCard: {
    padding: spacing.stackLg,
    alignItems: 'center',
  },
  ctaTitle: {
    ...typography.headlineMd,
    color: colors.onBackground,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackMd,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  ctaBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 14,
  },
  ctaBtnSecondary: {
    minWidth: 120,
  },
  footer: {
    paddingVertical: spacing.stackXl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});