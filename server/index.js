const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 4000;

// In-memory posts store (start empty to simulate real-time)
let posts = [];
let nextId = 1;

function parseEngagementNumber(rawValue) {
  if (!rawValue) return 0;
  const normalized = String(rawValue).trim().replace(/,/g, '');
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([kKmMbB])?/);
  if (!match) return 0;

  let value = parseFloat(match[1]);
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'k') value *= 1_000;
  if (suffix === 'm') value *= 1_000_000;
  if (suffix === 'b') value *= 1_000_000_000;

  return Number.isFinite(value) ? Math.round(value) : 0;
}

function extractMetaContent(html, expression) {
  const match = html.match(expression);
  return match?.[1]?.trim() || '';
}

function stripHtml(input) {
  if (!input) return '';
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPlatformFromUrl(urlValue) {
  const hostname = new URL(urlValue).hostname.toLowerCase();
  if (hostname.includes('facebook.com')) return 'facebook';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  return 'web';
}

function inferMetricsFromHtml(html) {
  const lower = html.toLowerCase();
  const likes = parseEngagementNumber(
    extractMetaContent(html, /(?:likes?|reactions?)[:\s]+([\d,.]+\s*[kmb]?)/i)
  );
  const comments = parseEngagementNumber(
    extractMetaContent(html, /(?:comments?|replies?)[:\s]+([\d,.]+\s*[kmb]?)/i)
  );
  const shares = parseEngagementNumber(
    extractMetaContent(html, /(?:shares?|reposts?)[:\s]+([\d,.]+\s*[kmb]?)/i)
  );

  return {
    likes,
    comments,
    shares,
    retweets: parseEngagementNumber(
      extractMetaContent(html, /(?:retweets?|reposts?)[:\s]+([\d,.]+\s*[kmb]?)/i)
    ),
    replies: comments,
    isVerified: /verified|blue check|badge/i.test(lower),
    engagementRate: 0,
  };
}

async function extractPostFromUrl(postUrl) {
  const response = await fetch(postUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch URL (status ${response.status})`);
  }

  const html = await response.text();

  const title = extractMetaContent(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    || extractMetaContent(html, /<title>([^<]+)<\/title>/i);
  const description = extractMetaContent(
    html,
    /<meta\s+(?:name|property)=["'](?:description|og:description|twitter:description)["']\s+content=["']([^"']+)["']/i
  );
  const author = extractMetaContent(
    html,
    /<meta\s+(?:name|property)=["'](?:author|article:author|og:site_name)["']\s+content=["']([^"']+)["']/i
  );

  const fallbackBody = stripHtml(html).slice(0, 500);
  const content = [description, title].filter(Boolean).join(' — ') || fallbackBody || 'Post content unavailable';

  return {
    user: author || 'Unknown Source',
    content: content.slice(0, 1000),
    platform: detectPlatformFromUrl(postUrl),
    sourceUrl: postUrl,
    metrics: inferMetricsFromHtml(html),
  };
}

function analyzePostContent(content, metrics = {}) {
  // Use REAL PLATFORM METRICS for credibility instead of heuristics
  
  const {
    likes = 0,
    comments = 0,
    shares = 0,
    retweets = 0,
    replies = 0,
    isVerified = false,
    engagementRate = 0,
    platform = 'unknown',
  } = metrics;

  // Total engagement from platform
  const totalEngagement = likes + comments + shares + retweets + replies;

  // Start with base score
  let credibilityScore = 50;

  // Factor 1: Engagement (high engagement = more likely real/trusted)
  if (totalEngagement > 10000) credibilityScore += 25;
  else if (totalEngagement > 1000) credibilityScore += 20;
  else if (totalEngagement > 100) credibilityScore += 15;
  else if (totalEngagement > 10) credibilityScore += 8;
  else if (totalEngagement === 0) credibilityScore -= 15; // No engagement = suspicious

  // Factor 2: Verified status (blue checkmark = more credible)
  if (isVerified) credibilityScore += 20;

  // Factor 3: Engagement rate (proportion of interaction)
  if (engagementRate > 0.8) credibilityScore += 10;
  else if (engagementRate > 0.5) credibilityScore += 5;

  // Factor 4: Content length (very short posts often spam)
  const contentLength = content?.length || 0;
  if (contentLength > 500) credibilityScore += 5;
  else if (contentLength < 20) credibilityScore -= 10;

  // Ensure score is between 0-100
  credibilityScore = Math.max(0, Math.min(100, credibilityScore));

  // Determine if flagged (low credibility)
  const isFlagged = credibilityScore < 40;

  // Determine fact-check verdict based on content keywords
  let factCheck = 'Unknown';
  const lowerContent = content?.toLowerCase() || '';

  if (lowerContent.includes('vaccine') || lowerContent.includes('booster')) {
    factCheck = isFlagged ? 'Potentially Misleading' : 'True';
  } else if (lowerContent.includes('outbreak') || lowerContent.includes('virus')) {
    factCheck = isFlagged ? 'False' : 'Partially True';
  } else if (lowerContent.includes('atm') || lowerContent.includes('bank')) {
    factCheck = isFlagged ? 'False' : 'Partially True';
  }

  // Legal risk assessment based on credibility
  let law = 'N/A';
  let lawExplanation = 'No immediate legal concern.';
  let riskLevel = 'Low';

  if (isFlagged) {
    law = 'Cybercrime Prevention Act (RA 10175)';
    lawExplanation = 'Low credibility posts with high engagement may spread misinformation and violate cybercrime provisions.';
    riskLevel = credibilityScore < 30 ? 'High' : 'Medium';
  }

  const reason = isVerified
    ? 'Verified account with real engagement'
    : totalEngagement > 100
      ? 'Reasonable engagement level'
      : totalEngagement === 0
        ? 'No engagement detected (potentially automated)'
        : 'Low engagement compared to platform average';

  const explanation = `Based on platform metrics: ${totalEngagement} total engagements. ${isVerified ? 'Verified account.' : 'Not verified.'} Content length: ${contentLength} chars. Platform: ${platform}.`;

  return {
    credibilityScore,
    reason,
    panicPhrases: [], // No longer using heuristic panic detection
    factCheck,
    law,
    lawExplanation,
    riskLevel,
    explanation,
    platformMetrics: {
      likes,
      comments,
      shares,
      retweets,
      replies,
      totalEngagement,
      isVerified,
      engagementRate,
    },
  };
}

app.get('/posts', (req, res) => {
  res.json(posts);
});

app.post('/analyze', (req, res) => {
  const { content, user, metrics = {} } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }
  const analysis = analyzePostContent(content, metrics);
  const post = {
    id: nextId++,
    user: user || 'Anonymous',
    content,
    isFlagged: analysis.credibilityScore < 50,
    ...analysis,
  };
  res.json(post);
});

// Endpoint to create a new post (simulate incoming real-time posts)
app.post('/posts', (req, res) => {
  const { user, content, metrics = {} } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  const analysis = analyzePostContent(content, metrics);
  const post = {
    id: nextId++,
    user: user || 'LiveUser',
    content,
    isFlagged: analysis.credibilityScore < 50,
    ...analysis,
  };

  posts.unshift(post);
  // keep last 100
  if (posts.length > 100) posts = posts.slice(0, 100);

  io.emit('new_post', post);
  res.json(post);
});

app.post('/verify-link', async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'only http/https links are supported' });
  }

  try {
    const extracted = await extractPostFromUrl(parsedUrl.toString());
    const analysis = analyzePostContent(extracted.content, {
      ...extracted.metrics,
      platform: extracted.platform,
    });

    const post = {
      id: nextId++,
      user: extracted.user,
      content: extracted.content,
      sourceUrl: extracted.sourceUrl,
      platform: extracted.platform,
      isFlagged: analysis.credibilityScore < 50,
      ...analysis,
    };

    posts.unshift(post);
    if (posts.length > 100) posts = posts.slice(0, 100);

    io.emit('new_post', post);
    return res.json(post);
  } catch (err) {
    return res.status(502).json({
      error: 'Could not verify this link. The post may be private, blocked, or unavailable.',
      details: err.message,
    });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  // Send recent posts on connect (if any exist from previous analyses)
  socket.emit('init_posts', posts);

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// No auto-generation of demo posts - now using real posts from content script
// Backend only receives posts via POST /posts endpoint and analyzes them

server.listen(PORT, () => {
  console.log(`VeriFi-PH backend listening on http://localhost:${PORT}`);
});
