import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { colors, radii, shadows } from '../lib/theme';

const BAR_COUNT = 24;

type VoiceMessagePlayerProps = {
  uri: string;
  durationMs?: number;
};

export function VoiceMessagePlayer({ uri, durationMs = 0 }: VoiceMessagePlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationMs);
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => 6 + Math.random() * 18),
    [],
  );

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setProgress(status.positionMillis / status.durationMillis);
    }
    if (status.didJustFinish) {
      setProgress(0);
      setIsPlaying(false);
    }
  };

  const togglePlayback = async () => {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, onStatusUpdate);
      soundRef.current = sound;
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const activeBars = Math.round(progress * BAR_COUNT);
  const shownDuration = Math.max(1, Math.round(duration / 1000));

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlayback} style={styles.playBtn}>
        {isPlaying ? <Pause size={15} color="#fff" /> : <Play size={15} color="#fff" />}
      </Pressable>
      <View style={styles.waveform}>
        {barHeights.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { height, backgroundColor: index < activeBars ? colors.primary : 'rgba(124,58,237,0.16)' },
            ]}
          />
        ))}
      </View>
      <Text style={styles.duration}>{shownDuration}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    minWidth: 190,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  bar: { width: 3, borderRadius: 2 },
  duration: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
});