# 🇳🇵 Chatly

A full-featured glassmorphism chat application for Nepal with **video calls, audio calls, messaging, image sharing, and voice messages**.

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native (Expo SDK 57) + TypeScript |
| **Backend** | Rust (Axum + Tokio + SQLx) |
| **Database** | PostgreSQL 18 |
| **Real-time** | WebSocket (messaging, presence, typing, WebRTC signaling) |
| **Calls** | WebRTC (react-native-webrtc, P2P with STUN) |

UI is a clean, **Messenger-inspired light design** — white surfaces, a friendly blue primary,
soft neutral grays, and green online indicators. Familiar and trustworthy, with subtle polish.

---

## ✨ Features

- **1-on-1 messaging** with read receipts (✓, ✓✓), typing indicators, and timestamps
- **Video calls** — full-screen WebRTC with PiP local preview, mute, camera toggle
- **Audio calls** — WebRTC audio with mute control
- **Image sharing** — pick from gallery, upload, and send
- **Voice messages** — hold-to-record audio (m4a), send, and playback
- **Stories** — view stories from the Discover tab with progress bars and replies
- **User search** — find friends by name or username and start chatting
- **Profile** — edit name/bio, settings, dark mode toggle
- **Presence** — live online/offline status
- **Groups screen** — placeholder group chats UI

---

## 📁 Project Structure

```
Project1/
├── backend/                  # Rust backend (Axum)
│   ├── src/
│   │   ├── main.rs           # App entry, router, CORS
│   │   ├── auth/mod.rs       # JWT auth, register/login
│   │   ├── api/              # REST endpoints
│   │   │   ├── users.rs      # user search, profile
│   │   │   ├── messages.rs   # conversations + messages
│   │   │   ├── media.rs      # file upload
│   │   │   └── calls.rs      # call history
│   │   ├── ws/mod.rs         # WebSocket + WebRTC signaling relay
│   │   └── db/mod.rs         # DB pool + migrations
│   ├── migrations/001_init.sql
│   ├── Cargo.toml
│   └── .env
│
└── mobile/                   # React Native (Expo) app
    ├── App.tsx               # Navigation root
    ├── app.json              # Expo config + permissions
    └── src/
        ├── theme/            # Luminous Glass design tokens
        ├── components/       # GlassPanel, ChatBubble, BottomNav, ...
        ├── screens/          # Messages, Chat, Call, Discover, Profile, ...
        ├── services/         # api, websocket, webrtc
        ├── store/            # auth, chat, call (zustand)
        └── config.ts         # API/WS/STUN configuration
```

---

## 🚀 Setup

### 1. Backend (Rust + PostgreSQL)

```bash
# Install PostgreSQL, start it
sudo pacman -S postgresql
sudo systemctl start postgresql

# Create database + user
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE chat_app;"

# Configure backend
cd backend
cp .env.example .env     # edit DATABASE_URL if needed

# Run migrations + start server
cargo run
```

Server starts on `http://0.0.0.0:3000`.

**API endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/verify` | Validate token |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/me` | Current user |
| GET/POST | `/api/conversations` | List / create conversations |
| GET/POST | `/api/conversations/:id/messages` | Messages |
| POST | `/api/conversations/:id/read` | Mark read |
| POST | `/api/media/upload` | Upload image/audio |
| GET | `/api/calls/history` | Call history |
| WS | `/ws?token=JWT` | Realtime + signaling |

### 2. Mobile (Expo)

```bash
cd mobile
npm install
npx expo prebuild      # generate native android/ios projects
npx expo run:android   # build & run on emulator/device
```

> **Note:** `react-native-webrtc` requires a **development build** (native module).
> It does **not** run in Expo Go. Use `npx expo run:android` or an EAS build.

### 3. Configuration

Edit `mobile/src/config.ts`:

```ts
// Defaults point at an Android emulator (10.0.2.2 = host machine)
// For a physical device, use your computer's LAN IP:
export const API_URL = 'http://192.168.1.100:3000';
export const WS_URL = 'ws://192.168.1.100:3000/ws';
```

**STUN/TURN for calls:** Free Google STUN servers are configured. For reliable calls
in Nepal (where NAT traversal can be tricky), add a TURN server in `config.ts`:

```ts
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' },
];
```

---

## ☁️ Deploy to Render

### 1. Database

Create a **PostgreSQL** instance in the Render dashboard (or via the blueprint in `render.yaml`).

### 2. Backend (Web Service)

1. Create a **Web Service** and point it at this repo, or use the blueprint in `render.yaml`.
2. Select the `backend/Dockerfile`.
3. Set these **environment variables**:
   - `DATABASE_URL` — from your Render Postgres
   - `JWT_SECRET` — a long random string
   - `RESEND_API_KEY` *(optional)* — enables real OTP emails
4. Add a **Persistent Disk** (e.g. 1 GB) mounted at `/var/data/uploads`.
5. Set `UPLOAD_DIR=/var/data/uploads` so media survives redeploys.
6. Health check path: `/health`.

Migrations run automatically on startup (`MIGRATIONS_DIR=/app/migrations` is baked into the image).

### 3. Mobile

Point the app at your production backend with one of:

```bash
# EAS / production build
EXPO_PUBLIC_API_URL=https://your-app.onrender.com EXPO_PUBLIC_WS_URL=wss://your-app.onrender.com/ws npx expo export
```

or set it in `app.json` under `expo.extra`:

```json
{
  "extra": {
    "apiUrl": "https://your-app.onrender.com",
    "wsUrl": "wss://your-app.onrender.com/ws"
  }
}
```

> **Note:** For calls (WebRTC) the server only relays signaling — media flows P2P.
> On restricted networks you'll need a TURN server (see `docker-compose.yml` coturn service).

---

## 🎨 Design System

The UI uses a clean, Messenger-inspired light theme:

- **Colors:** `#ffffff` white surfaces, `#0084ff` Messenger-blue primary, `#00b2ff` cyan accent, `#31a24c` green online/accept, `#050505` text, `#e4e6eb` gray incoming bubbles
- **Surfaces:** white cards with subtle `#e4e6eb` borders and soft shadows
- **Typography:** Manrope throughout (clean, friendly sans-serif)
- **Shapes:** moderate rounded — 16px cards, 18px message bubbles, pill buttons
- **Nav:** floating pill bottom bar with blue active indicator
- **Calls:** dark blue-tinted call screens (standard for call UIs) with green accept / red decline

---

## 🔒 WebRTC Signaling Flow

```
Caller                          Rust Server                      Callee
  │  call_offer(sdp)  ───────▶   relay  ──────────────────────▶  ringing
  │                                                               │ accept
  │  ◀────────────────────  call_answer(sdp)  ◀───────────────────┘
  │  ice_candidate  ◀────▶  relay  ◀────▶  ice_candidate
  │                     (P2P WebRTC media flows directly)          │
  │  call_end  ───────▶  relay  ──────────────────────▶  call_end
```

---

## 🛠️ Tech Notes

- **Password hashing:** Argon2 (via `argon2` crate)
- **Auth:** stateless JWT (30-day expiry)
- **Uploads:** stored in `backend/uploads`, served at `/media/`
- **DB access:** SQLx (compile-time checked queries, async)
- **State:** Zustand stores for auth/chat/call on the client