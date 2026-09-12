import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../lib/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Trailing icon, e.g. an arrow. */
  icon?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * The app's main call to action.
 *
 * Deliberately heavy: a tall filled gradient pill with an elevation shadow, a
 * top highlight and a press animation, so it can never be mistaken for a line
 * of coloured text. Used for every primary action in the auth flow.
 */
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  style,
}: PrimaryButtonProps) {
  const inactive = Boolean(disabled) || Boolean(loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.wrapper,
        style,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View pointerEvents="none" style={styles.highlight} />
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.content}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            {icon}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: gradients.primary[0],
    shadowColor: '#004D1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});
