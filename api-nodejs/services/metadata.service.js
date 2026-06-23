const axios = require('axios');

const CONFIG = {
  allanimeApi: 'https://api.allanime.day',
  allanimeRefr: 'https://allanime.day',
  agent: 'anime-frame/1.0.0',
};

const ALLANIME_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': CONFIG.agent,
  Referer: CONFIG.allanimeRefr,
};

// Comprehensive GraphQL query for ALL metadata
const FULL_METADATA_QUERY = `query($id: String!) {
  show(_id: $id) {
    _id
    name
    englishName
    nativeName
    nameOnlyString
    description
    
    # External IDs / Mappings
    malId
    aniListId
    
    # Type & Status
    type
    status
    countryOfOrigin
    
    # Scores & Popularity
    score
    averageScore
    popularity
    
    # Content Info
    genres
    tags
    rating
    isAdult
    
    # Air Dates & Season
    airedStart {
      year
      month
      day
    }
    airedEnd {
      year
      month
      day
    }
    season {
      quarter
      year
    }
    
    # Episode Info
    episodeCount
    episodeDuration
    broadcastInterval
    
    # Available Episodes Detail
    availableEpisodes {
      sub
      dub
      raw
    }
    availableEpisodesDetail {
      sub
      dub
      raw
    }
    
    # Latest Episode Info
    lastEpisodeDate {
      sub
      dub
      raw
    }
    lastEpisodeInfo {
      sub {
        episodeString
        notes
        uploadDate {
          sub
          dub
          raw
        }
      }
      dub {
        episodeString
        notes
        uploadDate {
          sub
          dub
          raw
        }
      }
      raw {
        episodeString
        notes
        uploadDate {
          sub
          dub
          raw
        }
      }
    }
    
    # Media
    thumbnail
    banner
    thumbnails
    prevideos
    
    # Studios & Production
    studios
    
    # Related Content
    relatedShows {
      _id
      name
      englishName
      thumbnail
      type
      relationType
    }
    relatedMangas {
      _id
      name
      englishName
      thumbnail
      type
      relationType
    }
    
    # Characters
    characters {
      _id
      name {
        full
        native
      }
      image {
        large
        medium
      }
      role
      voiceActors {
        _id
        name {
          full
          native
        }
        image {
          large
          medium
        }
        language
      }
    }
    
    # Alternative Names
    altNames
    trustedAltNames
    
    # Page Statistics
    pageStatus {
      _id
      views
      likesCount
      commentCount
      dislikesCount
      userScoreCount
      userScoreTotalValue
      userScoreAverValue
    }
    
    # Next Episode
    nextAiringEpisode {
      airingAt
      episode
      timeUntilAiring
    }
    
    # Metadata
    slugTime
    hidden
    manualUpdated
    lastUpdateStart
    lastUpdateEnd
  }
}`;

// Search with all filters
const SEARCH_WITH_ALL_FILTERS_QUERY = `query(
  $search: SearchInput
  $limit: Int
  $page: Int
  $translationType: VaildTranslationTypeEnumType
  $countryOrigin: VaildCountryOriginEnumType
) {
  shows(
    search: $search
    limit: $limit
    page: $page
    translationType: $translationType
    countryOrigin: $countryOrigin
  ) {
    edges {
      _id
      name
      englishName
      thumbnail
      malId
      aniListId
      type
      status
      score
      averageScore
      genres
      season {
        quarter
        year
      }
      availableEpisodesDetail {
        sub
        dub
        raw
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
    }
  }
}`;

/**
 * Get complete metadata for an anime by ID
 */
async function getCompleteMetadata(animeId) {
  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: FULL_METADATA_QUERY,
        variables: { id: animeId }
      },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    if (!response.data || !response.data.data || !response.data.data.show) {
      throw new Error('Anime not found');
    }

    return response.data.data.show;
  } catch (error) {
    console.error('Error fetching complete metadata:', error.message);
    throw error;
  }
}

/**
 * Get metadata by external ID (MAL or AniList)
 */
