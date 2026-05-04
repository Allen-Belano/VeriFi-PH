/**
 * Content Script for VeriFi-PH
 * Extracts REAL platform metrics and engagement data for credibility analysis
 */

function extractPostsFromFacebook() {
  const posts = [];
  const postElements = document.querySelectorAll('[data-testid="feed_story_title_row"], [role="article"]');

  postElements.forEach((element, index) => {
    try {
      const textContent = element.innerText || element.textContent || '';
      if (textContent.trim().length < 10) return;

      // Extract author/user info
      const authorLink = element.querySelector('[role="button"] span, [data-testid="post_name"]');
      const user = authorLink?.textContent?.trim() || 'Facebook User';

      // Extract engagement metrics
      const likeBtn = element.querySelector('[aria-label*="Like"], [data-testid*="like"]');
      const shareBtn = element.querySelector('[aria-label*="Share"], [data-testid*="share"]');
      const commentBtn = element.querySelector('[aria-label*="Comment"], [data-testid*="comment"]');

      // Get reaction/like count (often in tooltips)
      const reactionText = Array.from(element.querySelectorAll('span')).find(
        (el) => el.textContent.match(/^\d+\s*(K|M)?\s*(likes?|reactions?)/i)
      )?.textContent || '';

      // Post timestamp
      const timeElem = element.querySelector('time, [data-testid="post_chronos_container"]');
      const timestamp = timeElem?.getAttribute('datetime') || new Date().toISOString();

      posts.push({
        id: `fb-${index}-${Date.now()}`,
        user,
        content: textContent.slice(0, 500),
        platform: 'facebook',
        timestamp,
        metrics: {
          likes: extractNumber(reactionText),
          shares: 0, // FB API limited
          comments: 0, // FB API limited
          reactions: reactionText,
          isVerified: element.querySelector('[data-testid="icon_verified"]') !== null,
          engagementRate: 0, // Will be calculated by backend
        },
        sourceElement: element,
      });
    } catch (err) {
      console.debug('Error extracting FB post:', err);
    }
  });

  return posts;
}

function extractPostsFromTwitter() {
  const posts = [];
  const tweets = document.querySelectorAll('[data-testid="tweet"]');

  tweets.forEach((element, index) => {
    try {
      const textElem = element.querySelector('[data-testid="tweetText"]');
      if (!textElem) return;

      const textContent = textElem.innerText?.trim() || '';
      const authorElem = element.querySelector('[data-testid="User-Name"]');
      const user = authorElem?.textContent?.trim() || 'Twitter User';

      // Extract author handle and verify status
      const handleElem = element.querySelector('a[href*="/"]');
      const handle = handleElem?.getAttribute('href')?.split('/')[1] || '';

      // Extract engagement metrics from visible UI
      const likeBtn = element.querySelector('[aria-label*="like"], [aria-label*="Like"]');
      const retweetBtn = element.querySelector('[aria-label*="retweet"], [aria-label*="Retweet"]');
      const replyBtn = element.querySelector('[aria-label*="reply"], [aria-label*="Reply"]');

      // Extract numbers from labels
      const likeCount = extractNumber(likeBtn?.getAttribute('aria-label') || '');
      const retweetCount = extractNumber(retweetBtn?.getAttribute('aria-label') || '');
      const replyCount = extractNumber(replyBtn?.getAttribute('aria-label') || '');

      // Check if verified
      const isVerified = element.querySelector('[aria-label*="verified"], svg[data-testid*="icon"]') !== null;

      // Get timestamp
      const timeElem = element.querySelector('time');
      const timestamp = timeElem?.getAttribute('datetime') || new Date().toISOString();

      posts.push({
        id: `tw-${index}-${Date.now()}`,
        user,
        handle,
        content: textContent.slice(0, 500),
        platform: 'twitter',
        timestamp,
        metrics: {
          likes: likeCount,
          retweets: retweetCount,
          replies: replyCount,
          isVerified,
          engagementRate: calculateEngagementRate(likeCount + retweetCount + replyCount),
        },
      });
    } catch (err) {
      console.debug('Error extracting tweet:', err);
    }
  });

  return posts;
}

function extractPostsFromInstagram() {
  const posts = [];
  const postElements = document.querySelectorAll('article');

  postElements.forEach((element, index) => {
    try {
      // Get caption text
      const captionElem = element.querySelector('[dir="auto"]');
      const textContent = captionElem?.innerText?.trim() || '';

      // Get author
      const authorLink = element.querySelector('a[title*="@"], a[href*="/"]');
      const user = authorLink?.getAttribute('title') || authorLink?.textContent || 'Instagram User';

      // Extract likes count (visible in UI)
      const likesElem = element.querySelector('[role="button"] span, svg ~ span');
      const likesText = Array.from(element.querySelectorAll('span')).find(
        (el) => el.textContent.match(/^\d+.*like/)
      )?.textContent || '';

      // Get comments count
      const commentsElem = Array.from(element.querySelectorAll('span')).find(
        (el) => el.textContent.match(/comment/)
      )?.textContent || '';

      // Check if verified (blue checkmark)
      const isVerified = element.querySelector('svg[aria-label*="verified"]') !== null;

      posts.push({
        id: `ig-${index}-${Date.now()}`,
        user,
        content: textContent.slice(0, 500),
        platform: 'instagram',
        timestamp: new Date().toISOString(),
        metrics: {
          likes: extractNumber(likesText),
          comments: extractNumber(commentsElem),
          isVerified,
          engagementRate: 0, // Will be calculated
        },
      });
    } catch (err) {
      console.debug('Error extracting Instagram post:', err);
    }
  });

  return posts;
}

