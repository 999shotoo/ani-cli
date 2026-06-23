# Ani-API

A comprehensive REST API for anime streaming data powered by AllAnime.

## Features

- 🔍 **Search Anime** - Search for anime by title with filters
- 📺 **Anime Details** - Get comprehensive information about any anime
- 📋 **Episodes List** - Retrieve all available episodes
- 🎬 **Streaming Sources** - Get video links with multiple quality options
- 🔥 **Trending Anime** - Get currently trending anime
- 📅 **Recent Releases** - Get recently released episodes
- 🎭 **Sub/Dub Support** - Support for both subbed and dubbed content
- 🌐 **CORS Enabled** - Ready for frontend integration

## Installation

```bash
cd api-nodejs
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

## Usage

### Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### 1. Search Anime

**Endpoint:** `GET /search`

**Parameters:**
- `q` (required): Search query
- `mode` (optional): `sub` or `dub` (default: `sub`)
- `limit` (optional): Number of results (default: `40`)
- `page` (optional): Page number (default: `1`)

**Example:**
```bash
GET /api/search?q=naruto&mode=sub&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id": "anime_id",
      "name": "Naruto",
      "englishName": "Naruto",
      "nativeName": "ナルト",
      "thumbnail": "https://...",
      "availableEpisodes": { "sub": 220, "dub": 220 },
      "score": 8.5,
      "genres": ["Action", "Adventure"],
      "description": "...",
      "status": "Finished",
      "studios": ["Pierrot"],
      "airedStart": { "year": 2002, "month": 10, "date": 3 }
    }
  ]
}
```

### 2. Search by MAL ID

**Endpoint:** `GET /mal/:malId`

**Parameters:**
- `malId` (required): MyAnimeList ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/mal/20?mode=sub
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "anime_id",
      "name": "Naruto",
      "malId": 20,
      "aniListId": 20,
      "availableEpisodesDetail": {
        "sub": ["1", "2", "3", ...],
        "dub": ["1", "2", ...]
      }
    }
  ]
}
```

> **Note:** This searches the entire catalog and filters by MAL ID. May be slower than searching by name.

### 3. Get Episodes by MAL ID

**Endpoint:** `GET /mal/:malId/episodes`

**Parameters:**
- `malId` (required): MyAnimeList ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/mal/20/episodes?mode=sub
```

**Response:**
```json
{
  "success": true,
  "animeId": "anime_id",
  "animeName": "Naruto",
  "count": 220,
  "data": ["1", "2", "3", ...]
}
```

### 4. Search by AniList ID

**Endpoint:** `GET /anilist/:aniListId`

**Parameters:**
- `aniListId` (required): AniList ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anilist/20?mode=sub
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "anime_id",
      "name": "Naruto",
      "malId": 20,
      "aniListId": 20,
      "availableEpisodesDetail": {
        "sub": ["1", "2", "3", ...],
        "dub": ["1", "2", ...]
      }
    }
  ]
}
```

> **Note:** This searches the entire catalog and filters by AniList ID. May be slower than searching by name.

### 5. Get Episodes by AniList ID

**Endpoint:** `GET /anilist/:aniListId/episodes`

**Parameters:**
- `aniListId` (required): AniList ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anilist/20/episodes?mode=sub
```

**Response:**
```json
{
  "success": true,
  "animeId": "anime_id",
  "animeName": "Naruto",
  "count": 220,
  "data": ["1", "2", "3", ...]
}
```

### 6. Get Anime Page by AniList ID

**Endpoint:** `GET /anilist/:aniListId/anime`

**Parameters:**
- `aniListId` (required): AniList ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anilist/20/anime?mode=sub
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "allanime_id",
    "name": "Naruto",
    "englishName": "Naruto",
    "description": "...",
    "malId": 20,
    "aniListId": 20,
    "genres": ["Action", "Adventure"],
    "studios": ["Pierrot"],
    "availableEpisodesDetail": {
      "sub": ["1", "2", "3", "..."],
      "dub": ["1", "2", "..."]
    }
  }
}
```

### 7. Get Anime Details

**Endpoint:** `GET /anime/:id`

**Parameters:**
- `id` (required): Anime ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anime/anime_id?mode=sub
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "anime_id",
    "name": "Naruto",
    "availableEpisodes": { "sub": 220, "dub": 220 },
    "availableEpisodesDetail": { "sub": ["1", "2", ...] },
    "malId": 20,
    "aniListId": 20
  }
}
```

> **Note:** Returns MAL ID and AniList ID when available in the AllAnime database.

### 7. Get Episodes List

**Endpoint:** `GET /anime/:id/episodes`

**Parameters:**
- `id` (required): Anime ID
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anime/anime_id/episodes?mode=sub
```

