function generateExplanation({ title, excerpt, aiDetection, multimodalAiDetection, sentiment, factCheck, legalInsights, credibilityScore, verdict }) {
  const explanationLines = [
    `This analysis scored the content at ${credibilityScore}/100, resulting in a verdict of ${verdict}.`,
  ];

  if (title) {
    explanationLines.push(`Title: ${title}.`);
  }

  if (excerpt) {
    explanationLines.push(`Excerpt: ${excerpt.slice(0, 180)}...`);
  }

  explanationLines.push(
    `AI text detection indicates ${aiDetection.text.is_ai ? 'AI-generated text' : 'human-like text'} with ${aiDetection.text.confidence}% confidence.`
  );

  if (multimodalAiDetection) {
    explanationLines.push(
      `Multimodal AI risk is ${multimodalAiDetection.overall_probability}% (${multimodalAiDetection.overall_level}) across text, image, and video signals.`
    );
  }

  if (sentiment && sentiment.label) {
    explanationLines.push(`Sentiment analysis found ${sentiment.label.toLowerCase()} tone.`);
  }

  if (factCheck.sources?.length) {
    explanationLines.push(`Fact-check found ${factCheck.sources.length} related source(s): ${factCheck.sources
      .map((item) => item.verdict || item.title)
      .join(', ')}.`);
  } else {
    explanationLines.push('No related fact-check sources were identified for this content.');
  }

  if (legalInsights.length) {
    explanationLines.push(`Legal insights referenced ${legalInsights.length} Philippine law item(s).`);
  }

  explanationLines.push('This information does not constitute legal advice.');

  return explanationLines.join(' ');
}

module.exports = {
  generateExplanation,
};