function extractPostsFromTikTok() {
  const posts = [];
  const videoCards = document.querySelectorAll('[role="menuitem"], .video-card, [data-e2e*="video"]');

  videoCards.forEach((element, index) => {
    try {
      // Get video description/caption
      const descElem = element.querySelector('[data-testid*="desc"], .video-desc, span');
      const textContent = descElem?.innerText?.trim() || '';

      // Get creator name
      const creatorElem = element.querySelector('[data-testid*="user"], .creator-name, strong');
      const user = creatorElem?.textContent?.trim() || 'TikTok Creator';

      // Extract metrics from visible UI
      const likesElem = element.querySelector('[data-testid*="like-icon"]');
      const likesLabel = likesElem?.getAttribute('aria-label') || '';

      const commentsElem = element.querySelector('[data-testid*="comment-icon"]');
      const commentsLabel = commentsElem?.getAttribute('aria-label') || '';

      posts.push({
        id: `tk-${index}-${Date.now()}`,
        user,
        content: textContent.slice(0, 500),
        platform: 'tiktok',
        timestamp: new Date().toISOString(),
        metrics: {
          likes: extractNumber(likesLabel),
          comments: extractNumber(commentsLabel),
          isVerified: element.querySelector('[data-testid*="verified"]') !== null,
          engagementRate: 0,
        },
      });
    } catch (err) {
      console.debug('Error extracting TikTok post:', err);
    }
  });

  return posts;
}

function extractPostsFromYouTube() {
  const posts = [];
  const commentElements = document.querySelectorAll('ytd-comment-thread-renderer, yt-comment-thread-renderer');

  commentElements.forEach((element, index) => {
    try {
      // Get comment text
      const textElem = element.querySelector('#content-text, yt-formatted-string[role="generic"]');
      const textContent = textElem?.innerText?.trim() || '';

      // Get author
      const authorElem = element.querySelector('ytd-comment-renderer #author-text, #author-text');
      const user = authorElem?.textContent?.trim() || 'YouTube User';

      // Get likes count
      const likesElem = element.querySelector('#like-button-renderer yt-formatted-string');
      const likesCount = extractNumber(likesElem?.textContent || '0');

      posts.push({
        id: `yt-${index}-${Date.now()}`,
        user,
        content: textContent.slice(0, 500),
        platform: 'youtube',
        timestamp: new Date().toISOString(),
        metrics: {
          likes: likesCount,
          replies: 0, // Not easily accessible
          isVerified: false,
          engagementRate: 0,
        },
      });
    } catch (err) {
      console.debug('Error extracting YouTube comment:', err);
    }
  });

  return posts;
}

// Helper: Extract number from text
function extractNumber(text) {
  if (!text) return 0;
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  let num = parseFloat(match[1].replace(/,/g, ''));
  if (text.match(/K/i)) num *= 1000;
  if (text.match(/M/i)) num *= 1000000;
  return Math.round(num);
}

// Calculate engagement rate (for credibility boost)
function calculateEngagementRate(totalEngagement) {
  // Simple formula: lower engagement can indicate spam/misinformation
  if (totalEngagement > 1000) return 0.9; // High engagement = more trusted
  if (totalEngagement > 100) return 0.7;
  if (totalEngagement > 10) return 0.5;
  return 0.2; // Very low engagement = potentially suspicious
}

function detectPlatformAndExtractPosts() {
  const hostname = window.location.hostname;

  if (hostname.includes('facebook.com')) {
    return extractPostsFromFacebook();
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return extractPostsFromTwitter();
  } else if (hostname.includes('instagram.com')) {
    return extractPostsFromInstagram();
  } else if (hostname.includes('tiktok.com')) {
    return extractPostsFromTikTok();
  } else if (hostname.includes('youtube.com')) {
    return extractPostsFromYouTube();
  }

  return [];
}

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPosts') {
    const posts = detectPlatformAndExtractPosts();
    sendResponse({ posts });
  }
});

console.log('[VeriFi-PH] Content script loaded on', window.location.hostname);

// Listen for DOM changes to detect new posts
const observer = new MutationObserver((mutations) => {
  clearTimeout(observer.debounceTimer);
  observer.debounceTimer = setTimeout(() => {
    const posts = detectPlatformAndExtractPosts();
    if (posts.length > 0) {
      chrome.runtime.sendMessage(
        { action: 'newPostsDetected', posts },
        (response) => {
          if (chrome.runtime.lastError) {
            console.debug('Could not send message to popup:', chrome.runtime.lastError);
          }
        }
      );
    }
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
});
