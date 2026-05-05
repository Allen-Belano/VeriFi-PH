const laws = require('../data/ph_laws.json');

function matchLaws(text) {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const matches = laws
    .map((law) => {
      const keywordMatches = law.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
      return {
        ...law,
        matchCount: keywordMatches.length,
      };
    })
    .filter((law) => law.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 3)
    .map(({ law, explanation }) => ({ law, explanation }));

  return matches;
}

module.exports = {
  matchLaws,
};
