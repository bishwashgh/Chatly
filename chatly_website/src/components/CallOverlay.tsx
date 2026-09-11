import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar } from './Avatar';
import { CallTrackView } from './CallTrackView';
import { useCall } from '../context/CallContext';
import { formatDuration } from '../lib/format';

export function CallOverlay() {
  const {
    phase,
    call,
    tracks,
    isMuted,
    isCameraOn,
    durationSeconds,
    error,
    peerConnected,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    dismissError,
  } = useCall();

  if (phase === 'idle' || !call) {
    // Errors are surfaced through the overlay, so drop them once idle.
    return null;
  }

  const peerName = call.peer.name || 'Contact';
  const isVideoCall = call.callType === 'VIDEO';

  const remoteVideo = tracks.find((track) => !track.isLocal && track.kind === 'video');
  const localVideo = tracks.find((track) => track.isLocal && track.kind === 'video');
  const remoteAudio = tracks.filter((track) => !track.isLocal && track.kind === 'audio');

  const statusText =
    phase === 'incoming'
      ? `Incoming ${isVideoCall ? 'video' : 'voice'} call`
      : phase === 'outgoing'
        ? peerConnected
          ? formatDuration(durationSeconds)
          : 'Calling…'
        : formatDuration(durationSeconds);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas-night text-white">
      {/* Remote audio always plays, regardless of the visual layout. */}
      {remoteAudio.map((track) => (
        <CallTrackView key={track.key} info={track} />
      ))}

      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{peerName}</p>
          <p className="truncate text-xs text-white/70">{statusText}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isVideoCall ? 'bg-accent/20 text-accent-soft' : 'bg-white/10 text-white/80'
          }`}
        >
          {isVideoCall ? 'Video' : 'Voice'}
        </span>
      </header>

      {error && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-xl bg-danger/20 px-3 py-2 text-xs text-white">
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={dismissError} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {phase === 'active' && isVideoCall && remoteVideo ? (
          <CallTrackView
            info={remoteVideo}
            className="h-full w-full bg-black object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={phase === 'incoming' ? 'animate-pulse' : ''}>
              <Avatar name={peerName} url={call.peer.avatarUrl} size={112} />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{peerName}</p>
              <p className="mt-1 text-sm text-white/70">
                {phase === 'active'
                  ? peerConnected
                    ? statusText
                    : 'Waiting for the other person…'
                  : statusText}
              </p>
            </div>
          </div>
        )}

        {/* Local self-view. */}
        {phase === 'active' && isVideoCall && localVideo && isCameraOn && (
          <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20 bg-black shadow-panel sm:h-40 sm:w-28">
            <CallTrackView info={localVideo} className="h-full w-full object-cover" muted />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-5 pb-5 pt-3">
        {phase === 'incoming' ? (
          <>
            <button
              type="button"
              onClick={() => void declineIncoming()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-danger transition hover:brightness-110"
              aria-label="Decline call"
            >
              <PhoneOff size={22} />
            </button>
            <button
              type="button"
              onClick={() => void acceptIncoming()}
              className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-brand-light transition hover:brightness-110"
              aria-label="Accept call"
            >
              <Phone size={22} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void toggleMute()}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                isMuted ? 'bg-white text-canvas-night' : 'bg-white/15 hover:bg-white/25'
              }`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {isVideoCall && (
              <button
                type="button"
                onClick={() => void toggleCamera()}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  isCameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-white text-canvas-night'
                }`}
                aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => void hangUp()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-danger transition hover:brightness-110"
              aria-label="End call"
            >
              <PhoneOff size={22} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
