const express = require('express');
const router = express.Router();
const animeService = require('../services/anime.service');

// Search anime
router.get('/search', async (req, res, next) => {
  try {
    const { q, mode = 'sub', limit = 40, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: true,
        message: 'Query parameter "q" is required',
      });
    }

    const results = await animeService.searchAnime(
      q,
      mode,
      parseInt(limit),
      parseInt(page)
    );

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// Get anime details
router.get('/anime/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mode = 'sub' } = req.query;

    const details = await animeService.getAnimeDetails(id, mode);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
});

// Get episodes list
router.get('/anime/:id/episodes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mode = 'sub' } = req.query;

    const episodes = await animeService.getEpisodesList(id, mode);

    res.json({
      success: true,
      count: episodes.length,
      data: episodes,
    });
  } catch (error) {
    next(error);
  }
});

// Get episode streaming sources
router.get('/anime/:id/episode/:episode', async (req, res, next) => {
  try {
    const { id, episode } = req.params;
    const { mode = 'sub' } = req.query;

    const sources = await animeService.getEpisodeSources(id, episode, mode);

    res.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    next(error);
  }
});

// Get trending anime
router.get('/trending', async (req, res, next) => {
  try {
    const { mode = 'sub', limit = 30 } = req.query;

    const trending = await animeService.getTrendingAnime(mode, parseInt(limit));

    res.json({
      success: true,
      count: trending.length,
      data: trending,
    });
  } catch (error) {
    next(error);
  }
});

// Get recent releases
router.get('/recent', async (req, res, next) => {
  try {
    const { mode = 'sub', limit = 30 } = req.query;

    const recent = await animeService.getRecentReleases(mode, parseInt(limit));

    res.json({
      success: true,
      count: recent.length,
      data: recent,
    });
  } catch (error) {
    next(error);
  }
});

// Search by MAL ID
router.get('/mal/:malId', async (req, res, next) => {
  try {
    const { malId } = req.params;
    const { mode = 'sub' } = req.query;
    
    const results = await animeService.searchByMalId(malId, mode);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// Get episodes by MAL ID
router.get('/mal/:malId/episodes', async (req, res, next) => {
  try {
    const { malId } = req.params;
    const { mode = 'sub' } = req.query;
    
    const results = await animeService.searchByMalId(malId, mode);
    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'No anime found with this MAL ID' });
    }
    
    const anime = results[0];
    const episodes = anime.availableEpisodesDetail?.[mode] || [];

    res.json({
      success: true,
      animeId: anime.id,
      animeName: anime.name,
      count: episodes.length,
      data: episodes,
    });
  } catch (error) {
    next(error);
  }
});

// Search by AniList ID
router.get('/anilist/:aniListId', async (req, res, next) => {
  try {
    const { aniListId } = req.params;
    const { mode = 'sub' } = req.query;
    
    const results = await animeService.searchByAniListId(aniListId, mode);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// Get episodes by AniList ID
router.get('/anilist/:aniListId/episodes', async (req, res, next) => {
  try {
    const { aniListId } = req.params;
    const { mode = 'sub' } = req.query;
    
    const results = await animeService.searchByAniListId(aniListId, mode);
    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'No anime found with this AniList ID' });
    }
    
    const anime = results[0];
    const episodes = anime.availableEpisodesDetail?.[mode] || [];

    res.json({
      success: true,
      animeId: anime.id,
      animeName: anime.name,
      count: episodes.length,
      data: episodes,
    });
  } catch (error) {
    next(error);
  }
});

// Get complete metadata by AllAnime ID
router.get('/metadata/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const metadata = await animeService.getCompleteMetadata(id);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

// Get metadata by MAL ID
router.get('/metadata/mal/:malId', async (req, res, next) => {
  try {
    const { malId } = req.params;
    const metadata = await animeService.getMetadataByExternalId(malId, 'mal');

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

// Get metadata by AniList ID
router.get('/metadata/anilist/:aniListId', async (req, res, next) => {
  try {
    const { aniListId } = req.params;
    const metadata = await animeService.getMetadataByExternalId(aniListId, 'anilist');

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

// Get ID mappings (MAL, AniList, AllAnime)
router.get('/mappings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const mappings = await animeService.getIdMappings(id);

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
