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
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
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
  } catch (error) {
    const rootError = new Error('Could not fetch content from URL');
    rootError.status = 400;
    rootError.code = 'URL_UNREACHABLE';

    if (error.response) {
      rootError.message = `Could not fetch content from URL (status ${error.response.status})`;
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