async function getMetadataByExternalId(externalId, idType = 'mal') {
  const searchQuery = `query { shows(search: {${idType === 'mal' ? 'malId' : 'aniListId'}: "${externalId}"}, limit: 1) { edges { _id } } }`;
  
  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { query: searchQuery },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    const shows = response.data?.data?.shows?.edges || [];
    if (shows.length === 0) {
      throw new Error(`No anime found with ${idType.toUpperCase()} ID: ${externalId}`);
    }

    // Now get full metadata
    return await getCompleteMetadata(shows[0]._id);
  } catch (error) {
    console.error(`Error fetching by ${idType.toUpperCase()} ID:`, error.message);
    throw error;
  }
}

/**
 * Advanced search with all possible filters
 */
async function advancedSearch(filters = {}) {
  const {
    query = '',
    types = [],
    genres = [],
    tags = [],
    season,
    year,
    sortBy = 'Popular',
    sortDirection = 'DESC',
    allowAdult = false,
    allowUnknown = false,
    denyEcchi = false,
    translationType = 'sub',
    countryOrigin = 'JP',
    page = 1,
    limit = 20
  } = filters;

  const searchInput = {
    query,
    ...(types.length > 0 && { types }),
    ...(genres.length > 0 && { genres, includeGenres: true }),
    ...(tags.length > 0 && { tags }),
    ...(season && { season }),
    ...(year && { year }),
    sortBy,
    sortDirection,
    allowAdult,
    allowUnknown,
    denyEcchi,
  };

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: SEARCH_WITH_ALL_FILTERS_QUERY,
        variables: {
          search: searchInput,
          limit,
          page,
          translationType,
          countryOrigin
        }
      },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    return {
      results: response.data?.data?.shows?.edges || [],
      pageInfo: response.data?.data?.shows?.pageInfo || {}
    };
  } catch (error) {
    console.error('Advanced search error:', error.message);
    throw error;
  }
}

/**
 * Get all available genres and tags from the API
 */
async function getAvailableGenresAndTags() {
  const query = `query {
    queryTags(search: { tagType: "generic" }, limit: 100) {
      edges {
        name
        animeCount
        mangaCount
      }
    }
  }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { query },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    return response.data?.data?.queryTags?.edges || [];
  } catch (error) {
    console.error('Error fetching genres/tags:', error.message);
    return [];
  }
}

/**
 * Get character details with voice actors
 */
async function getCharactersByAniListId(aniListId) {
  const query = `query($aniListId: Int!) {
    charactersWithAnilistId(aniListId: $aniListId) {
      _id
      aniListId
      name {
        full
        native
      }
      image {
        large
        medium
      }
      description
    }
  }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query,
        variables: { aniListId: parseInt(aniListId) }
      },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    return response.data?.data?.charactersWithAnilistId || null;
  } catch (error) {
    console.error('Error fetching characters:', error.message);
    return null;
  }
}

/**
 * Get mapping between MAL ID and AniList ID
 */
async function getIdMappings(animeId) {
  const query = `query($id: String!) {
    show(_id: $id) {
      _id
      name
      malId
      aniListId
    }
  }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query,
        variables: { id: animeId }
      },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    const show = response.data?.data?.show;
    return {
      allAnimeId: show?._id,
      malId: show?.malId,
      aniListId: show?.aniListId,
      name: show?.name
    };
  } catch (error) {
    console.error('Error fetching ID mappings:', error.message);
    throw error;
  }
}

/**
 * Batch get metadata for multiple anime IDs
 */
async function batchGetMetadata(animeIds) {
  const query = `query($ids: [String!]!) {
    showsWithIds(ids: $ids) {
      _id
      name
      englishName
      malId
      aniListId
      type
      status
      score
      genres
      thumbnail
      availableEpisodesDetail {
        sub
        dub
        raw
      }
    }
  }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query,
        variables: { ids: animeIds }
      },
      {
        headers: ALLANIME_HEADERS,
      }
    );

    return response.data?.data?.showsWithIds || [];
  } catch (error) {
    console.error('Error in batch metadata fetch:', error.message);
    throw error;
  }
}

module.exports = {
  getCompleteMetadata,
  getMetadataByExternalId,
  advancedSearch,
  getAvailableGenresAndTags,
  getCharactersByAniListId,
  getIdMappings,
  batchGetMetadata,
};
