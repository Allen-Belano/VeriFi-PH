const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

function resolveUrl(rawValue, baseUrl) {
  if (!rawValue) return null;
  try {
    return new URL(rawValue, baseUrl).toString();
  } catch (error) {
    return null;
  }
}

function normalizeMediaUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function browserHeaders(url) {
  const origin = new URL(url).origin;
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Referer: origin,
    Origin: origin,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
  };
}

function inferMediaTypeFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const path = `${parsed.pathname || ''}`.toLowerCase();
    const query = `${parsed.search || ''}`.toLowerCase();

    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(path)) return 'video';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(path)) return 'image';

    if (/format=(mp4|webm|mov|m4v)/i.test(query)) return 'video';
    if (/format=(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(query)) return 'image';

    if (/\b(video|stream|clip)\b/i.test(path) || /\bvideo\b/i.test(query)) return 'video';
    if (/\b(image|img|photo|picture|media)\b/i.test(path) || /\b(image|photo|picture|media)\b/i.test(query)) return 'image';
  } catch (error) {
    return null;
  }

  return null;
}

function extractMedia(html, baseUrl) {
  const $ = cheerio.load(html);
  const imageUrls = [];
  const videoUrls = [];

  $('img[src]').each((_, element) => {
    const src = $(element).attr('src');
    const resolved = resolveUrl(src, baseUrl);
    if (resolved) {
      imageUrls.push(resolved);
    }
  });

  $('video[src], source[src], iframe[src]').each((_, element) => {
    const src = $(element).attr('src');
    const resolved = resolveUrl(src, baseUrl);
    if (resolved) {
      videoUrls.push(resolved);
    }
  });

  return {
    images: normalizeMediaUrls(imageUrls),
    videos: normalizeMediaUrls(videoUrls),
  };
}

async function fetchHTML(url) {
  try {
    const inferredMediaType = inferMediaTypeFromUrl(url);
    if (inferredMediaType) {
      const tag = inferredMediaType === 'video' ? 'video' : 'img';
      return `<!doctype html><html><head><meta charset="utf-8"></head><body><${tag} src="${url}" controls></${tag}></body></html>`;
    }

    // First attempt a HEAD to determine resource type (helps with direct image/video links)
    let headResp;
    try {
      headResp = await axios.head(url, {
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        maxRedirects: 5,
      });
    } catch (headErr) {
      // If HEAD fails (some servers don't allow it), we'll continue and attempt GET below
      headResp = headErr.response || null;
    }

    const contentType = headResp?.headers?.['content-type'] || '';

    // If this is a direct image/video link, return a tiny HTML wrapper so downstream
    // extraction and detectors can still operate on a document containing the media URL.
    if (/^image\//i.test(contentType) || /^video\//i.test(contentType)) {
      const tag = /^image\//i.test(contentType) ? 'img' : 'video';
      const wrapper = `<!doctype html><html><head><meta charset="utf-8"></head><body><${tag} src="${url}" controls></${tag}></body></html>`;
      return wrapper;
    }

    // Normal HTML GET with browser-like headers
    try {
      const response = await axios.get(url, {
        timeout: 12000,
        headers: browserHeaders(url),
        maxRedirects: 5,
        responseType: 'text',
      });

      if (response.status !== 200 || typeof response.data !== 'string') {
        const error = new Error(`Unable to fetch URL (status ${response.status})`);
        error.status = 400;
        error.code = 'URL_UNREACHABLE';
        throw error;
      }

      return response.data;
    } catch (getErr) {
      // If server returned 403 (anti-hotlinking / block), retry with a Referer header set to origin
      const status = getErr.response?.status;
      if (status === 403 || status === 401) {
        try {
          const retry = await axios.get(url, {
            timeout: 12000,
            headers: browserHeaders(url),
            maxRedirects: 5,
            responseType: 'text',
          });

          if (retry.status === 200 && typeof retry.data === 'string') {
            return retry.data;
          }
        } catch (retryErr) {
          // fall through to error handling below
        }

        // Final fallback: for media-looking links blocked by origin policy, still continue analysis
        // by wrapping the URL directly. This avoids hard-failing image links with 403 responses.
        const mediaTypeOn403 = inferMediaTypeFromUrl(url);
        if (mediaTypeOn403) {
          const tag = mediaTypeOn403 === 'video' ? 'video' : 'img';
          return `<!doctype html><html><head><meta charset="utf-8"></head><body><${tag} src="${url}" controls></${tag}></body></html>`;
        }

        const blockedError = new Error(
          'Source blocked automated fetch (401/403). Please use a public direct media URL or a page accessible without login.'
        );
        blockedError.status = 400;
        blockedError.code = 'URL_UNREACHABLE';
        blockedError.isBlockedSource = true;
        throw blockedError;
      }

      // Re-throw to be handled by outer catch
      throw getErr;
    }
  } catch (error) {
    const rootError = new Error(
      'Could not fetch content from URL. The source may block automated access or require login.'
    );
    rootError.status = 400;
    rootError.code = 'URL_UNREACHABLE';

    if (error.isBlockedSource) {
      rootError.message = error.message;
    } else if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        rootError.message = 'Source blocked automated fetch (401/403). Please use a public direct media URL or a page accessible without login.';
      } else {
        rootError.message = `Could not fetch content from URL (status ${error.response.status})`;
      }
    } else if (/\b(401|403)\b/.test(error.message || '')) {
      rootError.message = 'Source blocked automated fetch (401/403). Please use a public direct media URL or a page accessible without login.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      rootError.message = 'Request timed out while fetching URL';
    }

    throw rootError;
  }
}

function extractMainContent(html, baseUrl) {
  const dom = new JSDOM(html, { url: baseUrl });
  const article = new Readability(dom.window.document).parse();
  const media = extractMedia(html, baseUrl);

  const textContent = article?.textContent ? article.textContent.trim() : '';
  const title = article?.title || dom.window.document.title || '';
  const excerpt = article?.excerpt || '';
  const contentHtml = article?.content || '';

  return {
    title,
    excerpt,
    text: textContent,
    content_html: contentHtml,
    images: media.images,
    videos: media.videos,
  };
}

module.exports = {
  fetchHTML,
  extractMainContent,
};
