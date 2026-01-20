#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Version
const VERSION = '1.0.0';

// Config
const CONFIG = {
  agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  allanimeRefr: 'https://allmanga.to',
  allanimeBase: 'allanime.day',
  mode: process.env.ANI_CLI_MODE || 'sub',
  quality: process.env.ANI_CLI_QUALITY || 'best',
  player: process.env.ANI_CLI_PLAYER || getDefaultPlayer(),
  histDir: process.env.ANI_CLI_HIST_DIR || path.join(os.homedir(), '.local', 'state', 'ani-cli'),
};

CONFIG.allanimeApi = `https://api.${CONFIG.allanimeBase}`;
CONFIG.histFile = path.join(CONFIG.histDir, 'ani-hsts');

// Ensure history directory exists
if (!fs.existsSync(CONFIG.histDir)) {
  fs.mkdirSync(CONFIG.histDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.histFile)) {
  fs.writeFileSync(CONFIG.histFile, '');
}

// Check if command exists
function commandExists(command) {
  const { execSync } = require('child_process');
  try {
    if (os.platform() === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

// Find VLC on Windows
function findVLC() {
  const commonPaths = [
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
    process.env.LOCALAPPDATA + '\\Programs\\VideoLAN\\VLC\\vlc.exe',
  ];
  
  for (const vlcPath of commonPaths) {
    if (fs.existsSync(vlcPath)) {
      return vlcPath;
    }
  }
  return null;
}

// Get default player based on platform
function getDefaultPlayer() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    const players = ['mpv.exe', 'vlc.exe', 'mpv', 'vlc'];
    for (const player of players) {
      if (commandExists(player)) return player;
    }
    const vlcPath = findVLC();
    if (vlcPath) return vlcPath;
  } else if (platform === 'darwin') {
    const players = ['iina', 'mpv', 'vlc'];
    for (const player of players) {
      if (commandExists(player)) return player;
    }
  } else {
    const players = ['mpv', 'vlc'];
    for (const player of players) {
      if (commandExists(player)) return player;
    }
  }
  
  return null;
}

// Utility functions
function die(message) {
  console.error(chalk.red(`✗ ${message}`));
  process.exit(1);
}

function log(message, type = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
  };
  console.log(colors[type](`${message}`));
}

// Decode provider ID (mimics the sed transformations in the shell script)
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
          });
        }
      });
    }

    // Handle m3u8 streams
    if (data.hls && data.hls.url) {
      links.push({
        quality: 'hls',
        url: data.hls.url,
      });
    }

    log(`${providerName} Links Fetched`, 'success');
    return links;
  } catch (error) {
    log(`Failed to fetch from ${providerName}: ${error.message}`, 'warn');
    return [];
  }
}

