import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle, StyleProp } from 'react-native';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';

type OtpInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  style?: StyleProp<ViewStyle>;
};

export function OtpInput({ value, onChangeText, length = 6, style }: OtpInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  return (
    <View style={[styles.container, style]}>
      {digits.map((d, i) => (
        <View
          key={i}
          style={[
            styles.box,
            focused && i === value.length && styles.boxFocused,
          ]}
        >
          <Text style={styles.digit}>{d}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        caretHidden
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFillCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  digit: {
    ...typography.headlineMd,
    fontSize: 26,
    color: colors.onSurface,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});