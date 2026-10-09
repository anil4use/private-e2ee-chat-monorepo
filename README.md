# 🔐 Vault E2EE — Private End-to-End Encrypted Chat

> Zero-knowledge, ephemeral, real-time chat. No accounts. No data. Just encrypted conversations.

[![E2EE](https://img.shields.io/badge/Encryption-AES--256--GCM-cyan)](.)
[![Key Exchange](https://img.shields.io/badge/Key%20Exchange-ECDH%20P--256-violet)](.)
[![License](https://img.shields.io/badge/License-MIT-emerald)](.)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔒 **End-to-End Encryption** | All messages encrypted with AES-256-GCM. Keys generated in-browser, never leave your device. |
| 🤝 **ECDH Key Exchange** | P-256 ECDH + HKDF for secure room key wrapping between owner and guest. |
| 💣 **Self-Destruct Timers** | Messages auto-expire after read (10s · 1m · 5m · 1h · 24h · never). |
| 🛡️ **Safety Codes** | Out-of-band verification code to prevent man-in-the-middle attacks. |
| 🎭 **Anonymous** | No accounts, no sign-up. Just create a room and share the link. |
| 📁 **Encrypted File Sharing** | Files encrypted client-side with AES-256-GCM before upload. |
| 🚨 **Panic Wipe** | One-click (or `Ctrl+Shift+X`) wipes all local keys and disconnects. |
| 💬 **Rich Chat** | Emoji reactions, message replies, edit/delete, read receipts, typing indicators. |
| 📱 **Mobile Responsive** | Fully responsive UI for all screen sizes. |

---

## 🏗️ Architecture

```
private-e2ee-chat-monorepo/
├── apps/
│   ├── realtime/          # Socket.IO + Express server (Node.js)
│   │   ├── src/server.ts  # Main server with socket handlers + REST API
│   │   └── prisma/        # Database schema (SQLite/PostgreSQL)
│   └── web/               # Next.js 14 frontend
│       └── src/
│           ├── app/       # App Router pages
│           ├── components/ # UI components
│           ├── hooks/     # Custom React hooks
│           └── lib/       # Utilities (socket, sound, crypto helpers)
└── packages/
    ├── crypto/            # Browser WebCrypto API wrapper
    └── shared/            # Shared types & Zod schemas
```

### Encryption Flow

```
Owner Browser                    Server                    Guest Browser
─────────────────────────────────────────────────────────────────────────
1. Generate ECDH keypair     ────────────────────     1. Generate ECDH keypair
2. Create AES-256-GCM        2. Store room metadata   2. Send join request +
   room key (IDB)               (no keys ever!)          ECDH public key
3. Approve guest join    ────→ 3. Route join-request
4. ECDH key agreement        ← 4. Notify owner         4. Wait for approval
5. Wrap room key with                                  5. ECDH key agreement
   ECDH-derived key    ─────→ 5. Route wrapped key  ──→ 6. Unwrap room key
6. All messages: AES-GCM     6. Store ciphertext only   7. All messages: AES-GCM
   encrypted locally         (server is BLIND!)            encrypted locally
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/anil4use/private-e2ee-chat-monorepo.git
cd private-e2ee-chat-monorepo
npm install
```

### 2. Set Up Environment

Create `apps/realtime/.env`:
```env
DATABASE_URL="file:./dev.db"
PORT=4000
BASE_URL=http://localhost:4000
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Initialize Database

```bash
cd apps/realtime
npx prisma db push
cd ../..
```

### 4. Run Development Servers

```bash
# Terminal 1 — Realtime server
cd apps/realtime && npm run dev

# Terminal 2 — Next.js frontend
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

---

## ☁️ Deploy to Render (Production)

### Option A: One-Click Blueprint (Recommended)

1. Push your code to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and create both services automatically.

> **⚠️ Important**: After deployment, you MUST add environment variables manually.

### Required Environment Variables

#### Realtime Service (`e2ee-chat-realtime`)

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Get from Render PostgreSQL or Neon/Supabase |
| `PORT` | `10000` | Already set in render.yaml |
| `BASE_URL` | `https://your-render-url.onrender.com` | Your Render service URL |

#### Web Service (`e2ee-chat-web`)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-realtime-url.onrender.com` | URL of the realtime service |

### Option B: Single Service Deployment (Free Tier)

The `render.yaml` can also be configured for a single service where the realtime server proxies Next.js. In this case:

1. Use only the `e2ee-chat-realtime` service
2. Build command: `npm install && npm run build` (from root)
3. Start command: `node apps/realtime/dist/server.js`
4. The server auto-proxies web traffic to Next.js on port 3000

### Setting Up a Free PostgreSQL Database

**Recommended: [Neon](https://neon.tech) (free tier)**
1. Create account at neon.tech
2. Create a new project
3. Copy the connection string
4. Set as `DATABASE_URL` in your Render environment

**Alternative: Render PostgreSQL**
1. Render Dashboard → New → PostgreSQL
2. Copy Internal Database URL
3. Set as `DATABASE_URL`

### Migrate Database for Production

The build command already runs `npx prisma db push` automatically, so your database tables will be created on first deploy.

---

## 🔑 Security Model

### What the Server Knows
- Room ID (random 128-bit base64url)
- Participant count (max 2)
- ECDH public keys (used for key agreement only)
- AES-256-GCM **ciphertext** only (server cannot decrypt)
- Message metadata (timestamps, TTL)

### What the Server NEVER Knows
- Plaintext message content
- The AES room key
- ECDH private keys
- The link `#fragment` (hash) used for HMAC verification

### Threat Model

| Attack | Protection |
|---|---|
| Server compromise | Server only holds ciphertext. Zero plaintext exposure. |
| MITM on key exchange | Safety codes (ECDH fingerprint comparison out-of-band) |
| Replay attacks | Messages have unique IVs and AAD with timestamps |
| Room squatting | HMAC-based link secret validates join requests |
| Message retention | Self-destruct timers, panic wipe, room destroy |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Animations** | Framer Motion |
| **Realtime** | Socket.IO (WebSockets) |
| **Encryption** | Web Crypto API (ECDH P-256, AES-256-GCM, HKDF, HMAC-SHA256) |
| **Database** | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| **Key Storage** | IndexedDB (browser-local, never sent to server) |
| **Validation** | Zod |

---

## 📜 License

MIT © 2024 — Built with ❤️ for privacy.

---

> **Note**: This is an educational/personal project demonstrating browser-based E2EE. For production security-critical applications, consider professional security auditing.
