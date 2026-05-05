const { URL } = require('url');

function mapFactCheckVerdict(verdict) {
  if (!verdict) return 0.5;
  const normalized = String(verdict).toLowerCase();
  if (normalized.includes('false') || normalized.includes('debunk')) return 0.1;
  if (normalized.includes('misleading') || normalized.includes('partially')) return 0.35;
  if (normalized.includes('true') || normalized.includes('correct') || normalized.includes('verified')) return 0.85;
  return 0.55;
}

function mapSentimentScore(score) {
  if (typeof score !== 'number') return 0.5;
  return Math.max(0, Math.min(1, score));
}

function calculateSourceReputation(urlValue) {
  try {
    const parsed = new URL(urlValue);
    const hostname = parsed.hostname.toLowerCase();
    const reputable = [
      'news.google.com',
      'cnn.com',
      'nytimes.com',
      'bbc.com',
      'gmanetwork.com',
      'rappler.com',
      'abs-cbn.com',
      'philstar.com',
      'manilatimes.net',
      'inquirer.net',
    ];
    if (reputable.some((domain) => hostname.includes(domain))) {
      return 0.95;
    }
    if (hostname.endsWith('.gov.ph')) {
      return 0.9;
    }
    return 0.6;
  } catch (error) {
    return 0.6;
  }
}

function getVerdict(score) {
  if (score < 40) return 'Misleading';
  if (score < 65) return 'Questionable';
  return 'Likely credible';
}

function getLabel(score) {
  if (score < 40) return 'Low credibility';
  if (score < 70) return 'Moderate credibility';
  return 'High credibility';
}

function computeScore({ aiProbability, factCheckVerdict, sentimentScore, sourceUrl }) {
  const aiComponent = 1 - (aiProbability / 100);
  const factComponent = mapFactCheckVerdict(factCheckVerdict);
  const sentimentComponent = mapSentimentScore(sentimentScore);
  const sourceComponent = calculateSourceReputation(sourceUrl);

  const total =
    aiComponent * 0.3 +
    factComponent * 0.4 +
    sourceComponent * 0.15 +
    sentimentComponent * 0.15;

  const score = Math.round(Math.max(0, Math.min(100, total * 100)));

  return {
    score,
    verdict: getVerdict(score),
    label: getLabel(score),
  };
}

module.exports = {
  computeScore,
};
