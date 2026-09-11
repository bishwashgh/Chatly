# Chatly Web

Browser client for Chatly. Vite + React + TypeScript + Tailwind, talking to the
existing `chatly_backend` GraphQL API over HTTP and WebSockets, with LiveKit for
voice and video calls.

This folder is self-contained — it imports nothing from `chatly-mobile` or
`chatly_backend`. The two subscription fields the client relies on
(`callStatusUpdated` and `conversationUpdated`) are served by the same backend
and the mobile app consumes them too, so all three clients share one realtime
contract.

## Quick start

```bash
cd chatly_website
npm install
cp .env.example .env      # point the URLs at your backend
npm run dev               # http://localhost:5173
```

### Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_HTTP_URL` | GraphQL HTTP endpoint, e.g. `https://your-host/graphql` |
| `VITE_API_WS_URL` | GraphQL WebSocket endpoint for subscriptions, e.g. `wss://your-host/graphql` |
| `VITE_LIVEKIT_URL` | LiveKit WebSocket host, e.g. `wss://your-instance.livekit.cloud` |

Values are baked in at build time, so restart the dev server after editing
`.env`. Invalid or placeholder URLs fall back to the deployed backend rather
than silently breaking every request — see `src/lib/apollo.ts` and
`src/lib/livekit.ts`.

## Features

**Authentication**
- Email + password sign-in
- Sign-up with the backend's 6-digit email verification step, plus resend
- Password reset: request code → verify → set new password
- Session restored from stored tokens on reload via the `me` query
- Automatic access-token refresh on `UNAUTHENTICATED`, with one retry per operation
- Sign-out clears tokens, the Apollo cache and the socket

**Profile**
- Edit display name and bio, and upload a new avatar
- Account deactivation (destructive, behind a confirmation)

**Conversations**
- Conversation list with avatars, presence dots, last-message previews and unread badges
- People panel: user search, friend requests (send/accept/decline/cancel), friends list
- Block and unblock users, with a dedicated blocked-users list
- Create groups: name the group and multi-select friends
- Start a direct conversation with anyone from search or your friends list

**Messaging**
- Message thread with day separators and consecutive-sender grouping
- Text, image, video, audio and document messages
- Voice notes recorded in-browser via `MediaRecorder`, with a live timer, cancel
  and send. Recordings are normalized to WAV so every browser and both native
  apps can play them (see *Voice note portability* below)
- Inline file upload via `uploadMessageMedia` (enforced at the server's 10 MB limit)
- Emoji quick-insert and per-message emoji reactions with counts
- Read receipts (`sent` / `delivered` / `read`) and message deletion for your own messages
- Full-screen image lightbox

**Voice and video calls** (LiveKit, friends-only — the backend enforces this)
- Outgoing calls from the chat header or the call history list
- Incoming call ringing with accept / decline, auto-declined when already busy
- Local self-view, remote video, mute and camera toggles, and a call duration timer
- Declines, cancellations and "no answer" resolve immediately: the backend pushes
  `callStatusUpdated` to both participants, so nothing waits on a timeout
- Call history with status labels (completed, declined, missed) and call-back actions
- The LiveKit SDK is imported lazily, so it never loads on a normal page view

**Realtime** (all six subscriptions)
- `messageAdded` — new messages appear live in the open conversation
- `messageStatusUpdated` — receipts patch in place without a refetch
- `messageReactionUpdated` — reactions stay in sync
- `userTypingStatus` — typing indicator, with a timeout guard against missed stop events
- `callStatusUpdated` — a call's decline, cancellation or answer reaches both
  participants immediately
- `conversationUpdated` — a per-user inbox signal, so previews and unread badges
  update across all conversations without opening the thread
- Auto-reconnecting WebSocket with exponential backoff

**UI**
- Light/dark theme, persisted and defaulting to the system preference
- Responsive: two-pane on desktop, single-pane with a back button on mobile
- Chatly brand palette mirrored from the mobile theme

## Scripts

```bash
npm run dev        # dev server
npm run build      # typecheck (tsc -b) + production build
npm run preview    # serve the production build
npm run typecheck  # types only
```

## Project layout

```
src/
├── components/     UI primitives, chat widgets, call overlay, modals
├── context/
│   ├── AuthContext.tsx   session, sign-in/out, refresh-failure handling
│   ├── CallContext.tsx   LiveKit room lifecycle, ringing, status reconciliation
│   └── ThemeContext.tsx  light/dark
├── graphql/        operations.ts — every GraphQL document
├── hooks/          useVoiceRecorder (MediaRecorder)
├── lib/
│   ├── apollo.ts       links, auth header, refresh, graphql-ws
│   ├── audio.ts        WAV transcode for voice notes
│   ├── conversations.ts title/peer derivation helpers
│   ├── format.ts       date, duration and error formatting
│   ├── livekit.ts      LiveKit URL validation
│   ├── tokenStorage.ts localStorage with in-memory fallback
│   └── types.ts        domain types mirroring the backend models
└── pages/          Login, SignUp, ResetPassword, ChatPage
```

## Design notes

### Call decline and cancellation

The backend publishes `callStatusUpdated` for both participants of a call
session (`chatly_backend/src/calls`), so ringing state is event-driven rather
than polled. The subscription is only active while a call is ringing:

- `ACCEPTED` → the caller's ring timeout is cancelled and the call goes active
- `DECLINED` → the caller sees "Call declined"
- `ENDED` / `MISSED` → "Call ended" for the caller, "Missed call" for a
  recipient who is still ringing because the caller cancelled

The 45-second timeout remains only as a fallback for a genuinely unanswered
call; an answer or decline settles the call in well under a second.

### Inbox freshness

`messageAdded` carries a `conversationId`, so it only reaches clients that have
the thread open. The backend therefore also emits a per-user
`conversationUpdated` event to every participant of a conversation
(`chatly_backend/src/messages`). Both the web client and the mobile app refetch
their conversation list on that event (debounced to coalesce bursts), so unread
badges and previews update without opening the conversation and without polling.
Tab focus still triggers an immediate refetch as a cheap safety net.

### Voice note portability

Chromium records `audio/webm`; Safari cannot play that container, and neither
can some Android builds. Recordings that are not already in a universally
playable container are decoded with the Web Audio API and re-encoded as 16 kHz
mono PCM WAV (`src/lib/audio.ts`), which every browser and both native apps
play. Browsers that produce webm can also decode it, so the transcode always has
a valid source.

Two consequences worth knowing: transcoding adds a brief pause before upload on
Chromium, and because PCM is uncompressed a very long note could exceed the
server's 10 MB cap. Notes that would exceed ~9 MB fall back to the original
recording rather than failing outright, and the composer warns if the file is
still too large.

## Bundle

The production build splits by concern. LiveKit is dynamically imported when a
call starts, so it is not part of the initial load:

| Chunk | Size | Gzipped |
| --- | --- | --- |
| `index` (app code) | 112 kB | 28 kB |
| `react` | 155 kB | 51 kB |
| `apollo` | 230 kB | 68 kB |
| `livekit` (lazy) | 564 kB | 148 kB |

## Security notes before shipping

- **Token storage uses `localStorage`**, which is readable by any script on the
  origin. Move to an httpOnly cookie flow before adding untrusted third-party
  scripts.
- **The API allows `origin: '*'`.** Lock the backend's CORS origin down to your
  deployed web origin.
