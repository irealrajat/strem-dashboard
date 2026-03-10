const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema({
  name: { type: String, required: true },        // e.g. "1080p", "720p Hindi"
  title: { type: String },                        // display title in Stremio
  url: { type: String },                          // direct stream URL (HTTP/HLS/etc)
  infoHash: { type: String },                     // torrent infohash
  fileIdx: { type: Number, default: 0 },          // torrent file index
  quality: { type: String },                      // 4K, 1080p, 720p, etc
  language: { type: String, default: 'English' },
  // For series episodes
  season: { type: Number, default: null },
  episode: { type: Number, default: null },
  addedAt: { type: Date, default: Date.now }
});

const ContentSchema = new mongoose.Schema({
  // Identifiers
  tmdbId: { type: String, index: true },
  imdbId: { type: String, index: true },          // tt1234567 format
  type: { type: String, enum: ['movie', 'series'], required: true },

  // Metadata (fetched from TMDB or manually entered)
  title: { type: String, required: true },
  year: { type: Number },
  poster: { type: String },                        // poster image URL
  background: { type: String },                    // background/backdrop URL
  logo: { type: String },
  description: { type: String },
  genres: [{ type: String }],
  cast: [{ type: String }],
  director: [{ type: String }],
  rating: { type: Number },                        // TMDB vote average
  runtime: { type: Number },                       // in minutes
  language: { type: String },
  status: { type: String },                        // Released, Ongoing, etc

  // Streams array
  streams: [StreamSchema],

  // Admin notes
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
ContentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Helper: get streams for a specific episode (series)
ContentSchema.methods.getEpisodeStreams = function (season, episode) {
  return this.streams.filter(s => s.season === season && s.episode === episode);
};

// Helper: get all movie streams (no season/episode filter)
ContentSchema.methods.getMovieStreams = function () {
  return this.streams.filter(s => s.season === null || s.season === undefined);
};

module.exports = mongoose.model('Content', ContentSchema);
