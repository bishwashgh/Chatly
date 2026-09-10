# Chatly Mobile

Expo (SDK 51) + React Native app for Chatly. Uses Apollo Client (GraphQL + subscriptions), LiveKit (calls), Google Sign-In, and NativeWind.

## Run on a physical phone

> ⚠️ **Expo Go will NOT work** — Google Sign-In and LiveKit ship native code that Expo Go doesn't include. You need a development build (`expo run:android` or EAS).

### 1. Backend first

```bash
cd chatly-backend
cp .env.example .env          # then fill in real Google/LiveKit/Cloudinary keys
docker compose up -d          # Postgres + Redis
npm install
npm run prisma:migrate        # first run creates the schema
npm run start:dev             # API on port 4000
```

The server listens on all interfaces, so your phone can reach it over Wi-Fi.

### 2. Configure the mobile env

```bash
cd chatly-mobile
cp .env.example .env
```

Set these in `.env`:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_HTTP_URL` | `http://<YOUR_LAN_IP>:4000/graphql` — **not** `localhost` (that's the phone itself). Find your IP: `hostname -I` (Linux), `ipconfig getifaddr en0` (macOS), `ipconfig` (Windows). |
| `EXPO_PUBLIC_API_WS_URL` | `ws://<YOUR_LAN_IP>:4000/graphql` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The **web** OAuth client ID of your Google Cloud project (must belong to the same project as the backend's `GOOGLE_CLIENT_ID`). |
| `EXPO_PUBLIC_LIVEKIT_URL` | Your LiveKit instance, e.g. `wss://your-instance.livekit.cloud` |

### 3. Google Cloud Console setup (Android)

In the Google Cloud Console, create an OAuth client of type **Android** for this app:

- Package name: `com.chatly.app` (matches `app.json`)
- SHA-1: your **debug** keystore fingerprint:
  ```bash
  cd android
  ./gradlew signingReport   # copy the SHA-1 from the debug variant
  ```

Without this client, Google Sign-In will fail on the device.

### 4. Build & install

**Option A — local build (phone over USB):**

```bash
npx expo run:android
```

Plug in your phone with USB debugging enabled, or use an emulator. This prebuilds the native project (the `android/` folder is already generated and synced), compiles, and installs the app.

**Option B — EAS cloud build:**

```bash
npx eas-cli build --profile development --platform android
# then install the APK on your phone
```

### Notes

- Phone and computer must be on the same Wi-Fi network.
- Android debug builds allow plain-HTTP (`usesCleartextTraffic`) to the local API; release builds will need HTTPS.
- If you change `app.json` (name, permissions, plugins…), re-sync the native folders with `npx expo prebuild` (or `expo run:android` does it automatically).
- The `android/` folder is generated; delete it anytime and re-run prebuild if you want a clean regen.