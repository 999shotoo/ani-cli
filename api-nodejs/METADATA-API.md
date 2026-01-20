# Comprehensive Metadata API Documentation

This API provides access to **50+ metadata fields** from AllAnime's GraphQL API with complete ID mapping support.

## 🎯 Features

- **Complete Metadata Extraction**: 50+ fields per anime including IDs, titles, descriptions, scores, genres, tags, studios, characters, episodes, and more
- **External ID Mapping**: Cross-reference between MAL, AniList, and AllAnime IDs
- **Advanced Search**: Filter by types, genres, tags, seasons, years with sorting
- **Character Data**: Get character lists with voice actors
- **Related Content**: Prequels, sequels, and related shows
- **Batch Operations**: Get metadata for multiple anime at once

---

## 📋 Available Metadata Fields

### Basic Information
- `_id` - AllAnime internal ID
- `name` - Primary title
- `englishName` - English title
- `nativeName` - Native language title
- `nameOnlyString` - String-only name
- `altNames` - Alternative names array
- `trustedAltNames` - Verified alternative names
- `description` - Full synopsis

### External IDs & Mappings
- `malId` - MyAnimeList ID
- `aniListId` - AniList ID

### Type & Status
- `type` - Anime/Movie/OVA/Special
- `status` - Releasing/Finished/Not yet aired
- `countryOfOrigin` - Country code (e.g., "JP")

### Scores & Popularity
- `score` - AllAnime score
- `averageScore` - Average user score
- `popularity` - Popularity metric

### Content Classification
- `genres` - Array of genres
- `tags` - Array of tags
- `rating` - Age rating
- `isAdult` - Adult content flag

### Air Dates & Season
- `airedStart` - { year, month, day }
- `airedEnd` - { year, month, day }
- `season` - { quarter, year }

### Episode Information
- `episodeCount` - Total episodes
- `episodeDuration` - Episode length in minutes
- `broadcastInterval` - Days between episodes
- `availableEpisodes` - { sub, dub, raw } counts
- `availableEpisodesDetail` - Episode arrays by type
- `lastEpisodeDate` - { sub, dub, raw } dates
- `lastEpisodeInfo` - Latest episode details
- `nextAiringEpisode` - { airingAt, episode, timeUntilAiring }

### Media Assets
- `thumbnail` - Primary thumbnail URL
- `thumbnails` - Array of thumbnail URLs
- `banner` - Primary banner URL
- `prevideos` - Preview video URLs

### Production
- `studios` - Array of studio names

### Related Content
- `relatedShows` - Array of related anime with relation type
- `relatedMangas` - Array of related manga

### Characters & Cast
- `characters` - Array of:
  - `name` - { full, native }
  - `image` - { large, medium }
  - `role` - Character role
  - `voiceActors` - Array with name, image, language

### Statistics
- `pageStatus`:
  - `views` - Total views
  - `likesCount` - Like count
  - `commentCount` - Comment count
  - `dislikesCount` - Dislike count
  - `userScoreCount` - Number of user scores
  - `userScoreTotalValue` - Sum of all user scores
  - `userScoreAverValue` - Average user score

### System Metadata
- `slugTime` - URL slug timestamp
- `hidden` - Hidden status
- `manualUpdated` - Manual update flag
- `lastUpdateStart` - Last update start time
- `lastUpdateEnd` - Last update end time

---

## 🔗 API Endpoints

### 1. Get Complete Metadata by AllAnime ID

```http
GET /api/metadata/anime/:id
```

**Response**: Full object with all 50+ fields

**Example**:
```bash
curl http://localhost:3000/api/metadata/anime/62bed53e02a8af66c761cd18
```

---

### 2. Get Metadata by MAL ID

```http
GET /api/metadata/mal/:malId
```

**Example**:
```bash
curl http://localhost:3000/api/metadata/mal/16498
```

**Returns**: Complete metadata for anime with MAL ID 16498 (Attack on Titan)

---

### 3. Get Metadata by AniList ID

```http
GET /api/metadata/anilist/:aniListId
```

**Example**:
```bash
curl http://localhost:3000/api/metadata/anilist/16498
```

---

### 4. Advanced Search with Filters

```http
POST /api/metadata/search
Content-Type: application/json
```

**Request Body**:
```json
{
  "query": "naruto",
  "types": ["anime", "movie"],
  "genres": ["Action", "Adventure"],
  "tags": ["Ninja", "Shounen"],
  "season": "fall",
  "year": 2022,
  "sortBy": "Popular",
  "sortDirection": "DESC",
  "allowAdult": false,
  "allowUnknown": false,
  "denyEcchi": false,
  "translationType": "sub",
  "countryOrigin": "JP",
  "page": 1,
  "limit": 20
}
```

