const { fetchHTML, extractMainContent } = require('../services/contentExtractor');
const cacheService = require('../services/cacheService');
const aiService = require('../services/aiService');
const factCheckService = require('../services/factCheckService');
const legalEngine = require('../services/legalEngine');
const credibilityScorer = require('../services/credibilityScorer');
const explanationGenerator = require('../services/explanationGenerator');
const mediaAIDetector = require('../services/mediaAIDetector');

function isValidUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsedUrl = new URL(value.trim());
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
}

function getCacheKey(url) {
  return `analyze:${url}`;
}

function buildFallbackContent(url, reason) {
  let host = 'Unknown source';
  let pathname = '';

  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    pathname = parsed.pathname;
  } catch (error) {
    // Keep defaults when URL parsing fails unexpectedly.
  }

  const mediaHint = /\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|m4v)(\?|$)/i.test(url)
    ? 'The link appears to point to direct media.'
    : 'The link may require login or block automated access.';

  return {
    title: `Limited analysis for ${host}`,
    excerpt: reason,
    text: `Limited analysis only. ${mediaHint} URL: ${url} Path: ${pathname || '/'}`,
    content_html: '',
    images: [],
    videos: [],
  };
}

async function analyzeUrl(req, res, next) {
  try {
    const { url } = req.body || {};

    if (!url || !isValidUrl(url)) {
      const error = new Error('URL format is invalid');
      error.status = 400;
      error.code = 'INVALID_URL';
      return next(error);
    }

    const cacheKey = getCacheKey(url);
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({ ...cachedResult, cache_hit: true });
    }

    let content;
    let fetchWarning = null;

    try {
      const html = await fetchHTML(url);
      content = extractMainContent(html, url);
    } catch (fetchError) {
      if (fetchError.code !== 'URL_UNREACHABLE') {
        throw fetchError;
      }

      fetchWarning = fetchError.message || 'Source could not be fetched. Proceeding with limited analysis.';
      content = buildFallbackContent(url, fetchWarning);
    }

    if (!content.text && content.images.length === 0 && content.videos.length === 0) {
      const error = new Error('No text or media could be extracted from the URL');
      error.status = 400;
      error.code = 'NO_CONTENT_EXTRACTED';
      return next(error);
    }

    const [aiDetection, sentiment, riskClassification, factCheck, legalInsights] = await Promise.all([
      aiService.detectAIText(content.text),
      aiService.getSentiment(content.text),
      aiService.classifyRisk(content.text, ['misinformation', 'political', 'legal risk', 'neutral']),
      factCheckService.searchFactChecks(content.text, content.title),
      legalEngine.matchLaws(`${content.title} ${content.excerpt} ${content.text}`),
    ]);

    const multimodalAiDetection = await mediaAIDetector.detectAIGeneratedContent({
      sourceUrl: url,
      content,
      aiTextProbability: aiDetection.overall_probability,
    });

    const credibility = credibilityScorer.computeScore({
      aiProbability: multimodalAiDetection.overall_probability,
      factCheckVerdict: factCheck.sources?.[0]?.verdict || factCheck.summary,
      sentimentScore: sentiment.score,
      sourceUrl: url,
    });

    const explanation = explanationGenerator.generateExplanation({
      title: content.title,
      excerpt: content.excerpt,
      aiDetection,
      multimodalAiDetection,
      sentiment,
      factCheck,
      legalInsights,
      credibilityScore: credibility.score,
      verdict: credibility.verdict,
    });

    const analysisResult = {
      url,
      credibility_score: credibility.score,
      credibility_label: credibility.label,
      verdict: credibility.verdict,
      ai_detection: aiDetection,
      ai_multimodal_detection: multimodalAiDetection,
      sentiment,
      risk_classification: riskClassification,
      fact_check: factCheck,
      legal_insights: legalInsights,
      explanation,
      disclaimer: 'This does not constitute legal advice.',
      fetch_warning: fetchWarning,
      cache_hit: false,
      processing_time_ms: Date.now() - req.startTime,
    };

    cacheService.set(cacheKey, analysisResult);
    return res.status(200).json(analysisResult);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  analyzeUrl,
};
