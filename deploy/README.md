# Hosting The Program for Friends & Family

Each person gets their own isolated instance at `{name}.theprogram.us` — their own database, their own images, their own API keys. No shared state.

```
Internet → Caddy (TLS + basic auth)
              tami.theprogram.us → container on port 8001
              bob.theprogram.us  → container on port 8002
```

---

## Server requirements

- Linux (Ubuntu 22.04+ recommended)
- Docker + Docker Compose
- [Caddy](https://caddyserver.com/docs/install) (handles TLS automatically)
- DNS: `*.theprogram.us` → your server's IP (or individual A records per person)

---

## First-time setup

### 1. Clone and configure

```bash
git clone <your-repo> /opt/theprogram
cd /opt/theprogram

# Create the .env file for secret keys
touch .env
chmod 600 .env
```

### 2. Build the Docker image

```bash
docker compose build
```

This builds the frontend (Node/Vite) and packages it with the Python backend into a single image. Takes a few minutes the first time; rebuilds are fast due to layer caching.

### 3. Set up Tami's instance

```bash
# Run the helper script
./deploy/add-instance.sh tami 8001

# It will:
#   - Create /opt/theprogram/data/tami/
#   - Generate a SECRET_KEY in .env
#   - Hash Tami's password for Caddy
#   - Print the config snippets to paste
```

Paste the printed snippets into `docker-compose.yml` and `Caddyfile`.

### 4. Set up Caddy

```bash
# Install Caddy (Debian/Ubuntu)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy

# Copy Caddyfile
cp /opt/theprogram/Caddyfile /etc/caddy/Caddyfile

# Start Caddy (systemd)
systemctl enable --now caddy
```

Or run Caddy directly (without systemd):
```bash
caddy start --config /opt/theprogram/Caddyfile
```

### 5. Launch instances

```bash
cd /opt/theprogram
docker compose up -d
docker compose ps        # verify running
docker compose logs tami # check for errors
```

### 6. Verify

Visit `https://tami.theprogram.us` — Caddy issues a TLS certificate automatically on first request. Tami enters her password, and she's in.

---

## Adding a new person

```bash
./deploy/add-instance.sh bob 8002
# Follow the printed instructions (paste 2 snippets, run 2 commands)
```

The script generates a secret key, hashes the password, and prints the exact lines to paste. Adding Bob doesn't restart Tami's container.

---

## Updating the app

```bash
cd /opt/theprogram
git pull
docker compose build          # rebuild image with new code
docker compose up -d          # rolling restart of all containers
```

Each container restarts in sequence. Each person is offline for ~5 seconds during their container's restart.

---

## Data layout on the host

```
/opt/theprogram/
├── .env                     # secret keys (chmod 600, not in git)
├── Caddyfile                # subdomain routing + basic auth
├── docker-compose.yml       # per-person service definitions
└── data/
    ├── tami/
    │   ├── theprogram.db    # Tami's database
    │   └── images/          # Tami's generated art
    └── bob/
        ├── theprogram.db
        └── images/
```

Backups: just tar the `data/` directory. Each person's data is completely independent.

---

## API keys

Each person enters their own Anthropic and Google API keys in **Settings** inside the app. Keys are stored in their personal database — not shared, not in environment variables.

---

## Troubleshooting

**Container won't start:**
```bash
docker compose logs tami
```

**Caddy certificate error:**
Make sure DNS is pointing to your server and port 80/443 are open in your firewall.

**Database missing tables:**
The app auto-syncs the schema on startup. Check logs for `Schema sync` messages.

**Reset a person's data:**
```bash
docker compose stop tami
rm /opt/theprogram/data/tami/theprogram.db
docker compose start tami   # fresh database, app re-initializes on startup
```