**Available Filters**:
- `query` - Search text
- `types` - ["anime", "movie", "ova", "special", "ona"]
- `genres` - Genre names (get list from `/genres-tags`)
- `tags` - Tag names
- `season` - "winter", "spring", "summer", "fall"
- `year` - Year number
- `sortBy` - "Popular", "Score", "Recent", "Trending"
- `sortDirection` - "ASC", "DESC"
- `translationType` - "sub", "dub", "raw"
- `countryOrigin` - "JP", "CN", "KR", etc.
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "count": 20,
  "pageInfo": {
    "total": 156,
    "hasNextPage": true,
    "nextPage": 2
  },
  "data": [...]
}
```

---

### 5. Get Available Genres and Tags

```http
GET /api/metadata/genres-tags
```

**Returns**: List of all available genres/tags with anime counts

**Example Response**:
```json
{
  "success": true,
  "count": 100,
  "data": [
    {
      "name": "Action",
      "animeCount": 5432,
      "mangaCount": 3210
    },
    ...
  ]
}
```

---

### 6. Get Characters by AniList ID

```http
GET /api/metadata/characters/anilist/:aniListId
```

**Example**:
```bash
curl http://localhost:3000/api/metadata/characters/anilist/16498
```

**Returns**: Character data with voice actors

---

### 7. Get ID Mappings

```http
GET /api/metadata/mappings/:id
```

**Example**:
```bash
curl http://localhost:3000/api/metadata/mappings/62bed53e02a8af66c761cd18
```

**Response**:
```json
{
  "success": true,
  "data": {
    "allAnimeId": "62bed53e02a8af66c761cd18",
    "malId": "16498",
    "aniListId": "16498",
    "name": "Shingeki no Kyojin"
  }
}
```

---

### 8. Batch Get Metadata

```http
POST /api/metadata/batch
Content-Type: application/json
```

**Request Body**:
```json
{
  "ids": [
    "62bed53e02a8af66c761cd18",
    "63010bbe7a49604db4fc97ff",
    "6304d7ae7a49604db4c3ca80"
  ]
}
```

**Returns**: Array of metadata objects for all requested IDs

---

## 🎨 Usage Examples

### Example 1: Find Anime by MAL ID and Get Full Metadata

```javascript
const axios = require('axios');

async function getAnimeByMAL(malId) {
  const response = await axios.get(
    `http://localhost:3000/api/metadata/mal/${malId}`
  );
  
  const anime = response.data.data;
  console.log(`
    Title: ${anime.name} (${anime.englishName})
    MAL ID: ${anime.malId}
    AniList ID: ${anime.aniListId}
    Type: ${anime.type}
    Status: ${anime.status}
    Score: ${anime.score}
    Episodes: ${anime.episodeCount}
    Genres: ${anime.genres.join(', ')}
    Studios: ${anime.studios.join(', ')}
    Description: ${anime.description}
  `);
  
  return anime;
}

getAnimeByMAL('16498'); // Attack on Titan
```

### Example 2: Advanced Search for Action Anime

```javascript
async function searchActionAnime() {
  const response = await axios.post(
    'http://localhost:3000/api/metadata/search',
    {
      genres: ['Action'],
      year: 2023,
      sortBy: 'Popular',
      limit: 10
    }
  );
  
  console.log(`Found ${response.data.count} results`);
  response.data.data.forEach(anime => {
    console.log(`- ${anime.name} (Score: ${anime.score})`);
  });
}
```

### Example 3: Get Complete Metadata with Characters

```javascript
async function getCompleteAnimeInfo(allAnimeId) {
  // Get full metadata
  const metaResponse = await axios.get(
    `http://localhost:3000/api/metadata/anime/${allAnimeId}`
  );
  const anime = metaResponse.data.data;
  
  console.log('Basic Info:', {
    title: anime.name,
    english: anime.englishName,
    type: anime.type,
    status: anime.status,
    score: anime.score
  });
  
  console.log('IDs:', {
    allAnime: anime._id,
    mal: anime.malId,
    anilist: anime.aniListId
  });
  
  console.log('Episodes:', {
    total: anime.episodeCount,
    duration: `${anime.episodeDuration} min`,
    available: anime.availableEpisodes
  });
  
  console.log('Content:', {
    genres: anime.genres,
    tags: anime.tags,
    studios: anime.studios
  });
  
  console.log('Characters:', anime.characters.map(c => ({
    name: c.name.full,
    role: c.role,
    voiceActors: c.voiceActors.map(va => va.name.full)
  })));
  
  console.log('Related:', anime.relatedShows.map(r => ({
    name: r.name,
    relation: r.relationType
  })));
}
```

### Example 4: ID Conversion (MAL → AniList → AllAnime)

```javascript
async function convertIds(malId) {
  // First, get AllAnime data using MAL ID
  const response = await axios.get(
    `http://localhost:3000/api/metadata/mal/${malId}`
  );
  
  const anime = response.data.data;
  
  return {
    malId: anime.malId,
    aniListId: anime.aniListId,
    allAnimeId: anime._id,
    name: anime.name
  };
}

