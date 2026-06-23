# anime-frame

Minimal Hono API with only mapping and streaming routes.

## Endpoints

- GET /api/anime/:id?type=anilist|mal&mode=sub|dub|raw
  - Returns AllAnime mapping for AniList or MAL ID.
  - If type is omitted, it tries AniList first, then MAL.

- GET /api/allanime/:allanime_id/episodes?mode=sub|dub|raw
  - Returns available episode list for the selected mode.

- GET /api/allanime/:allanime_id/source?episode=<episode>&mode=sub|dub|raw
  - Returns providers, source links, and subtitles for one episode.
  - Includes both decoded provider links and direct iframe/http provider URLs in sources.

## Run

1. npm install
2. npm run dev

Default port: 3001
