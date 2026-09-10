import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, ChevronLeft } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export function AuthLayout({
  title,
  subtitle,
  children,
  onBack,
  heroIcon,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
  heroIcon?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      {/* Top Fixed Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
              <ChevronLeft size={22} color={isDark ? '#F1F0F5' : colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/chatly_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={[styles.brandTitle, isDark && styles.textDark]}>Chatly</Text>
            </View>
          )}
        </View>
        <View style={styles.profileBadge}>
          <User size={18} color="#FFFFFF" strokeWidth={2.2} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Hero Icon Area */}
          {heroIcon && <View style={styles.heroWrap}>{heroIcon}</View>}

          <Text style={[styles.title, isDark && styles.textDark]}>{title}</Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{subtitle}</Text>

          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(26, 27, 31, 0.06)',
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  cardDark: {
    backgroundColor: '#1A1B1F',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3D4A3C',
    marginBottom: 6,
  },
  fieldLabelDark: {
    color: '#C2CEC0',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F4F3F8',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapDark: {
    backgroundColor: '#24252A',
  },
  inputWrapFocused: {
    borderColor: 'rgba(0, 110, 40, 0.5)',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1B1F',
  },
  inputDark: {
    color: '#F1F0F5',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    width: '100%',
    height: 48,
    borderRadius: radii.md,
    backgroundColor: '#F4F3F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(227, 226, 231, 0.5)',
  },
  googleButtonDark: {
    backgroundColor: '#24252A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  googleButtonText: {
    color: '#1A1B1F',
    fontSize: 15,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E3E2E7',
  },
  dividerText: {
    fontSize: 13,
    color: '#6D7B6B',
    fontWeight: '400',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    fontSize: 14,
    color: '#3D4A3C',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  securityBadgeText: {
    fontSize: 12,
    color: '#6D7B6B',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1A1B1F',
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1B1F',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#3D4A3C',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  textDark: {
    color: '#F1F0F5',
  },
  subtitleDark: {
    color: '#C2CEC0',
  },
});
