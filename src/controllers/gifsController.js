const KLIPY_BASE_URL = 'https://api.klipy.com/api/v1';

const mapGif = (item) => ({
  id: String(item.id),
  title: item.title || '',
  url: item.file?.md?.gif?.url || item.file?.hd?.gif?.url || '',
  preview_url: item.file?.sm?.gif?.url || item.file?.xs?.gif?.url || '',
});

const fetchFromKlipy = async (path, params) => {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey) {
    throw new Error('KLIPY_API_KEY is not configured');
  }

  const url = new URL(`${KLIPY_BASE_URL}/${apiKey}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Klipy API responded with ${response.status}`);
  }

  const body = await response.json();
  if (!body.result) {
    throw new Error('Klipy API returned an unsuccessful result');
  }

  return (body.data?.data || []).map(mapGif);
};

const trendingGifsHandler = async (req, res) => {
  try {
    const gifs = await fetchFromKlipy('/gifs/trending', {
      per_page: 24,
      content_filter: 'medium',
    });
    return res.json(gifs);
  } catch (error) {
    return res.status(502).json({ error: `Failed to fetch trending GIFs: ${error.message}` });
  }
};

const searchGifsHandler = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json([]);
    }
    const gifs = await fetchFromKlipy('/gifs/search', {
      q,
      per_page: 24,
      content_filter: 'medium',
    });
    return res.json(gifs);
  } catch (error) {
    return res.status(502).json({ error: `Failed to search GIFs: ${error.message}` });
  }
};

module.exports = {
  trendingGifsHandler,
  searchGifsHandler,
};
