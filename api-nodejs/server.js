const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const animeRoutes = require('./routes/anime.routes');

app.use('/api', animeRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'Ani-API',
    version: '2.0.0',
    description: 'REST API for anime streaming data from AllAnime',
    endpoints: {
      search: '/api/search?q=<query>&mode=<sub|dub>&limit=<number>&page=<number>',
      details: '/api/anime/:id?mode=<sub|dub>',
      episodes: '/api/anime/:id/episodes?mode=<sub|dub>',
      sources: '/api/anime/:id/episode/:episode?mode=<sub|dub>',
      trending: '/api/trending?mode=<sub|dub>&limit=<number>',
      recent: '/api/recent?mode=<sub|dub>&limit=<number>',
      malSearch: '/api/mal/:malId?mode=<sub|dub>',
      malEpisodes: '/api/mal/:malId/episodes?mode=<sub|dub>',
      anilistSearch: '/api/anilist/:aniListId?mode=<sub|dub>',
      anilistAnimePage: '/api/anilist/:aniListId/anime?mode=<sub|dub>',
      anilistEpisodes: '/api/anilist/:aniListId/episodes?mode=<sub|dub>',
      metadata: '/api/metadata/:id - Complete metadata (genres, studios, etc)',
      metadataByMal: '/api/metadata/mal/:malId - Metadata via MAL ID',
      metadataByAniList: '/api/metadata/anilist/:aniListId - Metadata via AniList ID',
      idMappings: '/api/mappings/:id - Get ID mappings (MAL, AniList, AllAnime)',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');

  if (statusCode >= 500) {
    console.error(`[${errorCode}] ${err.message}`);
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500 && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: true,
    code: errorCode,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ani-API server running on http://localhost:${PORT}`);
  console.log(`📚 Documentation available at http://localhost:${PORT}`);
});

module.exports = app;
