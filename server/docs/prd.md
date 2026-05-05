# Backend PRD: Fake‑News‑Shield PH (Node.js + Express Edition)

## Version: 1.0 (Backend Core)

## Last Updated: [Date]

---

## 1. Overview

The backend powers both a **Chrome extension** and a **webpage** (SPA). It is built with **Node.js + Express** and runs on a free hosting service (e.g., Render, Fly.io, or Cyclic). It accepts a URL, extracts all content (text, images, videos), detects AI‑generated elements, performs fact‑checking against external sources, and returns a credibility score, verdict, legal context, and supporting evidence.

**Key Goals:**

- Provide accurate, explainable misinformation detection.
- Operate within **free tiers** of hosting + external APIs (Hugging Face Inference, Google Fact Check).
- Cache results for 24 hours to reduce repeated processing.
- Enforce rate limiting for fair usage.

---

## 2. Backend API (REST)

### 2.1 Endpoint

**`POST /api/v1/analyze`**

### 2.2 Request Headers

| Header                 | Value                          | Required |
| ---------------------- | ------------------------------ | -------- |
| `Content-Type`         | `application/json`             | Yes      |
| `X-API-Key` (optional) | For future authenticated users | No (MVP) |

### 2.3 Request Body

````json
{
  "url": "https://example.com/news/post"
}
2.4 Successful Response (200 OK)
json
{
  "credibility_score": 35,
  "credibility_label": "Low credibility",
  "verdict": "Misleading",
  "ai_detection": {
    "overall_probability": 87,
    "text": { "is_ai": true, "confidence": 92 },
    "images": [
      { "url": "...", "is_ai_generated": true, "confidence": 78 }
    ],
    "videos":
wait i thought cloudfare workers is for ai orchestration anad I will use express node as for backend endpoints
We need to clarify: The user wants Express/Node for backend endpoints, and Cloudflare Workers for AI orchestration (i.e., calling AI models). That's a hybrid approach: Node.js backend (hosted on Render/Fly.io) that calls Cloudflare Workers AI API for inference. That's fine and keeps AI free. The user's previous concern about local machine was resolved by Cloudflare Workers AI being cloud-based. So the backend PRD should reflect: Node.js/Express as the main API server, which internally calls Cloudflare Workers AI endpoints for AI tasks. Let me produce a corrected backend PRD that uses Node.js + Express for the API, and integrates Cloudflare Workers AI via HTTP calls (using their REST API). Also keep free hosting for Node app (Render, etc.). I'll write a clean, corrected PRD in .md format.

You're right — let me clarify the architecture:

Node.js + Express = Your main backend server (handles routes, URL fetching, content extraction, orchestration, caching, rate limiting).

Cloudflare Workers AI = Used only as an AI inference API (you call it from your Node backend to run models like text detection, sentiment, etc.).

This is a clean hybrid: you keep control of your business logic in Node.js/Express, but offload expensive AI inference to Cloudflare's free tier. No local GPU, no OpenAI costs.

Below is the corrected, improved backend PRD for Node.js + Express that calls Cloudflare Workers AI.

Save as Backend_PRD_FakeNewsShield_Node_CF.md.

markdown
# Backend PRD: Fake‑News‑Shield PH (Node.js + Express + Cloudflare Workers AI)
## Version: 1.0 (Backend Core)
## Last Updated: [Date]

---

## 1. Overview
The backend is a **Node.js + Express** server that powers both a Chrome extension and a webpage. It accepts a URL, fetches and extracts content (text, images, videos), then calls **Cloudflare Workers AI** (free tier) for AI‑generated text detection, sentiment analysis, and explanation generation. It also integrates Google Fact Check API and a local Philippine law dataset. Results are cached for 24 hours.

**Why this hybrid?**
- Node.js/Express gives you full control over business logic, routing, caching, and rate limiting.
- Cloudflare Workers AI provides free, serverless AI inference (no GPU, no local machine, no OpenAI cost).
- Both can run on free hosting (Node backend on Render/Fly.io, AI calls to Cloudflare).

---

## 2. Backend API (REST)

### 2.1 Endpoint
**`POST /api/v1/analyze`**

### 2.2 Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |

### 2.3 Request Body
```json
{
  "url": "https://example.com/news/post"
}
````

### 2.4 Successful Response (200 OK)

```json
{
  "credibility_score": 35,
  "credibility_label": "Low credibility",
  "verdict": "Misleading",
  "ai_detection": {
    "overall_probability": 87,
    "text": { "is_ai": true, "confidence": 92 },
    "images": [{ "url": "...", "is_ai_generated": true, "confidence": 78 }],
    "videos": [
      {
        "url": "...",
        "is_ai_generated": false,
        "confidence": 12,
        "reason": "No deepfake model applied (MVP)"
      }
    ]
  },
  "fact_check": {
    "summary": "The claim about a typhoon evacuation order is false.",
    "sources": [
      { "title": "PAGASA advisory", "url": "...", "verdict": "False" }
    ]
  },
  "legal_insights": [
    {
      "law": "Cybercrime Prevention Act (RA 10175)",
      "explanation": "Spreading false information that causes panic may be penalized."
    }
  ],
  "explanation": "The post uses panic language, the main image is AI‑generated, and no credible news outlet reports this event.",
  "disclaimer": "This does not constitute legal advice.",
  "cache_hit": false,
  "processing_time_ms": 4850
}
```

### 2.5 Error Responses

| Status | Code                   | Message                                | When                                 |
| ------ | ---------------------- | -------------------------------------- | ------------------------------------ |
| 400    | INVALID_URL            | "URL format is invalid"                | Malformed or non‑http(s) URL         |
| 400    | URL_UNREACHABLE        | "Could not fetch content from URL"     | Timeout, DNS failure, blocked        |
| 400    | NO_CONTENT_EXTRACTED   | "No text or media found"               | Empty page                           |
| 429    | RATE_LIMIT_EXCEEDED    | "Too many requests. Try again later."  | >10 requests per IP per minute       |
| 500    | INTERNAL_ERROR         | "An unexpected error occurred"         | Unhandled exception                  |
| 503    | AI_SERVICE_UNAVAILABLE | "AI detection temporarily unavailable" | Cloudflare AI quota exceeded or down |

**Error response format:**

```json
{
  "error_code": "INVALID_URL",
  "message": "URL format is invalid",
  "retry_after_seconds": null
}
```

## 3. Core Functional Requirements (FR)

| ID     | Requirement                                                                                                                                                | Priority |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR‑B1  | Fetch HTML from URL using axios or node-fetch; extract text (using readability or cheerio), image URLs, video URLs.                                        | P0       |
| FR‑B2  | Call Cloudflare Workers AI REST API from Node.js to run @cf/huggingface/roberta-base-openai-detector on extracted text. Return probability (0–1).          | P0       |
| FR‑B3  | For each image URL, optionally call a free AI image detector (e.g., HuggingFace Inference API) if Cloudflare Workers AI lacks one. MVP can skip with note. | P1       |
| FR‑B4  | For videos: extract metadata only. No deepfake detection in MVP.                                                                                           | P2       |
| FR‑B5  | Use Google Fact Check API (free tier: 100 queries/day) to find fact‑check articles matching keywords extracted from content.                               | P0       |
| FR‑B6  | Compute credibility score (0–100) using weighted sum: AI probability (30%), fact‑check result (40%), source domain reputation (15%), sentiment/tone (15%). | P0       |
| FR‑B7  | Match content to Philippine laws using a local ph_laws.json keyword dataset. Return up to 3 relevant laws with simplified explanations.                    | P0       |
| FR‑B8  | Generate human‑readable explanation by combining template with AI results. Optionally call Cloudflare Workers AI @cf/meta/llama-2-7b-chat-int8 to enhance. | P0       |
| FR‑B9  | Cache final response in Node.js (in‑memory with node-cache or Redis) for 24 hours using URL hash as key.                                                   | P0       |
| FR‑B10 | Enforce rate limiting per IP using express-rate-limit (10 requests per minute).                                                                            | P0       |

---

## 4. Non‑Functional Requirements (NFR)

| ID    | Requirement                                            | Target                | Measurement     |
| ----- | ------------------------------------------------------ | --------------------- | --------------- |
| NFR‑1 | End‑to‑end response time (including external AI calls) | ≤12 sec (p95)         | Logs            |
| NFR‑2 | AI text detection precision                            | ≥80%                  | Manual test set |
| NFR‑3 | Fact‑check API success rate (non‑error)                | ≥70%                  | Logs            |
| NFR‑4 | Node.js backend uptime (hosted on free tier)           | 99% (allow for sleep) | UptimeRobot     |
| NFR‑5 | No permanent storage of user URLs                      | GDPR‑compliant        | Code review     |
| NFR‑6 | Concurrent users                                       | 50 (free tier limit)  | Load test       |
| NFR‑7 | Cache hit rate                                         | ≥40%                  | Cache stats     |

---

## 5. OOD Key Classes (Node.js)

```
AnalyzeController (Express route handler)
  └─ uses UrlFetcher (axios + cheerio)
  └─ uses ContentExtractor (text, images, videos)
  └─ uses AIDetectorOrchestrator
       ├─ TextAIDetector (calls Cloudflare Workers AI REST API)
       ├─ ImageAIDetector (external fallback)
       └─ VideoAIDetector (metadata only)
  └─ uses FactCheckSearcher (Google Fact Check API)
  └─ uses CredibilityScorer (weighted sum)
  └─ uses LegalEngine (ph_laws.json matching)
  └─ uses ExplanationGenerator (template + optional LLM)
  └─ returns AnalysisResult
  └─ caches result (node-cache)
```

---

## 6. Data Storage & Caching

| Store                     | Technology                       | Purpose                                 | Limits (free)           |
| ------------------------- | -------------------------------- | --------------------------------------- | ----------------------- |
| In‑memory cache           | node-cache                       | Store analysis results for 24h          | Unlimited (RAM bound)   |
| Law dataset               | ph_laws.json (loaded at startup) | Keyword‑law mapping                     | None                    |
| Optional persistent cache | Redis (Upstash free tier)        | If memory needs persist across restarts | 100MB, 10k commands/day |

---

## 7. External Services (Free Tiers)

| Service                          | Purpose                           | Free Limit                  | Integration                            |
| -------------------------------- | --------------------------------- | --------------------------- | -------------------------------------- |
| Cloudflare Workers AI            | AI text detection, sentiment, LLM | 10k inferences/day          | REST API (need Account ID + API token) |
| Google Fact Check API            | Fact‑check lookup                 | 100 queries/day             | REST API (no key needed for basic)     |
| HuggingFace Inference (fallback) | AI image detection                | 30k requests/month          | REST API with free token               |
| Node.js hosting (Render)         | Backend deployment                | 750 hours/month, spins down | Web service                            |

---

## 8. Environment Variables (.env)

```bash
PORT=3000
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_AI_GATEWAY=optional
GOOGLE_FACT_CHECK_API_KEY=optional (not required for basic)
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## 9. Node.js Backend Hosting (Free Options)

| Provider | Free Tier Limits                                | Best For                           |
| -------- | ----------------------------------------------- | ---------------------------------- |
| Render   | 750 hours/month, web service sleeps after 15min | Easy deploy from GitHub            |
| Fly.io   | 3 shared VMs, 256MB RAM each                    | Always‑on but limited              |
| Cyclic   | 1 app, 1GB RAM, spins down                      | Very simple but slower cold starts |

**Recommendation:** Render (free) for MVP. The service may sleep, but first request after sleep will have ~5‑10s cold start.

---

## 10. Success Metrics (Backend‑focused)

| Metric                    | Target       | How to Measure               |
| ------------------------- | ------------ | ---------------------------- |
| p95 response time         | ≤12 sec      | Custom logging + middleware  |
| AI inference success rate | ≥95%         | Logs of Cloudflare API calls |
| Fact‑check API hit rate   | ≥70%         | Logs                         |
| Cache hit rate            | ≥40%         | node-cache stats             |
| Error rate (5xx)          | <1%          | Sentry free tier             |
| Rate‑limited requests     | <5% of total | Log 429s                     |

---

## 11. Security & Privacy

| Area                 | Implementation                                           |
| -------------------- | -------------------------------------------------------- |
| URL validation       | Regex `^https?://` + `new URL()`                         |
| Prevent SSRF         | Use axios with httpAgent to block private IPs (optional) |
| No permanent logging | Do not store full URL bodies; only hashes                |
| CORS                 | Restrict to extension ID + webpage origin                |
| Rate limiting        | express-rate-limit on /api routes                        |

---

## 12. Acceptance Criteria (Sample)

| Scenario                         | Input                                | Expected Output                                   |
| -------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Valid URL with AI‑generated text | `https://example.com/ai-post`        | `ai_detection.text.is_ai = true`, confidence >80% |
| URL unreachable                  | `https://nonexistent.xyz`            | 400 `URL_UNREACHABLE`                             |
| Rate limit                       | 11 requests in 1 minute from same IP | 429 after 10th                                    |
| Cached result                    | Same URL twice                       | Second response has `cache_hit: true`, faster     |
| Fact‑check match                 | URL with known false claim           | `fact_check.sources` non‑empty                    |

---

## 13. Future Enhancements (Post‑MVP)

- Batch analysis endpoint for feed scanning
- Persistent Redis cache across restarts (Upstash free)
- Image AI detection using Cloudflare Workers AI (if model added)
- Video deepfake via external API
- User API keys for higher rate limits
