import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, TextStyle, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, ThemeColors } from '../theme';
import { GlassPanel } from './GlassPanel';
import { useTheme } from '../store/themeStore';

type GlassInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  multiline?: boolean;
  style?: TextStyle;
  textAlign?: 'left' | 'center' | 'right';
};

export function GlassInput({
  value,
  onChangeText,
  placeholder,
  icon,
  secure,
  keyboardType,
  autoCapitalize,
  onSubmitEditing,
  multiline,
  style,
  textAlign,
}: GlassInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <GlassPanel variant="panel" rounded="default" style={styles.container}>
      {icon && <Ionicons name={icon} size={20} color={colors.onSurfaceVariant} style={styles.icon} />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant + '80'}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        style={[styles.input, style]}
        textAlign={textAlign}
      />
    </GlassPanel>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    ...typography.bodyMd,
    paddingVertical: 0,
  },
});