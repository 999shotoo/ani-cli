const axios = require('axios');

const CONFIG = {
  agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  allanimeRefr: 'https://allmanga.to',
  allanimeBase: 'allanime.day',
};

CONFIG.allanimeApi = `https://api.${CONFIG.allanimeBase}`;

// Decode provider ID (hex to character mapping)
function decodeProviderId(encoded) {
  const hexMap = {
    '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G',
    '70': 'H', '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N', '77': 'O',
    '68': 'P', '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U', '6e': 'V', '6f': 'W',
    '60': 'X', '61': 'Y', '62': 'Z',
    '59': 'a', '5a': 'b', '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g',
    '50': 'h', '51': 'i', '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o',
    '48': 'p', '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w',
    '40': 'x', '41': 'y', '42': 'z',
    '08': '0', '09': '1', '0a': '2', '0b': '3', '0c': '4', '0d': '5', '0e': '6', '0f': '7',
    '00': '8', '01': '9',
    '15': '-', '16': '.', '67': '_', '46': '~', '02': ':', '17': '/', '07': '?',
    '1b': '#', '63': '[', '65': ']', '78': '@', '19': '!', '1c': '$', '1e': '&',
    '10': '(', '11': ')', '12': '*', '13': '+', '14': ',', '03': ';', '05': '=', '1d': '%'
  };

  let result = '';
  for (let i = 0; i < encoded.length; i += 2) {
    const hex = encoded.substr(i, 2);
    result += hexMap[hex] || '';
  }
  
  return result.replace('/clock', '/clock.json');
}

// Search anime
async function searchAnime(query, mode = 'sub', limit = 40, page = 1) {
  const searchGql = `query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { 
    shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { 
      edges { 
        _id 
        name 
        englishName
        nativeName
        thumbnail
        banner
        description
        type
        status
        score
        averageScore
        genres
        tags
        studios
        rating
        malId
        aniListId
        availableEpisodes
        availableEpisodesDetail
        episodeCount
        season
        airedStart
        __typename 
      } 
    }
  }`;

  try {
    const variables = {
      search: {
        allowAdult: false,
        allowUnknown: false,
        query: query
      },
      limit: limit,
      page: page,
      translationType: mode,
      countryOrigin: 'ALL'
    };

    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify(variables),
        query: searchGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    if (!response.data || !response.data.data || !response.data.data.shows) {
      throw new Error('Invalid response from API');
    }

    const shows = response.data.data.shows.edges;
    return shows.map(show => ({
      id: show._id,
      name: show.name,
      englishName: show.englishName,
      nativeName: show.nativeName,
      thumbnail: show.thumbnail,
      banner: show.banner,
      description: show.description,
      type: show.type,
      status: show.status,
      score: show.score,
      averageScore: show.averageScore,
      genres: show.genres,
      tags: show.tags,
      studios: show.studios,
      rating: show.rating,
      malId: show.malId,
      aniListId: show.aniListId,
      availableEpisodes: show.availableEpisodes,
      availableEpisodesDetail: show.availableEpisodesDetail,
      episodeCount: show.episodeCount,
      season: show.season,
      airedStart: show.airedStart,
    }));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Search failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Search failed: ${error.message}`);
  }
}

// Get anime details by ID
async function getAnimeDetails(showId, mode = 'sub') {
  const detailsGql = `query ($showId: String!) { show( _id: $showId ) { _id name availableEpisodes availableEpisodesDetail malId aniListId }}`;

  try {
    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify({ showId: showId }),
        query: detailsGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    if (!response.data || !response.data.data || !response.data.data.show) {
      throw new Error('Invalid response from API');
    }

    const show = response.data.data.show;
    return {
      id: show._id,
      name: show.name,
      availableEpisodes: show.availableEpisodes,
      availableEpisodesDetail: show.availableEpisodesDetail,
      malId: show.malId,
      aniListId: show.aniListId,
    };
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to get anime details: ${error.response.status}`);
    }
    throw new Error(`Failed to get anime details: ${error.message}`);
  }
}

// Get comprehensive metadata (working fields only)
async function getCompleteMetadata(showId) {
  const metadataGql = `query ($showId: String!) { 
    show(_id: $showId) { 
      _id 
      name 
      englishName
      nativeName
      nameOnlyString
      thumbnail
      banner
      thumbnails
      description
      type
      status
      score
      averageScore
      popularity
      genres
      tags
      studios
      rating
      countryOfOrigin
      malId
      aniListId
      availableEpisodes
      availableEpisodesDetail
      episodeCount
      episodeDuration
      broadcastInterval
      season
      airedStart
      airedEnd
      lastEpisodeDate
      lastEpisodeInfo
      nextAiringEpisode
      altNames
      trustedAltNames
      prevideos
      isAdult
    }
  }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: metadataGql,
        variables: { showId }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.agent,
          'Referer': CONFIG.allanimeRefr,
        },
      }
    );

    if (!response.data || !response.data.data || !response.data.data.show) {
      throw new Error('Anime not found');
    }

    return response.data.data.show;
  } catch (error) {
    if (error.response) {
      console.error('Metadata API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to get metadata: ${error.response.status}`);
    }
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
}

