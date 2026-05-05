const axios = require('axios');
const {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_AI_GATEWAY,
} = require('../config/config');

const baseUrl = CLOUDFLARE_AI_GATEWAY ||
  `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/ai`;

function parseCloudflareOutput(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (result.output_text) return result.output_text;
  if (Array.isArray(result.output)) {
    const first = result.output[0];
    if (first?.content) {
      if (typeof first.content === 'string') return first.content;
      if (Array.isArray(first.content)) {
        return first.content
          .map((item) => item?.text || item?.value || '')
          .filter(Boolean)
          .join(' ')
          .trim();
      }
    }
  }
  return JSON.stringify(result);
}

async function callCloudflareModel(model, input, parameters = {}) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }

  const endpoint = `${baseUrl}/text/generate`;
  const payload = {
    model,
    input,
    ...parameters,
  };

  const response = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  return parseCloudflareOutput(response.data?.result || response.data);
}

function normalizeProbability(raw) {
  if (raw == null) return 0;
  const match = String(raw).match(/(\d+(?:\.\d+)?)%?/);
  if (match) {
    const value = Number(match[1]);
    if (!Number.isNaN(value)) {
      return Math.max(0, Math.min(100, value));
    }
  }
  return 0;
}

function interpretAiDetection(output) {
  const normalized = output.toLowerCase();
  if (normalized.includes('ai-generated') || normalized.includes('likely ai')) {
    return { is_ai: true, confidence: normalizeProbability(output) || 75 };
  }
  if (normalized.includes('human-written') || normalized.includes('likely human')) {
    return { is_ai: false, confidence: 100 - (normalizeProbability(output) || 20) };
  }
  const probability = normalizeProbability(output);
  return { is_ai: probability > 50, confidence: probability || 50 };
}

function interpretSentiment(output) {
  const normalized = output.toLowerCase();
  if (normalized.includes('negative') || normalized.includes('neg')) {
    return { label: 'NEGATIVE', score: 0.2 };
  }
  if (normalized.includes('positive') || normalized.includes('pos')) {
    return { label: 'POSITIVE', score: 0.8 };
  }
  if (normalized.includes('neutral')) {
    return { label: 'NEUTRAL', score: 0.55 };
  }
  const probability = normalizeProbability(output) / 100;
  return { label: 'UNKNOWN', score: probability || 0.5 };
}

async function detectAIText(text) {
  if (!text) {
    return {
      overall_probability: 0,
      text: { is_ai: false, confidence: 0 },
    };
  }

  try {
    const output = await callCloudflareModel('@cf/huggingface/roberta-base-openai-detector', text, {
      parameters: { max_output_tokens: 64 },
    });
    const interpreted = interpretAiDetection(output);
    return {
      overall_probability: interpreted.confidence,
      text: interpreted,
    };
  } catch (error) {
    return {
      overall_probability: 0,
      text: { is_ai: false, confidence: 0 },
      error: 'AI_SERVICE_UNAVAILABLE',
    };
  }
}

async function getSentiment(text) {
  if (!text) {
    return { label: 'UNKNOWN', score: 0.5 };
  }

  try {
    const output = await callCloudflareModel('@cf/huggingface/distilbert-sst-2-int8', text, {
      parameters: { max_output_tokens: 20 },
    });
    return interpretSentiment(output);
  } catch (error) {
    return { label: 'UNKNOWN', score: 0.5, error: 'AI_SERVICE_UNAVAILABLE' };
  }
}

async function classifyRisk(text, candidateLabels = []) {
  if (!text || candidateLabels.length === 0) {
    return { label: 'unknown', confidence: 0 };
  }

  const prompt = `Classify the following text into one of these categories: ${candidateLabels.join(', ')}.\n\nText:\n${text}`;

  try {
    const output = await callCloudflareModel('@cf/huggingface/facebook-bart-large-mnli', prompt, {
      parameters: { max_output_tokens: 64 },
    });

    const normalized = output.toLowerCase();
    const chosen = candidateLabels.find((label) => normalized.includes(label.toLowerCase())) || 'unknown';
    return { label: chosen, confidence: normalizeProbability(output) || 50 };
  } catch (error) {
    return { label: 'unknown', confidence: 0, error: 'AI_SERVICE_UNAVAILABLE' };
  }
}

async function generateExplanation(payload) {
  const { title, text, verdict, credibilityScore, aiDetection, factCheck, legalInsights } = payload;
  const fallback = `The analysis found a credibility score of ${credibilityScore} and judged the content as ${verdict}. AI detection indicates ${aiDetection.text.is_ai ? 'AI-generated text' : 'human-like text'} with ${aiDetection.text.confidence}% confidence. Fact check returned ${factCheck.sources.length} related sources. Legal insights matched ${legalInsights.length} Philippine law items.`;

  if (!text || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return fallback;
  }

  try {
    const prompt = `You are a backend analysis assistant. Summarize why a piece of content received a credibility score of ${credibilityScore} and the verdict ${verdict}. Mention AI detection, fact-check findings, and any relevant Philippine legal insights without giving legal advice.\n\nTitle: ${title}\n\nExcerpt: ${text.slice(0, 300)}\n\nFact Check Summary: ${factCheck.summary}\n\nLegal Insights: ${legalInsights.map((item) => item.law).join('; ')}`;
    const output = await callCloudflareModel('@cf/meta/llama-2-7b-chat-int8', prompt, {
      parameters: { max_output_tokens: 180 },
    });
    return output || fallback;
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  detectAIText,
  getSentiment,
  classifyRisk,
  generateExplanation,
};
