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
| `EXPO_PUBLIC_API_HTTP_URL` | `https://<YOUR_DEPLOYED_HOST>/graphql` — use the deployed HTTPS backend, not `localhost`. |
| `EXPO_PUBLIC_API_WS_URL` | `wss://<YOUR_DEPLOYED_HOST>/graphql` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The **Web** OAuth client ID of your Google Cloud project (must exactly match the backend's `GOOGLE_CLIENT_ID`). |
| `EXPO_PUBLIC_LIVEKIT_URL` | Your LiveKit instance, e.g. `wss://your-instance.livekit.cloud` |

### 3. Google Cloud Console setup (Android)

In the Google Cloud Console, configure **both** OAuth clients:

1. **Web application client**: put its complete ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. It must be the same value as the deployed backend's `GOOGLE_CLIENT_ID`, or the backend will reject the ID token.
2. **Android client**: package name must be `com.chatly.app` (matches `app.json`) and its SHA-1 must match the certificate used to sign the APK.

For a locally installed debug APK, use the debug SHA-1. For an EAS/Play release APK, add the EAS/Play app-signing SHA-1 as a separate Android client. `DEVELOPER_ERROR` almost always means the package name, SHA-1, or OAuth project is wrong. After changing Google Cloud credentials, rebuild and reinstall the app; old APKs keep their old build-time configuration.

### 4. Get the Android SHA-1

Gradle must run with **JDK 17 or 21**, not JDK 25. It also needs the Android SDK installed and `ANDROID_HOME` configured. GitHub Codespaces commonly has neither configured by default.

Check your setup:

```bash
java -version
printf '%s\n' "$ANDROID_HOME"
```

If `java -version` shows 25, select JDK 21 for this command:

```bash
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.12+1-ms
export PATH="$JAVA_HOME/bin:$PATH"
```

Then configure the Android SDK path. Use the actual SDK location on your machine, for example:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Verify it exists before running Gradle:

```bash
test -x "$ANDROID_HOME/platform-tools/adb" && echo "Android SDK found"
```

Now run:

```bash
cd android
./gradlew signingReport
```

Copy the SHA1 under `Variant: debug` into the Android OAuth client in Google Cloud Console.

### 5. Build & install

**Option A — local release build (phone over USB):**

```bash
cd chatly-mobile
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.12+1-ms
export PATH="$JAVA_HOME/bin:$PATH"
npx expo run:android --variant release
```

**Option B — EAS cloud build:**

```bash
npx eas-cli build --profile development --platform android
# then install the APK on your phone
```

### Notes

- Phone and computer must be on the same Wi-Fi network when using a local backend.
- Release builds should use HTTPS/WSS for the deployed API.
- If you change `app.json` (name, permissions, plugins…), re-sync the native folders with `npx expo prebuild` (or `expo run:android` does it automatically).
- The `android/` folder is generated; delete it anytime and re-run prebuild if you want a clean regeneration.
