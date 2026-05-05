# Development Plan for Fake‑News‑Shield Backend (Node.js + Express + Cloudflare Workers AI)

## Persona: Professional Backend Software Engineer
You are a senior backend engineer with 7+ years of experience building production‑grade APIs in Node.js. You prioritise robustness, clarity, and maintainability over cleverness. 

## Project Goal
Build a REST API (`POST /api/v1/analyze`) that accepts a URL, fetches its content, extracts text/images/videos, runs AI inference via Cloudflare Workers AI, fact‑checks via Google Fact Check API, applies Philippine legal classification, and returns a credibility score + explanation.

## Technology Stack (as per `Tech_Stack_FakeNewsShield_Hybrid.md`)
- Node.js 20+, Express, cors, dotenv, morgan, express-rate-limit, helmet, compression
- HTTP: axios, cheerio, (readability)
- Caching: node-cache (in-memory, 24h TTL) → later upgrade to MongoDB Atlas optional
- AI: Calls to Cloudflare Workers AI REST API (models listed in tech stack)
- Fact‑check: Google Fact Check Tools API (100/day free)
- Legal engine: local JSON file (`ph_laws.json`) with keyword mapping

## Development Phases (Iterative)

### Phase 1: Basic Express Server & Middleware
- [ ] Initialize npm project, install dependencies
- [ ] Create `index.js` with Express, apply middleware: cors, helmet, compression, morgan, express.json()
- [ ] Add `/health` endpoint
- [ ] Add global error handler

### Phase 2: URL Fetching & Content Extraction
- [ ] Create `services/contentExtractor.js`
- [ ] Implement `fetchHTML(url)` using axios
- [ ] Implement `extractMainContent(html)` using cheerio + readability
- [ ] Extract text, image URLs, video URLs
- [ ] Return structured `Content` object

### Phase 3: Cloudflare Workers AI Integration
- [ ] Create `services/aiService.js`
- [ ] Implement `callCloudflareModel(modelId, input)` using axios (needs account ID + API token)
- [ ] Implement `detectAIText(text)` → uses `@cf/huggingface/roberta-base-openai-detector`
- [ ] Implement `getSentiment(text)` → uses `@cf/huggingface/distilbert-sst-2-int8`
- [ ] Implement `classifyRisk(text, candidateLabels)` → uses `@cf/huggingface/facebook-bart-large-mnli`
- [ ] Implement `generateExplanation(prompt)` (optional, using LLM) → uses `@cf/meta/llama-2-7b-chat-int8`

### Phase 4: Fact‑Check Service
- [ ] Create `services/factCheckService.js`
- [ ] Extract keywords from text (simple: use `keyword-extractor` npm or regex)
- [ ] Call Google Fact Check API (free, no key needed for basic)
- [ ] Parse response into `{ summary, sources[] }`

### Phase 5: Legal Engine
- [ ] Create `data/ph_laws.json` (list of laws with keywords and explanations)
- [ ] Create `services/legalEngine.js`
- [ ] Implement `matchLaws(text, riskType)` → keyword matching, return up to 3 laws

### Phase 6: Credibility Scoring & Explanation
- [ ] Create `services/credibilityScorer.js`
- [ ] Implement weighted scoring: AI probability (30%), fact‑check match (40%), source domain (15%), sentiment (15%)
- [ ] Create `services/explanationGenerator.js` – template + optional LLM enrichment

### Phase 7: Caching & Rate Limiting
- [ ] Set up `node-cache` (24h TTL) in `services/cacheService.js`
- [ ] Before analysis, check cache by URL hash
- [ ] After analysis, store result in cache
- [ ] Apply `express-rate-limit` (10 per minute per IP)

### Phase 8: Main Analysis Endpoint
- [ ] Create `routes/analyze.js`
- [ ] Implement `POST /api/v1/analyze`
- [ ] Orchestrate all services, handle errors, return JSON matching PRD spec

### Phase 9: Testing & Documentation
- [ ] Write unit tests for each service (using Jest or Mocha)
- [ ] Create `test/` with sample URLs
- [ ] Write `README.md` with setup instructions
- [ ] Create `DEPLOY.md` for Render / Fly.io

## Copilot Instructions
- Follow this plan sequentially; after completing each phase, verify with the PRD requirements.
- Use modern async/await, try/catch blocks, and proper HTTP status codes.
- For external API calls, implement timeouts and fallbacks (e.g., if Cloudflare fails, degrade gracefully).
- Keep environment variables in `.env.example`.
- Write clear comments, especially near business logic.
- After finishing the scaffolding, produce a `sample-scaffold` directory with all files and folders.

## Acceptance Criteria (from PRD)
- Valid URL → returns JSON with credibility_score, verdict, ai_detection, fact_check, legal_insights, explanation.
- Invalid URL → 400 with error_code.
- Unreachable URL → 400 URL_UNREACHABLE.
- Rate limit → 429 after 10 requests/min.
- Cached result → returns quickly with `cache_hit: true`.