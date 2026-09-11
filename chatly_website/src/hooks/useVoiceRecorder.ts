import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Candidate container/codec pairs, most portable first. Safari records mp4
 * (which the mobile apps play natively); Chromium falls back to webm/opus.
 */
const PREFERRED_MIME_TYPES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Recordings shorter than this are treated as accidental taps. */
const MIN_DURATION_MS = 700;

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    releaseStream();
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setDurationMillis(0);
  }, [clearTimer, releaseStream]);

  useEffect(() => reset, [reset]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setIsRecording(true);
      setDurationMillis(0);

      clearTimer();
      timerRef.current = setInterval(() => {
        setDurationMillis(Date.now() - startedAtRef.current);
      }, 200);

      return true;
    } catch {
      setError('Microphone permission is required to record a voice note.');
      reset();
      return false;
    }
  }, [clearTimer, reset]);

  /**
   * Stop and resolve with a ready-to-upload File, or null when the clip was
   * too short, empty, or failed.
   */
  const stopRecording = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        reset();
        resolve(null);
        return;
      }

      const duration = Date.now() - startedAtRef.current;
      const mimeType = recorder.mimeType || pickMimeType() || 'audio/webm';

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        reset();

        if (duration < MIN_DURATION_MS || blob.size === 0) {
          resolve(null);
          return;
        }

        resolve(
          new File([blob], `voice-${Date.now()}.${extensionFor(mimeType)}`, { type: mimeType }),
        );
      };

      try {
        recorder.stop();
      } catch {
        reset();
        resolve(null);
      }
    });
  }, [reset]);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Drop the buffered audio instead of producing a file.
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    reset();
  }, [reset]);

  return {
    isRecording,
    durationMillis,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
