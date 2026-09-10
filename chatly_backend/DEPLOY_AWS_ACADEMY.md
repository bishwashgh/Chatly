# Deploy Chatly Backend to AWS Academy Learner Lab (EC2)

Goal: one EC2 instance running **Postgres + Redis + API** via Docker Compose.
Smoke-test in your browser at `http://<EC2_PUBLIC_IP>:4000/graphql`.

## 0. What you need

- AWS Academy Learner Lab session started (green dot in Vocareum)
- Your `chatly-backend/.env` (already exists locally — never commit it)
- ~30 min

## 1. Launch the EC2 instance

1. In Vocareum click **Start Lab**, then **AWS** (green dot = running).
2. In the AWS console: **EC2 → Launch instance**
   - Name: `chatly`
   - AMI: **Amazon Linux 2023** (keep default)
   - Instance type: **t3.micro** or **t2.micro** (1 GB RAM — see swap note in step 3)
   - Key pair: create one, download the `.pem` file
   - Security group: allow inbound **SSH (22)** from *My IP*, and **Custom TCP 4000** from *Anywhere* (smoke test only)
   - Storage: **16 GB** (default 8 GB is tight for Docker images)
3. Launch, then note the **Public IPv4 address**.

## 2. Connect

```bash
chmod 400 chatly-lab.pem
ssh -i chatly-lab.pem ec2-user@<EC2_PUBLIC_IP>
```

## 3. Install Docker + add swap (critical on 1 GB RAM)

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# re-login so the group change applies:
exit
# ssh again, then:

# 2 GB swap so the docker build / npm ci doesn't OOM:
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
free -h   # swap should show ~2.0Gi
```

*(Docker Compose plugin: Amazon Linux 2023 includes `docker compose` support — verify with `docker compose version`. If missing: `sudo dnf install -y docker-compose-plugin`.)*

## 4. Upload the backend

From your **local machine** (excludes node_modules — the image installs its own):

```bash
cd <project-root>
tar czf backend.tgz --exclude node_modules --exclude dist chatly-backend
scp -i chatly-lab.pem backend.tgz ec2-user@<EC2_PUBLIC_IP>:~
```

On the EC2 box:

```bash
tar xzf backend.tgz
cd chatly-backend
```

Your `.env` ships inside the tarball (it lives in the folder) — that's the secrets for JWT/Google/LiveKit/Cloudinary.

## 5. Start everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes ~5 min on t3.micro. Then check:

```bash
docker compose -f docker-compose.prod.yml ps     # all three should be "running"
docker compose -f docker-compose.prod.yml logs api | tail -20
```

You should see `Chatly API running on http://localhost:4000/graphql`.

## 6. Smoke test ✅

**From your laptop's browser:**

```
http://<EC2_PUBLIC_IP>:4000/graphql
```

If the GraphQL playground loads — deployed and OK. Try a query:

```graphql
query { __typename }
```

**Optional: point the mobile app at it.** In `chatly-mobile/.env`:

```
EXPO_PUBLIC_API_HTTP_URL=http://<EC2_PUBLIC_IP>:4000/graphql
EXPO_PUBLIC_API_WS_URL=ws://<EC2_PUBLIC_IP>:4000/graphql
```

(Phone needs internet access to the EC2 IP — works from anywhere, unlike LAN.)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `logs api` shows `ECONNREFUSED postgres` | containers still starting — wait 30 s, restart: `docker compose -f docker-compose.prod.yml restart api` |
| Build killed during `npm ci` | swap missing — redo step 3 |
| Browser can't reach :4000 | security group rule missing — add inbound TCP 4000 from Anywhere |
| Google Sign-In fails on the device | expected: OAuth client is Android-type for your debug keystore; unrelated to the deployment |
| Lab session ended | instance stopped, **not deleted** — next session: Start Lab → EC2 → Start instance → new public IP → `docker compose -f docker-compose.prod.yml up -d` (containers restart, data persists on the volume) |

## Gotchas (Learner Lab specifics)

- Region: only **us-east-1** / **us-west-2** work.
- Public IP **changes every session** — re-check it after each restart.
- Nothing auto-starts on reboot; run the compose command again after starting the instance.
- Lab budget hours tick while the session is open — **End Lab** when done to save them.
