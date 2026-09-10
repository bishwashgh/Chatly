import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { BrandMark } from './BrandMark';
import { AmbientBackground } from './AmbientBackground';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const opacity = useSharedValue(0);
  const y = useSharedValue(22);
  useEffect(() => { opacity.value = withDelay(80, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })); y.value = withDelay(80, withTiming(0, { duration: 450 })); }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#000' : colors.bg }]}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.card, isDark && styles.cardDark, style]}>
          <BrandMark size={68} />
          <Text style={styles.brand}>Chatly</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  field: { width: '100%', minHeight: 52, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.borderSoft, marginTop: spacing.sm },
  button: { width: '100%', minHeight: 52, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', fontSize: 13, marginTop: spacing.md },
});

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  card: { width: '100%', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.xl, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.98)', ...shadows.lg },
  cardDark: { backgroundColor: 'rgba(28,28,30,0.96)', borderColor: 'rgba(255,255,255,0.14)' },
  brand: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 8 }, title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', textAlign: 'center', marginTop: 28 }, subtitle: { color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 9, marginBottom: 8 },
});
