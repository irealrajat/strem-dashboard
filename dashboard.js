const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const tmdb = require('../services/tmdb');

// ─── TMDB SEARCH ────────────────────────────────────────────────────────────
router.get('/tmdb/search', async (req, res) => {
  try {
    const { query, type = 'movie' } = req.query;
    if (!query) return res.json({ results: [] });
    const results = await tmdb.searchContent(query, type);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get TMDB full details
router.get('/tmdb/details/:type/:tmdbId', async (req, res) => {
  try {
    const { type, tmdbId } = req.params;
    const details = await tmdb.getDetails(tmdbId, type);
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONTENT CRUD ────────────────────────────────────────────────────────────

// GET all content (with pagination)
router.get('/content', async (req, res) => {
  try {
    const { type, page = 1, limit = 20, search = '' } = req.query;
    const query = {};
    if (type) query.type = type;
    if (search) query.title = { $regex: search, $options: 'i' };

    const total = await Content.countDocuments(query);
    const items = await Content.find(query)
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single content
router.get('/content/:id', async (req, res) => {
  try {
    const item = await Content.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Add new content (from TMDB or manual)
router.post('/content', async (req, res) => {
  try {
    const {
      tmdbId, imdbId, type, title,
      year, poster, background, logo,
      description, genres, cast, director,
      rating, runtime, language, status, notes
    } = req.body;

    // Check if already exists
    if (tmdbId) {
      const exists = await Content.findOne({ tmdbId, type });
      if (exists) return res.status(409).json({ error: 'Content already exists', id: exists._id });
    }

    let meta = { tmdbId, imdbId, type, title, year, poster, background, logo, description, genres, cast, director, rating, runtime, language, status, notes, streams: [] };

    // Auto-fetch from TMDB if tmdbId provided but missing fields
    if (tmdbId && (!title || !poster)) {
      const fetched = await tmdb.getDetails(tmdbId, type);
      meta = { ...fetched, ...meta, streams: [] };
    }

    const content = new Content(meta);
    await content.save();
    res.json({ success: true, id: content._id, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update content metadata
router.put('/content/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates.streams; // streams managed separately
    const content = await Content.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!content) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE content
router.delete('/content/:id', async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.patch('/content/:id/toggle', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    content.isActive = !content.isActive;
    await content.save();
    res.json({ success: true, isActive: content.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh metadata from TMDB
router.post('/content/:id/refresh', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: 'Not found' });
    if (!content.tmdbId) return res.status(400).json({ error: 'No TMDB ID' });

    const fetched = await tmdb.getDetails(content.tmdbId, content.type);
    Object.assign(content, {
      title: fetched.title,
      poster: fetched.poster,
      background: fetched.background,
      logo: fetched.logo,
      description: fetched.description,
      genres: fetched.genres,
      cast: fetched.cast,
      director: fetched.director,
      rating: fetched.rating,
      runtime: fetched.runtime,
      imdbId: fetched.imdbId || content.imdbId,
      updatedAt: new Date()
    });
    await content.save();
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STREAM MANAGEMENT ────────────────────────────────────────────────────────

// GET streams for content
router.get('/content/:id/streams', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).lean();
    if (!content) return res.status(404).json({ error: 'Not found' });
    res.json({ streams: content.streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Add stream to content
router.post('/content/:id/streams', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: 'Not found' });

    const { name, title, url, infoHash, fileIdx, quality, language, season, episode } = req.body;
    if (!url && !infoHash) return res.status(400).json({ error: 'URL or InfoHash required' });

    content.streams.push({
      name: name || quality || 'Stream',
      title: title || `${quality || ''} ${language || ''}`.trim(),
      url, infoHash, fileIdx,
      quality, language,
      season: season ? parseInt(season) : null,
      episode: episode ? parseInt(episode) : null
    });
    content.updatedAt = new Date();
    await content.save();
    res.json({ success: true, streams: content.streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE stream
router.delete('/content/:id/streams/:streamId', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: 'Not found' });

    content.streams = content.streams.filter(
      s => String(s._id) !== req.params.streamId
    );
    await content.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATS ───────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [movies, series, totalStreams] = await Promise.all([
      Content.countDocuments({ type: 'movie', isActive: true }),
      Content.countDocuments({ type: 'series', isActive: true }),
      Content.aggregate([
        { $match: { isActive: true } },
        { $project: { streamCount: { $size: '$streams' } } },
        { $group: { _id: null, total: { $sum: '$streamCount' } } }
      ])
    ]);
    res.json({
      movies,
      series,
      totalContent: movies + series,
      totalStreams: totalStreams[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
