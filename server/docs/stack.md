# Tech Stack: Fake‑News‑Shield PH (Cloudflare Workers AI Edition)
## Version: 1.0 (Prototype – Zero Cost, Always On)
## Last Updated: [Date]

---

## 1. Overview
This stack uses **Cloudflare Workers AI** to run all AI models serverlessly at the edge. No local machine needed, no credit card required for the free tier, and the service stays online 24/7. The backend is a Cloudflare Worker, eliminating separate hosting costs.

---

## 2. Backend (Serverless)

| Component              | Free Technology                         | Justification |
|------------------------|-----------------------------------------|----------------|
| **Runtime**            | Cloudflare Workers (JavaScript/Wasm)    | 100k requests/day free, no cold starts. |
| **API Framework**      | Cloudflare Workers native `fetch` + Router (e.g., `itty-router`) | Lightweight, free. |
| **Deployment**         | `wrangler` CLI + Cloudflare dashboard   | Free. |
| **Environment**        | Cloudflare Workers Secrets / `.dev.vars` | Free. |

---

## 3. AI / NLP (via Cloudflare Workers AI – All Free)

Cloudflare Workers AI provides **50+ pre-trained models** with a generous free tier (10,000 inference requests per day).

| Task                          | Cloudflare Model ID                     | Notes |
|-------------------------------|-----------------------------------------|-------|
| **AI‑generated text detection** | `@cf/huggingface/roberta-base-openai-detector` | Free, 10k req/day. |
| **Sentiment analysis**        | `@cf/huggingface/distilbert-sst-2-int8` | Detects negative/panic tone. |
| **Text classification (zero‑shot)** | `@cf/huggingface/facebook-bart-large-mnli` | General risk classification. |
| **Keyword extraction**        | Not natively available → use `@cf/meta/llama-2-7b-chat-int8` with a prompt | Generate keywords via LLM (costs inference call). |
| **AI‑generated image detection** | Not yet in Workers AI → use external free API (e.g., HuggingFace Inference with API key) as fallback | For MVP, skip or flag as “unable to analyze image”. |
| **AI‑generated video detection** | Not available – skip for prototype | Future: use frame extraction + image detector. |
| **Explanation generation**    | `@cf/meta/llama-2-7b-chat-int8` or `@cf/mistral/mistral-7b-instruct` | Generate human-readable verdict explanation. |

### Workers AI Free Tier Limits
- **10,000 inference requests per day** – more than enough for prototype usage.
- Models run on Cloudflare’s global network, no GPU required on your side.

---

## 4. Fact‑Check & External Sources (Free)

| Source                     | Free Access Method                                    |
|----------------------------|-------------------------------------------------------|
| **Google Fact Check Tools** | 100 queries/day free (no API key required for basic). |
| **GNews API**              | 100 requests/day, no key needed for basic search.    |
| **PAGASA advisories**      | RSS feed – free.                                     |
| **News search fallback**   | Use `@cf/meta/llama` to summarise search results (costs inference). |

---

## 5. Database & Caching (Free)

| Purpose               | Free Technology                     | Notes |
|-----------------------|-------------------------------------|-------|
| **Cache**             | Cloudflare Workers KV (1GB, 100k reads/day free) | Store analysis results for 24h. |
| **Persistent storage** | Cloudflare D1 (SQLite, 5GB free) **or** Supabase free tier | D1 is fully integrated with Workers. |
| **Law dataset**       | Static JSON imported into Worker or stored in KV | Free. |

---

## 6. Frontend (Chrome Extension & Webpage)

| Component                | Free Technology                         | Notes |
|--------------------------|-----------------------------------------|-------|
| **Chrome Extension**     | Manifest V3, vanilla JS                 | Free. |
| **Extension UI (Popup)** | HTML5, CSS3                             | Free. |
| **Webpage (SPA)**        | React + Vite (host on Vercel free)      | Free. |
| **HTTP Client**          | `fetch` API                             | Free. |
| **Hosting**              | Vercel (webpage) / Chrome Web Store (extension) | Free (extension sideloading). |

---

## 7. Complete System Architecture
[Chrome Extension / Webpage]
│
▼
Cloudflare Worker (backend)
├─ Receives URL → fetches content
├─ Extracts text & image URLs
├─ Calls Workers AI models:
│ ├─ roberta-base-openai-detector (AI text?)
│ ├─ distilbert-sst-2 (sentiment)
│ ├─ facebook-bart-large-mnli (classification)
│ └─ llama-2-7b-chat (explanation)
├─ Calls Google Fact Check API (external)
├─ Matches laws from KV/D1 dataset
├─ Caches result in Workers KV (24h)
└─ Returns JSON response


---

## 8. Cost Summary – $0

| Service                         | Free Tier Limit                          | Prototype Usage |
|---------------------------------|------------------------------------------|-----------------|
| Cloudflare Workers             | 100k requests/day                        | ✅ More than enough |
| Workers AI                     | 10k inference requests/day               | ✅ 300k/month |
| Workers KV                     | 1GB storage, 1M reads/month              | ✅ Small cache |
| D1 Database                    | 5GB storage, 5M reads/month              | ✅ Law dataset |
| Google Fact Check API          | 100 queries/day (3k/month)               | ✅ Fine for demo |
| Vercel (webpage)               | 100GB bandwidth/month                    | ✅ Free |
| **Total monthly cost**         | **$0.00**                                | ✅ Production prototype |

No credit card required for Cloudflare free tier (email signup only).

---

## 9. Limitations & Workarounds (Prototype)

| Limitation | Workaround |
|------------|-------------|
| No AI image detection in Workers AI | Use external free API (HuggingFace Inference) with its own limits, or skip for MVP and add later. |
| No video deepfake detection | Skip for MVP; mark as “not analyzed”. |
| LLM (Llama 2) is 7B, slower than GPT but free | Acceptable for explanation generation; use shorter prompts. |
| Workers AI may have cold start (first request per model per region) | Minimal impact for prototype. |

---

## 10. Getting Started (API Key Setup)

1. **Create Cloudflare account** (free, no credit card).
2. **Enable Workers AI** in dashboard.
3. **Install Wrangler CLI**.
4. **Write Worker script** that:
   - Parses URL from request.
   - Fetches and extracts content.
   - Calls Workers AI models via `env.AI.run()`.
   - Caches result in KV.
5. **Deploy** with `wrangler deploy`.

No need to manage your own server, no local machine requirement.

---

## 11. Future Enhancements (Post‑MVP)

- Add **image AI detection** when Cloudflare adds those models.
- Add **user feedback** to improve model selection.

---