// Get episode URL with all providers
async function getEpisodeUrl(showId, episodeNumber) {
  const episodeGql = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
    episode(showId: $showId translationType: $translationType episodeString: $episodeString) {
      episodeString
      sourceUrls
    }
  }`;

  try {
    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify({
          showId,
          translationType: CONFIG.mode,
          episodeString: episodeNumber,
        }),
        query: episodeGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    const sourceUrls = response.data.data.episode.sourceUrls;
    if (!sourceUrls || sourceUrls.length === 0) {
      die('No sources found for this episode');
    }

    // Parse source URLs to get provider info
    const providers = sourceUrls.map(source => ({
      name: source.sourceName,
      id: source.sourceUrl.replace('--', ''),
    }));

    // Try to fetch links from providers
    let allLinks = [];
    for (const provider of providers) {
      const decoded = decodeProviderId(provider.id);
      const links = await getLinks(decoded, provider.name);
      allLinks = allLinks.concat(links.map(l => ({ ...l, provider: provider.name })));
    }

    if (allLinks.length === 0) {
      die('No valid video links found');
    }

    return allLinks;
  } catch (error) {
    die(`Failed to get episode URL: ${error.message}`);
  }
}

// Select quality from available links
function selectQuality(links, quality) {
  // Sort by quality (higher first)
  links.sort((a, b) => {
    const qa = parseInt(a.quality) || 0;
    const qb = parseInt(b.quality) || 0;
    return qb - qa;
  });

  if (quality === 'best') {
    return links[0];
  } else if (quality === 'worst') {
    return links[links.length - 1];
  } else {
    // Try to match specific quality
    const match = links.find(l => l.quality.includes(quality));
    if (match) return match;
    
    log(`Quality ${quality} not found, using best available`, 'warn');
    return links[0];
  }
}

// Search anime
async function searchAnime(query) {
  const searchGql = `query($search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType) {
    shows(search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin) {
      edges {
        _id
        name
        availableEpisodes
        __typename
      }
    }
  }`;

  try {
    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify({
          search: { allowAdult: false, allowUnknown: false, query },
          limit: 40,
          page: 1,
          translationType: CONFIG.mode,
          countryOrigin: 'ALL',
        }),
        query: searchGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    const shows = response.data.data.shows.edges;
    return shows.map(show => ({
      id: show._id,
      name: show.name,
      episodes: show.availableEpisodes[CONFIG.mode] || 0,
    }));
  } catch (error) {
    die(`Search failed: ${error.message}`);
  }
}

// Get episodes list
async function getEpisodesList(showId) {
  const episodesGql = `query($showId: String!) {
    show(_id: $showId) {
      _id
      availableEpisodesDetail
    }
  }`;

  try {
    const response = await axios.get(`${CONFIG.allanimeApi}/api`, {
      params: {
        variables: JSON.stringify({ showId }),
        query: episodesGql,
      },
      headers: {
        'User-Agent': CONFIG.agent,
        'Referer': CONFIG.allanimeRefr,
      },
    });

    const episodes = response.data.data.show.availableEpisodesDetail[CONFIG.mode] || [];
    return episodes.sort((a, b) => parseFloat(a) - parseFloat(b));
  } catch (error) {
    die(`Failed to get episodes: ${error.message}`);
  }
}

// Play episode
function playEpisode(url, title, episodeNumber) {
  log(`Playing: ${title} - Episode ${episodeNumber}`, 'info');
  
  if (!CONFIG.player) {
    log('No video player found, opening in browser...', 'warn');
    const { execSync } = require('child_process');
    const command = os.platform() === 'win32' ? 'start' : os.platform() === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${command} "${url}"`);
    return;
  }
  
  // Check if player exists
  const isFullPath = CONFIG.player.includes('\\') || CONFIG.player.includes('/');
  const playerExists = isFullPath ? fs.existsSync(CONFIG.player) : commandExists(CONFIG.player);
  
  if (!playerExists) {
    log(`Player '${CONFIG.player}' not found, opening in browser...`, 'warn');
    const { execSync } = require('child_process');
    const command = os.platform() === 'win32' ? 'start' : os.platform() === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${command} "${url}"`);
    return;
  }
  
  // Build player arguments
  let args = [];
  const playerLower = CONFIG.player.toLowerCase();
  
  if (playerLower.includes('mpv')) {
    args = [
      `--force-media-title=${title} Episode ${episodeNumber}`,
      '--referrer=' + CONFIG.allanimeRefr,
      url,
    ];
  } else if (playerLower.includes('vlc')) {
    args = [
      url,
      '--play-and-exit',
      `--meta-title=${title} Episode ${episodeNumber}`,
      '--http-referrer=' + CONFIG.allanimeRefr,
    ];
  } else {
    args = [url];
  }
  
  log(`Using player: ${CONFIG.player}`, 'info');
  log('Starting playback...', 'success');
  
  const player = spawn(CONFIG.player, args, {
    detached: true,
    stdio: 'ignore',
  });
  
  player.on('error', (error) => {
    log(`Failed to start player: ${error.message}`, 'error');
  });

  player.unref();
}

// Update history
function updateHistory(showId, title, episodeNumber) {
  const histData = fs.readFileSync(CONFIG.histFile, 'utf8');
  const lines = histData.split('\n').filter(l => l.trim());
  
  const newLine = `${episodeNumber}\t${showId}\t${title}`;
  const existingIndex = lines.findIndex(l => l.includes(`\t${showId}\t`));
  
  if (existingIndex !== -1) {
    lines[existingIndex] = newLine;
  } else {
    lines.push(newLine);
  }
  
  fs.writeFileSync(CONFIG.histFile, lines.join('\n') + '\n');
}

// Get history
function getHistory() {
  const histData = fs.readFileSync(CONFIG.histFile, 'utf8');
  return histData
    .split('\n')
    .filter(l => l.trim())
    .map(line => {
      const [episode, id, ...titleParts] = line.split('\t');
      return { episode, id, title: titleParts.join('\t') };
    });
}

// Main CLI logic
async function main() {
  program
    .name('ani')
    .version(VERSION)
    .description('Simple anime streaming CLI tool')
    .option('-c, --continue', 'Continue watching from history')
    .option('-d, --dub', 'Watch dubbed version')
    .option('-q, --quality <quality>', 'Video quality (best/worst/720p/1080p)', 'best')
    .option('-e, --episode <number>', 'Specify episode number')
    .option('-D, --delete-history', 'Delete history')
    .option('-p, --player <player>', 'Specify video player')
    .argument('[query...]', 'Search query')
    .parse();

  const options = program.opts();
  const args = program.args;

  // Set config from options
  if (options.dub) CONFIG.mode = 'dub';
  if (options.quality) CONFIG.quality = options.quality;
  if (options.player) CONFIG.player = options.player;
  
  // Show which player will be used
  if (CONFIG.player) {
    log(`Using player: ${CONFIG.player}`, 'info');
  } else {
    log('No video player detected, will use browser', 'warn');
  }

  // Delete history
  if (options.deleteHistory) {
    fs.writeFileSync(CONFIG.histFile, '');
    log('History cleared', 'success');
    return;
  }

  // Continue from history
  if (options.continue) {
    const history = getHistory();
    if (history.length === 0) die('No history found!');

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select anime to continue:',
        choices: history.map(h => ({
          name: `${h.title} (Last watched: Episode ${h.episode})`,
          value: h,
        })),
      },
    ]);

    const episodes = await getEpisodesList(selected.id);
    const currentIndex = episodes.indexOf(selected.episode);
    const nextEpisode = episodes[currentIndex + 1] || episodes[currentIndex];

    log(`Fetching episode ${nextEpisode}...`, 'info');
    const links = await getEpisodeUrl(selected.id, nextEpisode);
    const selectedLink = selectQuality(links, CONFIG.quality);
    
    playEpisode(selectedLink.url, selected.title, nextEpisode);
    updateHistory(selected.id, selected.title, nextEpisode);
    return;
  }

  // Search anime
  const query = args.join(' ');
  if (!query) die('Please provide a search query!');

  log(`Searching for: ${query}`, 'info');
  const results = await searchAnime(query);

  if (results.length === 0) die('No results found!');

  const { selectedAnime } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedAnime',
      message: 'Select anime:',
      choices: results.map(r => ({
        name: `${r.name} (${r.episodes} episodes)`,
        value: r,
      })),
    },
  ]);

  // Get episodes
  const episodes = await getEpisodesList(selectedAnime.id);

  let episodeNumber;
  if (options.episode) {
    episodeNumber = options.episode;
  } else {
    const { selectedEpisode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEpisode',
        message: 'Select episode:',
        choices: episodes.map(ep => ({ name: `Episode ${ep}`, value: ep })),
      },
    ]);
    episodeNumber = selectedEpisode;
  }

  // Get video links and play
  log(`Fetching episode ${episodeNumber}...`, 'info');
  const links = await getEpisodeUrl(selectedAnime.id, episodeNumber);
  const selectedLink = selectQuality(links, CONFIG.quality);
  
  playEpisode(selectedLink.url, selectedAnime.name, episodeNumber);
  updateHistory(selectedAnime.id, selectedAnime.name, episodeNumber);
}

// Run
if (require.main === module) {
  main().catch(error => {
    die(error.message);
  });
}

module.exports = { searchAnime, getEpisodesList, getEpisodeUrl };
