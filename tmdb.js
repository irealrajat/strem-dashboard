const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';
const API_KEY = process.env.TMDB_API_KEY;

// Search movies or series by title
async function searchContent(query, type = 'movie') {
  const endpoint = type === 'series' ? 'tv' : 'movie';
  const res = await axios.get(`${TMDB_BASE}/search/${endpoint}`, {
    params: { api_key: API_KEY, query, language: 'en-US', page: 1 }
  });
  return res.data.results.slice(0, 10).map(item => formatSearchResult(item, type));
}

// Get full details by TMDB ID
async function getDetails(tmdbId, type = 'movie') {
  const endpoint = type === 'series' ? 'tv' : 'movie';
  const res = await axios.get(`${TMDB_BASE}/${endpoint}/${tmdbId}`, {
    params: {
      api_key: API_KEY,
      language: 'en-US',
      append_to_response: 'credits,external_ids,images'
    }
  });
  return formatDetails(res.data, type);
}

// Find IMDB ID from TMDB ID
async function getImdbId(tmdbId, type = 'movie') {
  const endpoint = type === 'series' ? 'tv' : 'movie';
  const res = await axios.get(`${TMDB_BASE}/${endpoint}/${tmdbId}/external_ids`, {
    params: { api_key: API_KEY }
  });
  return res.data.imdb_id || null;
}

// Find by IMDB ID (reverse lookup)
async function findByImdbId(imdbId) {
  const res = await axios.get(`${TMDB_BASE}/find/${imdbId}`, {
    params: { api_key: API_KEY, external_source: 'imdb_id' }
  });
  const movie = res.data.movie_results?.[0];
  const tv = res.data.tv_results?.[0];
  if (movie) return { data: formatDetails(movie, 'movie'), type: 'movie' };
  if (tv) return { data: formatDetails(tv, 'series'), type: 'series' };
  return null;
}

// Format search result
function formatSearchResult(item, type) {
  return {
    tmdbId: String(item.id),
    title: item.title || item.name,
    year: parseInt((item.release_date || item.first_air_date || '').split('-')[0]) || null,
    poster: item.poster_path ? `${TMDB_IMAGE}/w300${item.poster_path}` : null,
    rating: item.vote_average,
    type
  };
}

// Format full details
function formatDetails(item, type) {
  const isSeries = type === 'series';
  const logo = item.images?.logos?.find(l => l.iso_639_1 === 'en') || item.images?.logos?.[0];
  return {
    tmdbId: String(item.id),
    imdbId: item.external_ids?.imdb_id || item.imdb_id || null,
    type,
    title: item.title || item.name,
    year: parseInt((item.release_date || item.first_air_date || '').split('-')[0]) || null,
    poster: item.poster_path ? `${TMDB_IMAGE}/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `${TMDB_IMAGE}/original${item.backdrop_path}` : null,
    logo: logo ? `${TMDB_IMAGE}/original${logo.file_path}` : null,
    description: item.overview,
    genres: (item.genres || []).map(g => g.name),
    cast: (item.credits?.cast || []).slice(0, 10).map(c => c.name),
    director: isSeries
      ? (item.created_by || []).map(c => c.name)
      : (item.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name),
    rating: item.vote_average,
    runtime: isSeries ? (item.episode_run_time?.[0] || null) : item.runtime,
    language: item.original_language,
    status: item.status
  };
}

module.exports = { searchContent, getDetails, getImdbId, findByImdbId };
