const axios = require('axios');
const { GNEWS_API_KEY, GOOGLE_FACT_CHECK_API_KEY } = require('../config/config');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'your', 'about', 'their', 'they', 'will', 'would', 'there', 'which', 'when', 'what', 'where', 'who', 'how', 'why', 'been', 'before', 'after', 'while', 'also', 'more', 'than', 'them', 'then', 'these', 'those',
]);

function extractKeywords(text, maxTerms = 10) {
  if (!text) return [];
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  const frequency = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([word]) => word);
}

function buildQuery(text, title) {
  const terms = extractKeywords(`${title || ''} ${text}`, 8);
  return terms.length ? terms.join(' ') : title || text.slice(0, 100);
}

// PRIMARY: GNEWS API
async function searchGNEWS(query) {
  if (!query || !GNEWS_API_KEY) {
    return null;
  }

  try {
    const response = await axios.get('https://gnews.io/api/v4/search', {
      params: {
        q: query,
        lang: 'en',
        sortby: 'relevancy',
        limit: 10,
        apikey: GNEWS_API_KEY,
      },
      timeout: 12000,
    });

    const articles = response.data.articles || [];
    if (!articles.length) return null;

    const sources = articles.slice(0, 5).map((article) => ({
      title: article.title || 'News article',
      url: article.url || article.link || null,
      verdict: article.source?.name || 'News source',
      description: article.description || '',
      publishedAt: article.publishedAt || null,
    }));

    return {
      summary: `Found ${sources.length} relevant news article(s) from GNews for: ${query}`,
      sources,
      source_name: 'GNews',
    };
  } catch (error) {
    return null;
  }
}

// PRIMARY FALLBACK: Zero-API-Key Web Search
async function searchZeroWebSearch(query) {
  if (!query) return null;

  try {
    const response = await axios.get('https://zero.no-api.com/api/search', {
      params: {
        query,
        format: 'json',
        max_results: 10,
      },
      timeout: 12000,
    });

    const results = response.data.results || [];
    if (!results.length) return null;

    const sources = results.slice(0, 5).map((result) => ({
      title: result.title || 'Web result',
      url: result.url || result.link || null,
      verdict: result.snippet || result.description || 'Web source',
      description: result.snippet || '',
    }));

    return {
      summary: `Found ${sources.length} relevant web result(s) for: ${query}`,
      sources,
      source_name: 'Zero Web Search',
    };
  } catch (error) {
    return null;
  }
}

// SECONDARY FALLBACK: Google Fact Check API
async function searchGoogleFactCheck(query) {
  if (!query) return null;

  try {
    const response = await axios.get('https://factchecktools.googleapis.com/v1alpha1/claims:search', {
      params: {
        query,
        languageCode: 'en-US',
        ...(GOOGLE_FACT_CHECK_API_KEY && { key: GOOGLE_FACT_CHECK_API_KEY }),
      },
      timeout: 12000,
    });

    const claims = response.data.claims || [];
    if (!claims.length) return null;

    const sources = claims.slice(0, 5).map((claim) => {
      const review = claim.claimReview?.[0] || {};
      return {
        title: claim.text || review.title || 'Fact check entry',
        url: review.url || review.publisher?.site || null,
        verdict: review.textualRating || review.title || 'Unknown',
        description: claim.claimant || review.publisher?.name || '',
      };
    });

    return {
      summary: `Found ${sources.length} fact-check result(s) from Google for: ${query}`,
      sources,
      source_name: 'Google Fact Check',
    };
  } catch (error) {
    return null;
  }
}

// CASCADE: Try GNEWS → Zero Web Search → Google Fact Check
async function searchFactChecks(text, title) {
  const query = buildQuery(text, title);
  if (!query) {
    return {
      summary: 'No fact-check query could be constructed from the content.',
      sources: [],
      source_name: 'None',
    };
  }

  // Try primary: GNEWS
  let result = await searchGNEWS(query);
  if (result) return result;

  // Try primary fallback: Zero Web Search
  result = await searchZeroWebSearch(query);
  if (result) return result;

  // Try secondary fallback: Google Fact Check
  result = await searchGoogleFactCheck(query);
  if (result) return result;

  // If all fail
  return {
    summary: 'Fact-check service is unavailable. Try again later.',
    sources: [],
    source_name: 'None',
  };
}

module.exports = {
  searchFactChecks,
};