// Usage
convertIds('16498').then(console.log);
// Output: { malId: "16498", aniListId: "16498", allAnimeId: "62bed...", name: "..." }
```

### Example 5: Batch Fetch Multiple Anime

```javascript
async function getMultipleAnime(ids) {
  const response = await axios.post(
    'http://localhost:3000/api/metadata/batch',
    { ids }
  );
  
  return response.data.data.map(anime => ({
    id: anime._id,
    name: anime.name,
    malId: anime.malId,
    score: anime.score,
    episodes: anime.availableEpisodesDetail
  }));
}

getMultipleAnime([
  '62bed53e02a8af66c761cd18',
  '63010bbe7a49604db4fc97ff'
]).then(console.log);
```

---

## 🔍 Comparison: Basic vs. Metadata Endpoints

| Feature | Basic `/api/anime/:id` | Metadata `/api/metadata/anime/:id` |
|---------|----------------------|-----------------------------------|
| Fields returned | ~10 basic fields | **50+ comprehensive fields** |
| External IDs | ✅ MAL, AniList | ✅ MAL, AniList |
| Characters | ❌ | ✅ With voice actors |
| Related shows | ❌ | ✅ Prequels, sequels |
| Studios | ❌ | ✅ Full list |
| Tags | ❌ | ✅ Comprehensive tags |
| Air dates | ❌ | ✅ Start/end dates |
| Statistics | ❌ | ✅ Views, likes, scores |
| Next episode | ❌ | ✅ Airing info |

---

## 💡 Tips

1. **ID Conversion**: Use `/metadata/mal/:malId` or `/metadata/anilist/:aniListId` to convert external IDs
2. **Batch Operations**: Use `/metadata/batch` for fetching multiple anime efficiently
3. **Advanced Search**: Use POST `/metadata/search` with filters for precise results
4. **Genre Discovery**: Call `/metadata/genres-tags` first to see available filters
5. **Complete Data**: Use `/metadata/anime/:id` for maximum information extraction

---

## 📊 Example Full Response Structure

```json
{
  "success": true,
  "data": {
    "_id": "62bed53e02a8af66c761cd18",
    "name": "Shingeki no Kyojin",
    "englishName": "Attack on Titan",
    "nativeName": "進撃の巨人",
    "description": "Centuries ago, mankind was slaughtered...",
    "malId": "16498",
    "aniListId": "16498",
    "type": "anime",
    "status": "Finished",
    "score": 8.9,
    "averageScore": 88,
    "popularity": 95432,
    "genres": ["Action", "Drama", "Fantasy"],
    "tags": ["Military", "Super Power", "Shounen"],
    "rating": "R",
    "isAdult": false,
    "airedStart": { "year": 2013, "month": 4, "day": 7 },
    "airedEnd": { "year": 2013, "month": 9, "day": 29 },
    "season": { "quarter": "spring", "year": 2013 },
    "episodeCount": 25,
    "episodeDuration": 24,
    "availableEpisodes": { "sub": 25, "dub": 25, "raw": 0 },
    "thumbnail": "https://...",
    "banner": "https://...",
    "studios": ["Wit Studio"],
    "characters": [
      {
        "name": { "full": "Eren Yeager", "native": "エレン・イェーガー" },
        "image": { "large": "https://...", "medium": "https://..." },
        "role": "Main",
        "voiceActors": [
          {
            "name": { "full": "Yuki Kaji", "native": "梶裕貴" },
            "language": "Japanese"
          }
        ]
      }
    ],
    "relatedShows": [
      {
        "_id": "63010bbe7a49604db4fc97ff",
        "name": "Shingeki no Kyojin Season 2",
        "relationType": "sequel"
      }
    ],
    "pageStatus": {
      "views": 1234567,
      "likesCount": 45678,
      "userScoreAverValue": 8.85
    },
    "nextAiringEpisode": null
  }
}
```

---

## 🚀 Quick Start

1. Start the server:
```bash
cd api-nodejs
npm start
```

2. Test the metadata endpoint:
```bash
curl http://localhost:3000/api/metadata/mal/16498
```

3. See all available endpoints:
```bash
curl http://localhost:3000/
```

---

## 📖 Additional Resources

- [GraphQL Schema](./graphql-schema-full.json) - Complete AllAnime API schema
- [Basic API Documentation](./README.md) - Basic streaming endpoints
- [Main README](../README.md) - CLI tool documentation
