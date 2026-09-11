import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isPreparingRef = useRef(false);
  const cancelRequestedRef = useRef(false);

  const resetState = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setDurationMillis(0);
  }, []);

  const restoreAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      // Audio mode cleanup should not block the next recording.
    }
  }, []);

  useEffect(() => {
    return () => {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isPreparingRef.current || recordingRef.current) return false;

    isPreparingRef.current = true;
    cancelRequestedRef.current = false;
    setDurationMillis(0);

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted || cancelRequestedRef.current) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (cancelRequestedRef.current) return false;

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          setDurationMillis(status.durationMillis ?? 0);
        },
        200,
      );
      recording.setProgressUpdateInterval(200);

      if (cancelRequestedRef.current) {
        await recording.stopAndUnloadAsync().catch(() => {});
        await restoreAudioMode();
        return false;
      }

      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      return true;
    } catch (error) {
      console.warn('Failed to start voice recording:', error);
      recordingRef.current = null;
      resetState();
      await restoreAudioMode();
      return false;
    } finally {
      isPreparingRef.current = false;
    }
  }, [resetState, restoreAudioMode]);

  const pauseRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || !isRecording || isPaused) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
    } catch (error) {
      console.warn('Failed to pause voice recording:', error);
    }
  }, [isPaused, isRecording]);

  const resumeRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || !isRecording || !isPaused) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
    } catch (error) {
      console.warn('Failed to resume voice recording:', error);
    }
  }, [isPaused, isRecording]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    cancelRequestedRef.current = true;

    let waitCount = 0;
    while (isPreparingRef.current && waitCount < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      waitCount++;
    }

    const recording = recordingRef.current;
    if (!recording) {
      resetState();
      return null;
    }

    try {
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      resetState();
      await restoreAudioMode();

      if (!status.durationMillis || status.durationMillis < 400) return null;
      return uri;
    } catch (error) {
      console.warn('Failed to stop voice recording:', error);
      await recording.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      resetState();
      await restoreAudioMode();
      return null;
    }
  }, [resetState, restoreAudioMode]);

  const cancelRecording = useCallback(async () => {
    cancelRequestedRef.current = true;

    let waitCount = 0;
    while (isPreparingRef.current && waitCount < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      waitCount++;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) await recording.stopAndUnloadAsync().catch(() => {});
    resetState();
    await restoreAudioMode();
  }, [resetState, restoreAudioMode]);

  return {
    isRecording,
    isPaused,
    durationMillis,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
