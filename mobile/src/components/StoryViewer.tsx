import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { typography, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { MEDIA_URL } from '../config';
import { Avatar } from './Avatar';
import { StoryGroup } from '../services/api';

const STORY_DURATION = 5000;

type StoryViewerProps = {
  groups: StoryGroup[];
  initialIndex: number;
  onClose: () => void;
};

export function StoryViewer({ groups, initialIndex, onClose }: StoryViewerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [groupIndex, setGroupIndex] = useState(Math.max(0, Math.min(initialIndex, groups.length - 1)));
  const [storyIndex, setStoryIndex] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const isAudio = story?.media_type === 'audio';

  useEffect(() => {
    if (!group || !story) return;
    setMediaLoaded(false);
    fade.setValue(0);
    progress.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    if (isAudio) {
      setIsPlaying(false);
      (async () => {
        try {
          await soundRef.current?.unloadAsync();
          soundRef.current = null;
          const { sound } = await Audio.Sound.createAsync(
            { uri: MEDIA_URL(story.media_url) },
            { shouldPlay: true }
          );
          soundRef.current = sound;
          setIsPlaying(true);
          setMediaLoaded(true);
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              advance();
            }
          });
        } catch {
          setMediaLoaded(true);
        }
      })();
      return () => {
        soundRef.current?.unloadAsync().catch(() => {});
        soundRef.current = null;
      };
    }

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        advance();
      }
    });
    return () => anim.stop();
  }, [groupIndex, storyIndex]);

  const advance = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  };

  const goNext = () => advance();

  const togglePlay = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch {}
  };

  const renderMedia = () => {
    if (isAudio) {
      return (
        <View style={styles.audioCard}>
          <Ionicons name="musical-notes" size={48} color={colors.primary} />
          <Text style={styles.audioFileName} numberOfLines={2}>
            {story?.file_name || 'Music story'}
          </Text>
          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        <Image
          source={{ uri: MEDIA_URL(story!.media_url) }}
          style={styles.media}
          resizeMode="contain"
          onLoad={() => setMediaLoaded(true)}
        />
        {!mediaLoaded && (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </>
    );
  };

  if (!group || !story) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#041c2c', '#0a2540', '#0d1b2a']} style={StyleSheet.absoluteFill} />

      {/* Progress bars */}
      <View style={[styles.progressRow, { paddingTop: insets.top + 8 }]}>
        {groups.map((g, gi) => (
          <View key={g.user.id} style={styles.progressTrack}>
            {gi === groupIndex ? (
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.progressFill,
                  { width: gi < groupIndex ? '100%' : '0%' },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* User header */}
      <View style={[styles.userRow, { paddingTop: insets.top + 24 }]}>
        <View style={styles.userInfo}>
          <Avatar uri={group.user.avatar_url} name={group.user.display_name} size={40} />
          <View>
            <Text style={styles.userName}>{group.user.display_name}</Text>
            <Text style={styles.userTime}>
              {timeAgo(story.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Media */}
      <Animated.View style={[styles.mediaWrap, { opacity: fade }]}>
        {renderMedia()}
      </Animated.View>

      {/* Caption */}
      {story.caption ? (
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      ) : null}

      {/* Tap zones */}
      <TouchableOpacity style={styles.leftZone} onPress={goBack} activeOpacity={1} />
      <TouchableOpacity style={styles.rightZone} onPress={goNext} activeOpacity={1} />
    </View>
  );
}

function timeAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#041c2c' },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userName: {
    ...typography.bodyMd,
    color: '#fff',
    fontWeight: '600',
  },
  userTime: {
    ...typography.labelSm,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    ...typography.bodyMd,
  },
  audioCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 24,
    padding: 32,
    maxWidth: '85%',
    gap: 16,
  },
  audioFileName: {
    ...typography.bodyLg,
    color: '#fff',
    textAlign: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  captionWrap: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  caption: {
    ...typography.bodyLg,
    color: '#fff',
    textAlign: 'center',
  },
  leftZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  rightZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
});