const axios = require('axios');
const { GOOGLE_FACT_CHECK_API_KEY } = require('../config');

const STOP_WORDS = new Set([
  'the','and','for','with','that','this','from','have','your','about','their','they','will','would','there','which','when','what','where','who','how','why','been','before','after','while','also','more','than','them','then','these','those',
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

async function searchFactChecks(text, title) {
  const query = buildQuery(text, title);
  if (!query) {
    return {
      summary: 'No fact-check query could be constructed from the content.',
      sources: [],
    };
  }

  const apiUrl = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
  const params = { query, languageCode: 'en-US' };
  if (GOOGLE_FACT_CHECK_API_KEY) {
    params.key = GOOGLE_FACT_CHECK_API_KEY;
  }

  try {
    const response = await axios.get(apiUrl, { params, timeout: 15000 });
    const claims = response.data.claims || [];

    if (!claims.length) {
      return {
        summary: 'No relevant fact-check results were found for this content.',
        sources: [],
      };
    }

    const sources = claims.slice(0, 3).map((claim) => {
      const review = claim.claimReview?.[0] || {};
      return {
        title: claim.text || review.title || 'Fact check entry',
        url: review.url || review.publisher?.site || null,
        verdict: review.textualRating || review.title || 'Unknown',
      };
    });

    return {
      summary: `Found ${sources.length} fact-check result(s) related to the query: ${query}.`,
      sources,
    };
  } catch (error) {
    return {
      summary: 'Fact-check service is unavailable or returned no results.',
      sources: [],
    };
  }
}

module.exports = {
  searchFactChecks,
};
