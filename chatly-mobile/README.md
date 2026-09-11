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

### 6. Sign the release build (before publishing)

Out of the box the release build is signed with the **debug** keystore. That installs fine for
sideloading, but Google Play will reject it. To sign with a real key, generate one once and point
Gradle at it:

```bash
# 1. Create the keystore (choose a password and remember it)
cd chatly-mobile/android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore chatly-release.keystore -alias chatly \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. Point Gradle at it
cd ..
cp keystore.properties.example keystore.properties
#    then edit keystore.properties and fill in storePassword / keyPassword

# 3. Build a signed APK (or AAB for Play)
./gradlew assembleRelease     # -> app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # -> app/build/outputs/bundle/release/app-release.aab
```

Details worth knowing:

- `android/keystore.properties`, `*.jks` and `*.keystore` are git-ignored, with `debug.keystore` as
the single exception. **Never commit the release keystore or its passwords** — back them up offline.
- If no `keystore.properties` exists, Gradle prints a warning and falls back to the debug key so the
build still works. The APK it produces is not publishable.
- On CI, skip the file and export `CHATLY_UPLOAD_STORE_FILE`, `CHATLY_UPLOAD_STORE_PASSWORD`,
`CHATLY_UPLOAD_KEY_ALIAS` and `CHATLY_UPLOAD_KEY_PASSWORD` instead.
- **EAS Build ignores all of this.** It injects its own `android/app/eas-build.gradle` and signs
from `credentials.json`, so EAS-managed builds keep working unchanged.
- Google Sign-In checks the signing certificate: after switching to a release key, add that key's
SHA-1 as an Android OAuth client in Google Cloud Console or sign-in will fail with `DEVELOPER_ERROR`.

### 7. Release build size

R8 code shrinking and resource shrinking are enabled for release builds:

| Setting | Where |
| --- | --- |
| `android.enableProguardInReleaseBuilds` | `android/gradle.properties`, mirrored in `app.json` |
| `android.enableShrinkResourcesInReleaseBuilds` | `android/gradle.properties`, mirrored in `app.json` |
| Project keep rules | `android/app/proguard-rules.pro` |

The `app.json` copy matters: `android/` is generated, so anything only edited there is lost on
`expo prebuild --clean`. Resource shrinking requires code shrinking, so never enable one without the
other or Gradle will fail.

⚠️ **Always smoke-test a release build after changing these.** Chatly ships LiveKit/WebRTC and
Google Sign-In, which are reflection- and JNI-heavy — exactly what R8 strips. Test a video call,
Google sign-in, sending a photo, and downloading an attachment. If R8 fails the build it writes
`android/app/build/outputs/mapping/release/missing_rules.txt` with rules you can paste straight into
`proguard-rules.pro`; see the comments at the bottom of that file for the other reports
(`mapping.txt` to deobfuscate a crash, `usage.txt` and `resources.txt` to see what was removed).

For reference, the biggest remaining size lever is unused CPU architectures: the default universal
APK bundles native libraries for `armeabi-v7a, arm64-v8a, x86, x86_64`, and dropping the two x86
variants (only needed by emulators) removes a large part of the payload. For Play, build an AAB
with `bundleRelease` — Google splits it per architecture automatically.

### Notes

- Phone and computer must be on the same Wi-Fi network when using a local backend.
- Release builds should use HTTPS/WSS for the deployed API.
- If you change `app.json` (name, permissions, plugins…), re-sync the native folders with `npx expo prebuild` (or `expo run:android` does it automatically).
- The `android/` folder is generated; delete it anytime and re-run prebuild if you want a clean regeneration.
