const express = require('express');
const router = express.Router();
const metadataService = require('../services/metadata.service');

/**
 * Get complete metadata for an anime by AllAnime ID
 * GET /api/metadata/anime/:id
 */
router.get('/anime/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const metadata = await metadataService.getCompleteMetadata(id);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get metadata by MAL ID
 * GET /api/metadata/mal/:malId
 */
router.get('/mal/:malId', async (req, res, next) => {
  try {
    const { malId } = req.params;
    const metadata = await metadataService.getMetadataByExternalId(malId, 'mal');

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get metadata by AniList ID
 * GET /api/metadata/anilist/:aniListId
 */
router.get('/anilist/:aniListId', async (req, res, next) => {
  try {
    const { aniListId } = req.params;
    const metadata = await metadataService.getMetadataByExternalId(aniListId, 'anilist');

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Advanced search with all filters
 * POST /api/metadata/search
 * Body: {
 *   query: string,
 *   types: string[],
 *   genres: string[],
 *   tags: string[],
 *   season: string,
 *   year: number,
 *   sortBy: string,
 *   sortDirection: string,
 *   allowAdult: boolean,
 *   translationType: string,
 *   countryOrigin: string,
 *   page: number,
 *   limit: number
 * }
 */
router.post('/search', async (req, res, next) => {
  try {
    const filters = req.body;
    const result = await metadataService.advancedSearch(filters);

    res.json({
      success: true,
      count: result.results.length,
      pageInfo: result.pageInfo,
      data: result.results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get available genres and tags
 * GET /api/metadata/genres-tags
 */
router.get('/genres-tags', async (req, res, next) => {
  try {
    const tags = await metadataService.getAvailableGenresAndTags();

    res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get characters by AniList ID
 * GET /api/metadata/characters/anilist/:aniListId
 */
router.get('/characters/anilist/:aniListId', async (req, res, next) => {
  try {
    const { aniListId } = req.params;
    const characters = await metadataService.getCharactersByAniListId(aniListId);

    res.json({
      success: true,
      data: characters,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get ID mappings (MAL, AniList, AllAnime)
 * GET /api/metadata/mappings/:id
 */
router.get('/mappings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const mappings = await metadataService.getIdMappings(id);

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch get metadata for multiple anime IDs
 * POST /api/metadata/batch
 * Body: { ids: string[] }
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Body must contain "ids" array with at least one ID',
      });
    }

    const results = await metadataService.batchGetMetadata(ids);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
