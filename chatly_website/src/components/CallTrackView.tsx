import { useEffect, useRef } from 'react';
import type { CallTrackInfo } from '../context/CallContext';

type CallTrackViewProps = {
  info: CallTrackInfo;
  className?: string;
  /** Local video must stay muted to avoid feeding your own audio back. */
  muted?: boolean;
};

export function CallTrackView({ info, className, muted = false }: CallTrackViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (info.kind !== 'video') return;
    const element = videoRef.current;
    if (!element) return;

    info.track.attach(element);
    return () => {
      info.track.detach(element);
    };
  }, [info.track, info.kind]);

  useEffect(() => {
    if (info.kind !== 'audio') return;
    const element = audioRef.current;
    if (!element) return;

    info.track.attach(element);
    return () => {
      info.track.detach(element);
    };
  }, [info.track, info.kind]);

  if (info.kind === 'audio') {
    // Your own microphone is never played back; remote audio uses a hidden sink.
    if (info.isLocal) return null;
    return <audio ref={audioRef} autoPlay />;
  }

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />;
}
