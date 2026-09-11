import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isPreparingRef = useRef(false);
  const shouldStopRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    // If already preparing or recording, clean up existing first
    if (isPreparingRef.current || recordingRef.current) {
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch {}
      recordingRef.current = null;
    }

    isPreparingRef.current = true;
    shouldStopRef.current = false;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted || shouldStopRef.current) {
        isPreparingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (shouldStopRef.current) {
        isPreparingRef.current = false;
        return;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      // If user released the button while createAsync was initializing:
      if (shouldStopRef.current) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
        setIsRecording(false);
        isPreparingRef.current = false;
        return;
      }

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.warn('Failed to start voice recording:', e);
      recordingRef.current = null;
      setIsRecording(false);
    } finally {
      isPreparingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    shouldStopRef.current = true;

    // If still preparing, wait briefly for createAsync to finish so we can cleanly stop it
    let waitCount = 0;
    while (isPreparingRef.current && waitCount < 10) {
      await new Promise((r) => setTimeout(r, 50));
      waitCount++;
    }

    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      return null;
    }

    try {
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Discard micro-taps (< 400ms)
      if (status.durationMillis && status.durationMillis < 400) {
        return null;
      }
      return uri;
    } catch (e) {
      console.warn('Failed to stop voice recording:', e);
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
