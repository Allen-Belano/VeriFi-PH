# VeriFi-PH — Link-Based Social Post Verification System

This workspace contains a React + Vite frontend and a Node.js backend (Express + Socket.IO) that verifies social or news post links and returns a credibility analysis.

## What's included

- Frontend (React + Tailwind): `src/` — web UI to submit links and view analysis history.
- Backend (Node/Express): `server/index.js` — fetches post pages, extracts metadata, analyzes credibility, and stores recent results.
- Real-time updates: Socket.IO broadcasts newly verified links to connected clients.
- Build output: `dist/`.

## Supported Social Media Platforms

- ✅ Facebook (facebook.com)
- ✅ Twitter / X (twitter.com, x.com)
- ✅ Instagram (instagram.com)
- ✅ TikTok (tiktok.com)
- ✅ YouTube (youtube.com)

## How it works

1. **User pastes a public post URL** into the web interface
2. **Backend fetches the page** and extracts OpenGraph/meta details and visible engagement hints
3. **Verifier computes credibility score** using engagement and trust signals
4. **Result is saved and broadcast** in real time to connected clients
5. **UI displays verdict, score, legal context, and source link**

## Run locally (development)

1. Install dependencies (root + server):

```bash
cd C:/xampp/htdocs/VeriFi-PH
npm install
cd server
npm install
```

2. Start backend (dev):

```bash
npm run dev-backend
```

3. Start the frontend dev server:

```bash
npm run dev
```

Open `http://localhost:5173`, paste a post URL, and verify.

## Build frontend

1. Build frontend:

```bash
npm run build
```

2. Serve `dist/` with your preferred static host if needed.

## Backend API

- `GET /posts` — fetch recent verified posts
- `POST /analyze` — analyze raw content without storing (body: `{ user, content, metrics }`)
- `POST /verify-link` — fetch and verify a URL (body: `{ url }`)
- `POST /posts` — create a manual post for testing (body: `{ user, content, metrics }`)

## Example Usage

1. Copy a public post URL (Facebook/X/Instagram/TikTok/YouTube/news page).
2. Paste it into the "Verify Post Link" field in the app.
3. Click **Verify Link**.
4. Inspect the generated credibility score, fact-check verdict, legal insight, and source link.

## How Credibility Scoring Works

The system uses extracted page signals and engagement indicators to compute a credibility score.

### Factors Used:
1. **Total Engagement** (likes, comments, shares, retweets, replies)
   - High engagement (+25 points) = content is resonating / likely real
   - Low/zero engagement (-15 points) = potentially automated or false content
2. **Account Verification** (blue checkmark / verified badge)
   - Verified accounts (+20 points) = higher trustworthiness
3. **Engagement Rate** (proportion of interactions)
   - High engagement rate (+10 points) = organic, real users
4. **Content Length**
   - Very short posts (<20 chars) (-10 points) = often spam
   - Longer posts (>500 chars) (+5 points) = more likely genuine
5. **Platform** — detected automatically from the URL domain

### Result:
- **Credibility Score 60+**: ✅ High credibility (green)
- **Credibility Score 40-59**: ⚠️ Moderate credibility (yellow)
- **Credibility Score <40**: 🚩 Low credibility (red) = flagged

When platforms hide metrics or block scraping, the verifier still analyzes available metadata and content text.

## Notes & Future Enhancements

- Backend stores up to 100 recent posts in memory (no database yet)
- Socket.IO used for real-time updates across connected clients
- Can extend to: database persistence, dedicated platform APIs, user reporting, and audit logs