**Response:**
```json
{
  "success": true,
  "count": 220,
  "data": ["1", "2", "3", ..., "220"]
}
```

### 8. Get Episode Streaming Sources

**Endpoint:** `GET /anime/:id/episode/:episode`

**Parameters:**
- `id` (required): Anime ID
- `episode` (required): Episode number
- `mode` (optional): `sub` or `dub` (default: `sub`)

**Example:**
```bash
GET /api/anime/anime_id/episode/1?mode=sub
```

**Response:**
```json
{
  "success": true,
  "data": {
    "episode": "1",
    "notes": "",
    "sources": [
      {
        "quality": "1080p",
        "url": "https://...",
        "provider": "wixmp"
      },
      {
        "quality": "720p",
        "url": "https://...",
        "provider": "wixmp"
      }
    ],
    "subtitles": [
      {
        "language": "en",
        "label": "English",
        "url": "https://..."
      }
    ],
    "providers": [
      { "name": "wixmp", "priority": 1, "type": "mp4" },
      { "name": "hianime", "priority": 2, "type": "m3u8" }
    ]
  }
}
```

### 9. Get Trending Anime

**Endpoint:** `GET /trending`

**Parameters:**
- `mode` (optional): `sub` or `dub` (default: `sub`)
- `limit` (optional): Number of results (default: `30`)

**Example:**
```bash
GET /api/trending?mode=sub&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "anime_id",
      "name": "Jujutsu Kaisen",
      "englishName": "Jujutsu Kaisen",
      "thumbnail": "https://...",
      "score": 8.8,
      "genres": ["Action", "Supernatural"],
      "status": "Ongoing"
    }
  ]
}
```

### 10. Get Recent Releases

**Endpoint:** `GET /recent`

**Parameters:**
- `mode` (optional): `sub` or `dub` (default: `sub`)
- `limit` (optional): Number of results (default: `30`)

**Example:**
```bash
GET /api/recent?mode=sub&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "anime_id",
      "name": "One Piece",
      "englishName": "One Piece",
      "thumbnail": "https://...",
      "availableEpisodes": { "sub": 1100 },
      "lastEpisodeInfo": {
        "episodeString": "1100",
        "notes": ""
      },
      "lastEpisodeDate": "2024-01-21T00:00:00.000Z"
    }
  ]
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": true,
  "message": "Error description"
}
```

## Use Cases

### Frontend Integration Example

```javascript
// Search for anime
fetch('http://localhost:3000/api/search?q=naruto')
  .then(res => res.json())
  .then(data => console.log(data));

// Get streaming sources
fetch('http://localhost:3000/api/anime/anime_id/episode/1')
  .then(res => res.json())
  .then(data => {
    const videoUrl = data.data.sources[0].url;
    // Play video with your player
  });
```

### Mobile App Integration

```dart
// Flutter example
final response = await http.get(
  Uri.parse('http://localhost:3000/api/search?q=naruto')
);
final data = jsonDecode(response.body);
```

### Discord Bot Integration

```javascript
// Get anime info for Discord bot
const anime = await fetch(
  `http://localhost:3000/api/anime/${animeId}`
).then(r => r.json());

message.channel.send({
  embed: {
    title: anime.data.name,
    description: anime.data.description,
    thumbnail: { url: anime.data.thumbnail }
  }
});
```

## Data Extractable from AllAnime

Based on GitHub research, this API extracts:

### Anime Metadata
- Basic info (ID, names, thumbnail)
- Description & synopsis
- Genres, tags, studios
- Scores & ratings
- Season & airing dates
- Status (Ongoing/Finished)
- Type (TV/Movie/OVA/Special)
- Alternative names

### Episode Information
- Available episodes (sub/dub)
- Episode numbers & titles
- Episode thumbnails
- Last episode info
- Release dates

### Streaming Data
- Multiple quality options (1080p, 720p, 480p, etc.)
- Multiple providers (wixmp, hianime, youtube, sharepoint)
- Direct video URLs
- M3U8 streams
- Subtitle tracks
- Referrer information

### Additional Features
- Trending anime rankings
- Recent releases feed
- Chapter availability (for manga)
- Broadcast intervals

## Technology Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Axios** - HTTP client
- **CORS** - Cross-origin support

## Error Handling

The API includes comprehensive error handling:

- **400** - Bad Request (missing parameters)
- **404** - Not Found (invalid endpoint)
- **500** - Server Error (processing errors)

## Notes

- This API scrapes data from AllAnime (allanime.to)
- Rate limiting is recommended for production use
- Video URLs may expire after some time
- Some providers may require referrer headers

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## License

MIT

## Disclaimer

This API is for educational purposes only. Please support the official releases and respect copyright laws.
