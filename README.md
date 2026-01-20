# ani-cli (Node.js)

A simple command-line interface for streaming anime, inspired by the original ani-cli bash script.

## Features

- 🔍 Search anime by title
- 📺 Stream episodes directly
- 📖 Watch history tracking
- 🎬 Continue watching from last episode
- 🎭 Dubbed/subbed support
- 🎮 Custom video player support

## Installation

```bash
npm install
npm link  # Makes 'ani' command available globally
```

Or run directly:

```bash
node cli.js [options] [query]
```

## Usage

### Basic Search

```bash
ani naruto
ani one piece
```

### Continue from History

```bash
ani --continue
ani -c
```

### Watch Dubbed Version

```bash
ani --dub "demon slayer"
```

### Specify Episode

```bash
ani --episode 5 "attack on titan"
ani -e 5 "attack on titan"
```

### Specify Quality

```bash
ani --quality 1080p "one piece"
ani -q 720p "one piece"
```

### Custom Video Player

```bash
ani --player vlc "bleach"
ani -p mpv "bleach"
```

### Delete History

```bash
ani --delete-history
ani -D
```

## Options

```
  -V, --version              Output the version number
  -c, --continue             Continue watching from history
  -d, --dub                  Watch dubbed version
  -q, --quality <quality>    Video quality (best/worst/720p/1080p) (default: "best")
  -e, --episode <number>     Specify episode number
  -D, --delete-history       Delete history
  -p, --player <player>      Specify video player
  -h, --help                 Display help for command
```

## Environment Variables

- `ANI_CLI_MODE` - Default mode (sub/dub) (default: "sub")
- `ANI_CLI_QUALITY` - Default quality (default: "best")
- `ANI_CLI_PLAYER` - Default video player (default: platform-specific)
- `ANI_CLI_HIST_DIR` - History directory path

## Examples

```bash
# Search and watch
ani "cowboy bebop"

# Continue from history
ani -c

# Watch specific episode in 1080p
ani -e 1 -q 1080p "steins gate"

# Watch dubbed version
ani --dub "fullmetal alchemist"

# Use VLC player
ani --player vlc "death note"
```

## Requirements

- Node.js (v14 or higher)
- A video player (mpv, vlc, iina, etc.)

## Platform Support

- ✅ Windows (mpv.exe, vlc.exe)
- ✅ macOS (iina, mpv, vlc)
- ✅ Linux (mpv, vlc)

## History File

History is stored at:
- Windows: `%USERPROFILE%\.local\state\ani-cli\ani-hsts`
- macOS/Linux: `~/.local/state/ani-cli/ani-hsts`

## Notes

This is a simplified version focused on core functionality. The original shell script has more advanced features like:
- Multiple provider support
- Download functionality
- Syncplay integration
- Advanced quality selection
- Skip intro functionality

## License

MIT
