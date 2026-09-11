# Chatly Web

Browser client for Chatly. Vite + React + TypeScript + Tailwind, talking to the
existing `chatly_backend` GraphQL API over HTTP and WebSockets, with LiveKit for
voice and video calls.

This folder is standalone — it does not import from `chatly-mobile` or
`chatly_backend`, and neither of those projects was modified to add it.

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
- **Voice notes** recorded in-browser via `MediaRecorder`, with a live timer, cancel and send
- Inline file upload via `uploadMessageMedia` (enforced at the server's 10 MB limit)
- Emoji quick-insert and per-message emoji reactions with counts
- Read receipts (`sent` / `delivered` / `read`) and message deletion for your own messages
- Full-screen image lightbox

**Voice and video calls** (LiveKit, friends-only — the backend enforces this)
- Outgoing calls from the chat header or the call history list
- Incoming call ringing with accept / decline, auto-declined when already busy
- Local self-view, remote video, mute and camera toggles, and a call duration timer
- 45-second ring timeout so an unanswered call cleans itself up
- Call history with status labels (completed, declined, missed) and call-back actions
- The LiveKit SDK is imported lazily, so it never loads on a normal page view

**Realtime** (all four messaging subscriptions)
- `messageAdded` — new messages appear live
- `messageStatusUpdated` — receipts patch in place without a refetch
- `messageReactionUpdated` — reactions stay in sync
- `userTypingStatus` — typing indicator, with a timeout guard against missed stop events
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
│   ├── CallContext.tsx   LiveKit room lifecycle, ringing, controls
│   └── ThemeContext.tsx  light/dark
├── graphql/        operations.ts — every GraphQL document
├── hooks/          useVoiceRecorder (MediaRecorder)
├── lib/
│   ├── apollo.ts       links, auth header, refresh, graphql-ws
│   ├── conversations.ts title/peer derivation helpers
│   ├── format.ts       date, duration and error formatting
│   ├── livekit.ts      LiveKit URL validation
│   ├── tokenStorage.ts localStorage with in-memory fallback
│   └── types.ts        domain types mirroring the backend models
└── pages/          Login, SignUp, ResetPassword, ChatPage
```

## Bundle

The production build splits by concern. LiveKit is dynamically imported when a
call starts, so it is not part of the initial load:

| Chunk | Size | Gzipped |
| --- | --- | --- |
| `index` (app code) | 108 kB | 27 kB |
| `react` | 155 kB | 51 kB |
| `apollo` | 230 kB | 68 kB |
| `livekit` (lazy) | 564 kB | 148 kB |

## Known limitations

- **A declined call is not signalled back to the caller.** There is no
  subscription for call-status changes, so the caller keeps ringing until the
  45-second timeout instead of learning the call was declined. Fixing this
  needs a backend status subscription.
- **Voice note playback depends on the recorded codec.** Safari records
  `audio/mp4` and Chromium records `audio/webm`; both play in modern browsers,
  but older Safari cannot play the webm variant.
- **Unread counts refresh on activity**, not on a poll. The backend's
  `messageAdded` subscription requires a `conversationId`, so messages arriving
  in a conversation you have not opened will not update the sidebar until you
  switch conversations.
- **Token storage uses `localStorage`**, which is readable by any script on the
  origin. Move to an httpOnly cookie flow before adding untrusted third-party
  scripts.
- **The API allows `origin: '*'`.** Lock the backend's CORS origin down to your
  deployed web origin before shipping to production.