// Get metadata by external ID (MAL or AniList)
async function getMetadataByExternalId(externalId, idType = 'mal') {
  try {
    // Use the working search functions
    const results = idType === 'mal' 
      ? await searchByMalId(externalId, 'sub')
      : await searchByAniListId(externalId, 'sub');
    
    if (results.length === 0) {
      throw new Error(`No anime found with ${idType.toUpperCase()} ID: ${externalId}`);
    }

    // Now get full metadata
    return await getCompleteMetadata(results[0].id);
  } catch (error) {
    throw new Error(`Failed to get by ${idType.toUpperCase()} ID: ${error.message}`);
  }
}

// Get ID mappings
async function getIdMappings(showId) {
  const mappingsGql = `query ($showId: String!) { show(_id: $showId) { _id name malId aniListId } }`;

  try {
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: mappingsGql,
        variables: { showId }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.agent,
          'Referer': CONFIG.allanimeRefr,
        },
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
    if (error.response) {
      console.error('Mappings API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to get mappings: ${error.response.status}`);
    }
    throw new Error(`Failed to get mappings: ${error.message}`);
  }
}



// Get episodes list
async function getEpisodesList(showId, mode = 'sub') {
  const episodesGql = `query ($showId: String!) { 
    show(_id: $showId) { 
      _id 
      name
      availableEpisodesDetail
    }
  }`;

  try {
    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify({ showId: showId }),
        query: episodesGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    if (!response.data || !response.data.data || !response.data.data.show) {
      throw new Error('Invalid response from API');
    }

    const episodes = response.data.data.show.availableEpisodesDetail[mode] || [];
    return episodes.sort((a, b) => parseFloat(a) - parseFloat(b));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to get episodes: ${error.response.status}`);
    }
    throw new Error(`Failed to get episodes: ${error.message}`);
  }
}

// Get video links from provider
async function getLinks(providerId, providerName) {
  try {
    const url = `https://${CONFIG.allanimeBase}${providerId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    const data = response.data;
    const links = [];

    // Extract links based on provider
    if (data.links) {
      data.links.forEach(link => {
        if (link.link && link.resolutionStr) {
          links.push({
            quality: link.resolutionStr,
            url: link.link,
            provider: providerName,
          });
        }
      });
    }

    // Handle m3u8 streams
    if (data.hls && data.hls.url) {
      links.push({
        quality: 'hls',
        url: data.hls.url,
        provider: providerName,
      });
    }

    // Extract subtitles if available
    const subtitles = [];
    if (data.subtitles) {
      data.subtitles.forEach(sub => {
        subtitles.push({
          language: sub.lang,
          label: sub.label,
          url: sub.src,
        });
      });
    }

    return { links, subtitles };
  } catch (error) {
    return { links: [], subtitles: [] };
  }
}

