const express = require('express');
const router = express.Router();
const Content = require('../models/Content');

// ─── MANIFEST ──────────────────────────────────────────────────────────────
router.get('/manifest.json', (req, res) => {
  const manifest = {
    id: 'community.my.stremio.addon',
    version: '1.0.0',
    name: process.env.ADDON_NAME || 'My Stream Addon',
    description: 'Personal stream addon with custom content library',
    logo: process.env.ADDON_LOGO || '',
    background: process.env.ADDON_BG || '',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
      {
        type: 'movie',
        id: 'my-movies',
        name: process.env.ADDON_NAME || 'My Movies',
        extra: [{ name: 'search', isRequired: false }]
      },
      {
        type: 'series',
        id: 'my-series',
        name: process.env.ADDON_NAME || 'My Series',
        extra: [{ name: 'search', isRequired: false }]
      }
    ],
    idPrefixes: ['tt', 'tmdb:']
  };
  res.json(manifest);
});

// ─── CATALOG ───────────────────────────────────────────────────────────────
router.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const search = req.query.search || '';
    const skip = parseInt(req.query.skip) || 0;

    const query = { type, isActive: true };
    if (search) query.title = { $regex: search, $options: 'i' };

    const items = await Content.find(query)
      .sort({ addedAt: -1 })
      .skip(skip)
      .limit(100)
      .lean();

    const metas = items.map(item => buildMetaPreview(item));
    res.json({ metas });
  } catch (err) {
    console.error('Catalog error:', err.message);
    res.json({ metas: [] });
  }
});

// ─── META ──────────────────────────────────────────────────────────────────
router.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const content = await findContent(id, type);
    if (!content) return res.json({ meta: null });

    const meta = buildFullMeta(content);
    res.json({ meta });
  } catch (err) {
    console.error('Meta error:', err.message);
    res.json({ meta: null });
  }
});

// ─── STREAM ────────────────────────────────────────────────────────────────
router.get('/stream/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;

    // Handle series: id format is tt1234567:1:2 (imdbId:season:episode)
    let season = null, episode = null, contentId = id;
    if (type === 'series' && id.includes(':')) {
      const parts = id.split(':');
      // Could be tt1234567:1:2 OR tmdb:12345:1:2
      if (parts[0] === 'tmdb') {
        contentId = `tmdb:${parts[1]}`;
        season = parseInt(parts[2]);
        episode = parseInt(parts[3]);
      } else {
        contentId = parts[0];
        season = parseInt(parts[1]);
        episode = parseInt(parts[2]);
      }
    }

    const content = await findContent(contentId, type);
    if (!content) return res.json({ streams: [] });

    let streams;
    if (type === 'series' && season !== null) {
      streams = content.streams.filter(
        s => s.season === season && s.episode === episode
      );
    } else {
      streams = content.streams.filter(
        s => !s.season && !s.episode
      );
    }

    const formatted = streams.map(s => formatStream(s));
    res.json({ streams: formatted });
  } catch (err) {
    console.error('Stream error:', err.message);
    res.json({ streams: [] });
  }
});

// ─── HELPERS ───────────────────────────────────────────────────────────────

// Find content by IMDB id, TMDB id, or tmdb: prefixed id
async function findContent(id, type) {
  if (id.startsWith('tmdb:')) {
    return Content.findOne({ tmdbId: id.replace('tmdb:', ''), type });
  } else if (id.startsWith('tt')) {
    return Content.findOne({ imdbId: id, type });
  }
  return null;
}

function buildMetaPreview(item) {
  return {
    id: item.imdbId || `tmdb:${item.tmdbId}`,
    type: item.type,
    name: item.title,
    poster: item.poster,
    background: item.background,
    year: item.year,
    genres: item.genres,
    imdbRating: item.rating ? String(item.rating.toFixed(1)) : undefined
  };
}

function buildFullMeta(item) {
  const meta = buildMetaPreview(item);
  meta.description = item.description;
  meta.logo = item.logo;
  meta.cast = item.cast;
  meta.director = item.director;
  meta.runtime = item.runtime ? `${item.runtime} min` : undefined;
  meta.language = item.language;

  // Build videos for series
  if (item.type === 'series') {
    const episodeMap = {};
    for (const s of item.streams) {
      if (s.season && s.episode) {
        const key = `S${s.season}E${s.episode}`;
        if (!episodeMap[key]) {
          const vidId = item.imdbId
            ? `${item.imdbId}:${s.season}:${s.episode}`
            : `tmdb:${item.tmdbId}:${s.season}:${s.episode}`;
          episodeMap[key] = {
            id: vidId,
            title: `S${String(s.season).padStart(2, '0')}E${String(s.episode).padStart(2, '0')}`,
            season: s.season,
            episode: s.episode,
            released: new Date().toISOString()
          };
        }
      }
    }
    meta.videos = Object.values(episodeMap).sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    });
  }

  return meta;
}

function formatStream(s) {
  const stream = {
    name: s.name || 'Stream',
    title: s.title || `${s.quality || ''} ${s.language || ''}`.trim() || 'Stream'
  };

  if (s.url) {
    stream.url = s.url;
  } else if (s.infoHash) {
    stream.infoHash = s.infoHash;
    stream.fileIdx = s.fileIdx || 0;
  }

  // Behavior hints for Stremio
  if (s.url && (s.url.includes('.m3u8') || s.url.includes('m3u8'))) {
    stream.behaviorHints = { notWebReady: false };
  }

  return stream;
}

module.exports = router;
