import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

export function TypingIndicator() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.glassFillStrong,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurface,
    opacity: 0.7,
  },
});