# Chatly — Full Deploy + Mobile Integration Guide

End-to-end: deploy the backend on **AWS Academy Learner Lab (EC2)**, then build the mobile app and connect it to that backend. Every step is verified against this repo's actual code/config.

Part 1 = backend in the cloud. Part 2 = Google OAuth (needed by both). Part 3 = mobile app pointing at the cloud backend. Part 4 = smoke test. Part 5 = what breaks when the lab ends.

---

## Part 1 — Deploy the backend on EC2

> Details and troubleshooting: `chatly-backend/DEPLOY_AWS_ACADEMY.md` (quick version repeated here)

### 1.1 Start the lab and launch EC2

1. **AWS Academy → Learner Lab → Start Lab** (green dot), then click **AWS** to open the console.
2. Console: **EC2 → Launch instance**
   - Name: `chatly`
   - AMI: **Amazon Linux 2023** (default)
   - Type: **t3.micro** (or t2.micro — 1 GB RAM, swap added in 1.3)
   - Key pair: create `chatly-lab` and download the `.pem`
   - **Security group**: allow inbound **SSH (22)** from *My IP* and **Custom TCP 4000** from *Anywhere* (`0.0.0.0/0`)
   - Storage: **16 GB**
3. Launch and copy the **Public IPv4 address** → call it `$EC2_IP` below.

### 1.2 Upload the backend

From your **PC** (project root):

```bash
cd chatly-backend
docker build -t chatly-api:smoke .        # optional but recommended: catches Dockerfile errors before upload
tar czf backend.tgz --exclude node_modules --exclude dist .
scp -i chatly-lab.pem backend.tgz ec2-user@$EC2_IP:~
```

### 1.3 On the EC2 box: Docker + swap + start

```bash
ssh -i chatly-lab.pem ec2-user@$EC2_IP

sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user && exit    # log out, ssh back in

# 2 GB swap — REQUIRED on 1 GB RAM or `npm ci` gets OOM-killed
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile

tar xzf backend.tgz && cd chatly-backend
docker compose -f docker-compose.prod.yml up -d --build
```

### 1.4 Verify the backend

```bash
docker compose -f docker-compose.prod.yml ps          # 3 containers "running"
docker compose -f docker-compose.prod.yml logs api    # expect: "Chatly API running on .../graphql"
```

**From your PC's browser** → `http://$EC2_IP:4000/graphql` — playground loads = backend OK ✅

---

## Part 2 — Google OAuth (one setup, both parts use it)

The login flow is: app gets a Google **idToken** → sends `loginWithGoogle(idToken)` → backend verifies it against its `GOOGLE_CLIENT_ID`. Both sides must belong to the **same Google Cloud project**.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create project (e.g. `chatly`).
2. **APIs & Services → OAuth consent screen** → External → fill app name/email → add yourself as **test user**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - **Client type: Web application** → this is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile) and `GOOGLE_CLIENT_ID` (backend). Same value, both sides.
   - Authorized origins/redirects: none needed for Android-only use.
4. Second client: type **Android application**
   - Package name: `com.chatly.app`
   - SHA-1: your **debug** keystore fingerprint (get it in step 3.4)
   - ⚠️ **Required** — without it, Google Sign-In fails on the phone with `DEVELOPER_ERROR` even though the build succeeds.

---

## Part 3 — Mobile app setup (CachyOS local machine)

### 3.1 Install the missing toolchain

You currently have Node v26 ✅ but **no Docker, no JDK, no Android SDK**:

```bash
sudo pacman -S --needed jdk17-openjdk
paru -S android-studio          # or your AUR helper; bundles the SDK
```

Open Android Studio once → **More Actions → SDK Manager** → install **SDK Platform 34** + **Build-Tools 34**.

Add to `~/.bashrc` (or zshrc) and reopen the terminal:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### 3.2 Point the app at the cloud backend

Edit `chatly-mobile/.env`:

```bash
EXPO_PUBLIC_API_HTTP_URL=http://$EC2_IP:4000/graphql
EXPO_PUBLIC_API_WS_URL=ws://$EC2_IP:4000/graphql
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the Web client ID from Part 2>
EXPO_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud   # calls only; leave placeholder for now
```

> `EXPO_PUBLIC_*` vars are **baked in at build time** — changing `.env` later requires a rebuild (not just an app restart).

### 3.3 Install JS dependencies

```bash
cd chatly-mobile
npm install
```

### 3.4 Get the SHA-1 (needed for the Android OAuth client in Part 2)

```bash
cd android
./gradlew signingReport     # copy SHA-1 of the debug variant
```

Put that SHA-1 into the **Android OAuth client** from Part 2. (If the local build is your first Gradle run it may download Gradle itself first — normal.)

### 3.5 Build & install on the phone

- Phone: enable **USB debugging** → plug in via USB
- Phone and PC don't need to share Wi-Fi anymore (backend is public on EC2) — but the PC still needs internet for Metro

```bash
cd chatly-mobile
npx expo run:android
```

This compiles the native app (first build ~10 min), installs it, and starts Metro. When the app launches, Google Sign-In → you're in.

---

## Part 4 — Smoke test the full loop

1. **Sign in** with your Google account (the one added as test user in Part 2).
2. Check the backend saw it: `ssh` to EC2 → `docker compose -f docker-compose.prod.yml logs api | tail -30` → you should see the request.
3. Create a conversation, send a message. In the GraphQL playground (`http://$EC2_IP:4000/graphql`) with the same user's access token, query messages to confirm they persisted.
4. **Realtime check:** open the app on a second device/emulator with a second Google account, add each other, send a message — it should appear without refresh (this validates the Redis pub/sub + WS subscriptions through the deployment).

Not testing in this pass (needs external services): **calls** (LiveKit) and **image uploads** (Cloudinary keys must be real in `.env`).

---

## Part 5 — Lab session lifecycle (important)

| Event | What happens | What you do |
| --- | --- | --- |
| Session hits 4h / you click End Lab | EC2 **stops** (data persists), public IP released | Next session: Start Lab → start instance → **new IP** |
| Next session | Same disk, same containers | `ssh` in → `docker compose -f docker-compose.prod.yml up -d` → update IP in `chatly-mobile/.env` → **rebuild** the app (env vars are baked in) |
| Want the app on the go | Same | Rebuild only when the backend IP changes; otherwise the installed app keeps working |

> Because the IP changes every session, a rebuild per session is annoying. Optional fix: an Elastic IP (may not be allowed in Learner Lab) or a tiny IP-update script — see DEPLOY_AWS_ACADEMY.md notes.

---

## Quick command reference

```bash
# ---- PC: upload ----
cd chatly-backend && tar czf backend.tgz --exclude node_modules --exclude dist .
scp -i chatly-lab.pem backend.tgz ec2-user@$EC2_IP:~

# ---- EC2: run ----
sudo dnf install -y docker docker-compose-plugin && sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user        # re-login after
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
tar xzf backend.tgz && cd chatly-backend
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api

# ---- PC: mobile ----
cd chatly-mobile && npx expo run:android
```
