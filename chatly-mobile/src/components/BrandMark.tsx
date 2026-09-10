import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, UsersRound } from 'lucide-react-native';
import { gradients, radii, shadows } from '../lib/theme';

export function BrandMark({ size = 88 }: { size?: number }) {
  return (
    <LinearGradient
      colors={gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3 }]}
    >
      <MessageCircle size={size * 0.46} color="#fff" strokeWidth={2.4} />
      <View style={[styles.friend, { width: size * 0.28, height: size * 0.2, right: size * 0.12, bottom: size * 0.19, borderRadius: size * 0.12 }]}>
        <UsersRound size={size * 0.18} color="#fff" strokeWidth={2.8} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', ...shadows.md },
  friend: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
});