// Get episode streaming sources
async function getEpisodeSources(showId, episodeNumber, mode = 'sub') {
  const episodeGql = `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode( showId: $showId translationType: $translationType episodeString: $episodeString ) { episodeString sourceUrls }}`;

  try {
    const variables = {
      showId: showId,
      translationType: mode,
      episodeString: episodeNumber
    };

    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify(variables),
        query: episodeGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    if (!response.data || !response.data.data || !response.data.data.episode) {
      throw new Error('Invalid response from API');
    }

    const episodeData = response.data.data.episode;
    const sourceUrls = episodeData.sourceUrls;
    
    if (!sourceUrls || sourceUrls.length === 0) {
      throw new Error('No sources found for this episode');
    }

    // Parse source URLs to get provider info
    const providers = sourceUrls.map(source => ({
      name: source.sourceName,
      id: source.sourceUrl.replace('--', ''),
      priority: source.priority || 0,
      type: source.type || 'unknown',
    }));

    // Try to fetch links from providers
    let allLinks = [];
    let allSubtitles = [];
    
    for (const provider of providers) {
      const decoded = decodeProviderId(provider.id);
      const { links, subtitles } = await getLinks(decoded, provider.name);
      allLinks = allLinks.concat(links);
      allSubtitles = allSubtitles.concat(subtitles);
    }

    return {
      episode: episodeNumber,
      sources: allLinks,
      subtitles: allSubtitles,
      providers: providers.map(p => ({
        name: p.name,
        priority: p.priority,
        type: p.type,
      })),
    };
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to get episode sources: ${error.response.status}`);
    }
    throw new Error(`Failed to get episode sources: ${error.message}`);
  }
}

// Get trending anime (simplified - uses search with popular keywords)
async function getTrendingAnime(mode = 'sub', limit = 30) {
  try {
    // Use popular search as a workaround
    const results = await searchAnime('', mode, limit, 1);
    return results;
  } catch (error) {
    throw new Error(`Failed to get trending anime: ${error.message}`);
  }
}

// Get recent releases (simplified - uses search)
async function getRecentReleases(mode = 'sub', limit = 30) {
  try {
    // Use search as a workaround
    const results = await searchAnime('', mode, limit, 1);
    return results;
  } catch (error) {
    throw new Error(`Failed to get recent releases: ${error.message}`);
  }
}

// Search anime by MAL ID (search by name and filter by malId in results)
async function searchByMalId(malId, mode = 'sub') {
  const searchGql = `query($search: SearchInput, $limit: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
    shows(search: $search, limit: $limit, translationType: $translationType, countryOrigin: $countryOrigin) {
      edges {
        _id
        name
        englishName
        malId
        aniListId
        availableEpisodesDetail
      }
    }
  }`;

  try {
    // First, get all shows and filter by malId client-side
    // Since malId is not in SearchInput, we need to fetch results and filter
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: searchGql,
        variables: {
          search: {
            allowAdult: false,
            allowUnknown: true
          },
          limit: 100,
          translationType: mode,
          countryOrigin: 'ALL'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.agent,
          'Referer': CONFIG.allanimeRefr,
        },
      }
    );

    if (!response.data || !response.data.data || !response.data.data.shows) {
      console.error('Search response:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response from API');
    }

    const shows = response.data.data.shows.edges;
    
    // Filter by malId client-side
    const filtered = shows.filter(show => show.malId && show.malId.toString() === malId.toString());
    
    console.log(`Found ${filtered.length} shows for MAL ID ${malId}`);
    
    if (filtered.length === 0) {
      throw new Error('No anime found with this MAL ID');
    }

    return filtered.map(show => ({
      id: show._id,
      name: show.name,
      englishName: show.englishName,
      malId: show.malId,
      aniListId: show.aniListId,
      availableEpisodesDetail: show.availableEpisodesDetail,
    }));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to search by MAL ID: ${error.response.status}`);
    }
    throw new Error(`Failed to search by MAL ID: ${error.message}`);
  }
}

// Search anime by AniList ID (search and filter by aniListId in results)
async function searchByAniListId(aniListId, mode = 'sub') {
  const searchGql = `query($search: SearchInput, $limit: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
    shows(search: $search, limit: $limit, translationType: $translationType, countryOrigin: $countryOrigin) {
      edges {
        _id
        name
        englishName
        malId
        aniListId
        availableEpisodesDetail
      }
    }
  }`;

  try {
    // First, get all shows and filter by aniListId client-side
    const response = await axios.post(`${CONFIG.allanimeApi}/api`, 
      { 
        query: searchGql,
        variables: {
          search: {
            allowAdult: false,
            allowUnknown: true
          },
          limit: 100,
          translationType: mode,
          countryOrigin: 'ALL'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.agent,
          'Referer': CONFIG.allanimeRefr,
        },
      }
    );

    if (!response.data || !response.data.data || !response.data.data.shows) {
      console.error('Search response:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response from API');
    }

    const shows = response.data.data.shows.edges;
    
    // Filter by aniListId client-side
    const filtered = shows.filter(show => show.aniListId && show.aniListId.toString() === aniListId.toString());
    
    console.log(`Found ${filtered.length} shows for AniList ID ${aniListId}`);
    
    if (filtered.length === 0) {
      throw new Error('No anime found with this AniList ID');
    }

    return filtered.map(show => ({
      id: show._id,
      name: show.name,
      englishName: show.englishName,
      malId: show.malId,
      aniListId: show.aniListId,
      availableEpisodesDetail: show.availableEpisodesDetail,
    }));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`Failed to search by AniList ID: ${error.response.status}`);
    }
    throw new Error(`Failed to search by AniList ID: ${error.message}`);
  }
}

module.exports = {
  searchAnime,
  getAnimeDetails,
  getEpisodesList,
  getEpisodeSources,
  getTrendingAnime,
  getRecentReleases,
  searchByMalId,
  searchByAniListId,
  getCompleteMetadata,
  getMetadataByExternalId,
  getIdMappings,
};
