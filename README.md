# 🎬 Stremio Addon - Personal Stream Library

A self-hosted Stremio addon with a web dashboard to manage your stream library. Add movies/series from TMDB, attach stream URLs or torrent hashes, and watch them in Stremio instantly.

---

## ✨ Features

- **Dashboard** — Add/manage content with beautiful UI
- **TMDB Integration** — Auto-fetch poster, metadata, cast, genres
- **MongoDB Storage** — All content & streams stored in the cloud
- **Stremio Ready** — Works as a native Stremio addon
- **Movie & Series** — Episode-level stream management
- **Multiple Streams** — Add 4K, 1080p, Hindi dub etc. per title
- **GitHub Actions** — Auto-deploy on every push

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-username/stremio-addon.git
cd stremio-addon
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run Locally
```bash
npm run dev
```

Visit:
- **Dashboard**: http://localhost:3000/dashboard
- **Manifest**: http://localhost:3000/manifest.json

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `TMDB_API_KEY` | TMDB API key (free at themoviedb.org) | ✅ |
| `DASHBOARD_USER` | Dashboard login username | ✅ |
| `DASHBOARD_PASS` | Dashboard login password | ✅ |
| `ADDON_BASE_URL` | Your server's public URL | ✅ |
| `ADDON_NAME` | Your addon name in Stremio | Optional |
| `PORT` | Server port (default: 3000) | Optional |

---

## 📡 GitHub Actions Deployment

### GitHub Secrets to Set:
Go to **Settings → Secrets → Actions** and add:

```
MONGODB_URI        = mongodb+srv://...
TMDB_API_KEY       = your_tmdb_key
DASHBOARD_USER     = admin
DASHBOARD_PASS     = yourpassword
ADDON_BASE_URL     = https://your-server.com
VPS_HOST           = your.server.ip
VPS_USER           = ubuntu
VPS_SSH_KEY        = (your private SSH key)
```

### GitHub Variables to Set:
Go to **Settings → Variables → Actions** and add:

```
DEPLOY_TARGET = vps    # Options: vps, railway, render
```

### VPS Setup (first time):
```bash
# On your VPS
sudo apt update && sudo apt install -y nodejs npm
npm install -g pm2
pm2 startup
```

---

## 🎯 Adding Content to Stremio

### Step 1: Add your addon URL to Stremio
```
stremio://your-server.com/manifest.json
```
Or go to: `https://your-server.com` and click **Install in Stremio**

### Step 2: Add content from Dashboard
1. Open `https://your-server.com/dashboard`
2. Click **+ Add Movie** or **+ Add Series**
3. Search by title → TMDB auto-fills metadata
4. Click content → **Add Stream** → paste URL or infohash
5. Content appears immediately in Stremio!

---

## 📁 Project Structure

```
stremio-addon/
├── server.js              # Main Express server
├── models/
│   └── Content.js         # MongoDB schema
├── routes/
│   ├── addon.js           # Stremio protocol endpoints
│   └── dashboard.js       # Dashboard API endpoints
├── services/
│   └── tmdb.js            # TMDB API integration
├── public/
│   └── dashboard.html     # Dashboard UI
├── .github/workflows/
│   └── deploy.yml         # GitHub Actions CI/CD
├── Dockerfile
└── .env.example
```

---

## 🔗 Supported Stream Types

| Type | Example |
|------|---------|
| Direct HTTP | `http://example.com/video.mp4` |
| HLS Stream | `https://example.com/stream.m3u8` |
| DASH Stream | `https://example.com/manifest.mpd` |
| Torrent Hash | 40-char infohash |

---

## 🆓 Free Deployment Options

| Platform | Free Tier | Notes |
|----------|-----------|-------|
| [Railway](https://railway.app) | $5/month free credit | Easiest |
| [Render](https://render.com) | 750 hrs/month | May sleep |
| [Fly.io](https://fly.io) | 3 VMs free | Requires CLI |
| MongoDB Atlas | 512MB free | For database |

---

## 📜 License
MIT
