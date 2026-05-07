const { requireAccountToken } = require('../utils/authToken');

const KLIPY_BASE = 'https://api.klipy.com/v2';
const GIF_LIMIT = 24;

const normalizeGif = (item) => ({
  id: String(item.id ?? item.slug ?? ''),
  title: item.title || item.slug || '',
  url: item.images?.original?.url ?? item.url ?? item.gif_url ?? '',
  preview_url: item.images?.fixed_height?.url ?? item.images?.original?.url ?? item.url ?? item.gif_url ?? '',
});

const getTrending = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const apiKey = process.env.KLIPY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'GIF service not configured' });
    }

    const url = `${KLIPY_BASE}/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${GIF_LIMIT}`;
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 7000);
    let response;
    try {
      response = await fetch(url, { signal: abortController.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      return res.status(502).json({ message: 'GIF service error' });
    }
    const data = await response.json();
    if (!data.result) {
      return res.status(502).json({ message: 'GIF service error' });
    }

    return res.json((data.data || []).map(normalizeGif));
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch trending GIFs: ${error.message}` });
  }
};

const searchGifs = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const apiKey = process.env.KLIPY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'GIF service not configured' });
    }

    const url = `${KLIPY_BASE}/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&limit=${GIF_LIMIT}`;
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 7000);
    let response;
    try {
      response = await fetch(url, { signal: abortController.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      return res.status(502).json({ message: 'GIF service error' });
    }
    const data = await response.json();
    if (!data.result) {
      return res.status(502).json({ message: 'GIF service error' });
    }

    return res.json((data.data || []).map(normalizeGif));
  } catch (error) {
    return res.status(500).json({ error: `Failed to search GIFs: ${error.message}` });
  }
};

module.exports = { getTrending, searchGifs };
