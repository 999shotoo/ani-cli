#!/usr/bin/env node

/**
 * Helper utilities for ani-cli
 */

const fs = require('fs');
const path = require('path');

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Parse episode range (e.g., "5-8" -> [5,6,7,8])
 */
function parseEpisodeRange(range, episodes) {
  if (range.includes('-')) {
    const [start, end] = range.split('-').map(n => n.trim());
    const startIdx = episodes.indexOf(start);
    const endIdx = episodes.indexOf(end);
    
    if (startIdx === -1 || endIdx === -1) return null;
    
    return episodes.slice(startIdx, endIdx + 1);
  }
  
  if (episodes.includes(range)) {
    return [range];
  }
  
  return null;
}

/**
 * Format title for file/display
 */
function formatTitle(title) {
  return title.replace(/[^\w\s-]/g, '').trim();
}

/**
 * Check if command exists
 */
function commandExists(command) {
  const { execSync } = require('child_process');
  try {
    execSync(`where ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get player command based on platform
 */
function getPlayerCommand(player, url, title) {
  const commands = {
    'mpv': [url, `--force-media-title=${title}`],
    'mpv.exe': [url, `--force-media-title=${title}`],
    'vlc': [url, `--play-and-exit`, `--meta-title=${title}`],
    'vlc.exe': [url, `--play-and-exit`, `--meta-title=${title}`],
    'iina': [url, `--mpv-force-media-title=${title}`],
  };
  
  return commands[player] || [url];
}

module.exports = {
  ensureDir,
  parseEpisodeRange,
  formatTitle,
  commandExists,
  getPlayerCommand,
};
