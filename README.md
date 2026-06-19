<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-1.5.1-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v1.5.1)
[![MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE/MIT)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

A minimalist, lightweight online media browsing platform that anonymously helps popularize your favorite content. Uses a lightweight PHP backend to store interaction data.

## Features

- **Multi-channel support**: Switch between channels via the top-left button, each with independent resource URL, database, announcement, etc. Switching channels automatically interrupts in-flight media loads (images/videos/audios), immediately aborting network requests from the previous channel
- **Tag system**: Resource cards display floating tag banners at the top (toggleable), tag data stored in channel database, managed via the admin panel
- **Tag filtering**: "Tags" tab in the navigation bar allows filtering media by tags, supports exact match and partial match modes, multiple tags use intersection, sorted by recommendation formula
- **Category browsing**: Favorites, Explore, Home, Recommend, Hot, Top Liked, Featured, Best, Shared, Sensitive tabs
- **Adaptive grid layout**: 1-5 columns freely switchable, 12 card viewport ratio options (original, 16:9, 4:3, 1:1, etc.)
- **Bookmark system**: Sidebar for adding/jumping/clearing bookmarks to quickly locate content
- **Interaction stats**: Views, likes, favorites, downloads, shares, blocks — persisted to SQLite
- **Lazy loading**: On-demand image, video, and audio loading with infinite scroll
- **Fullscreen view**: Click media to enter fullscreen with zoom and 1:1 original size support
- **Audio player**: Custom audio player with play/pause, progress bar, volume control, speed adjustment
- **Video player**: Custom video player with playback controls, progress bar, volume, speed settings
- **In-card playback controls**: Video/audio cards embed play button, progress bar, and mute button for inline playback without fullscreen
- **Theme switching**: Multiple built-in themes (Light/Dark, Rose Red, Pink, Summer Orange, Vintage Yellow, Spring Green, Plateau Cyan, Sky Blue, Space Purple), one-click switch in settings panel
- **Auto data refresh**: Configurable refresh interval (10/30/60 minutes), with manual immediate update
- **Long-press dropdown menu**: Overflow navigation buttons auto-collapsed into a "More" dropdown control, long-press to expand
- **Mobile-friendly**: Touch event compatible, responsive layout
- **First-visit guide**: Auto-shows operation tips for new visitors

## Project Structure

```
WebMedia-MicroChannel/
├── src/
│   ├── index.html          # Main page
│   ├── main.js             # Core logic (UI, interactions, data management)
│   ├── main.css            # Stylesheet
│   ├── favicon.ico         # Site icon
│   ├── api/
│   │   ├── data.php        # Unified data API (GET/POST)
│   │   ├── db.php          # SQLite database initialization
│   │   └── sqlitedb/       # SQLite database files
│   ├── images/             # Image resources (gitignored)
│   ├── videos/             # Video resources (gitignored)
│   ├── audios/             # Audio resources (gitignored)
│   └── mgr/                # Admin panel (accessible via /mgr/ path)
│       ├── index.html      # Admin entry
│       ├── main.js         # Admin logic
│       ├── style.css       # Admin styles
│       ├── pwd.html        # Password hash generator
│       └── api/            # Admin PHP API
├── scripts/
│   ├── 图片人工审核.py       # Manual review tool
│   ├── 批量自定义重命名.py   # Batch rename tool
│   ├── 文件列表生成.py       # File list generator
│   ├── 文件列表同步.py       # File list sync
│   └── image-judge-config.ini # Image review config
└── dist/                   # Build output
```

## Tech Stack

- **Frontend**: Vanilla HTML / CSS / JavaScript (no framework dependencies)
- **Backend**: PHP + SQLite3
- **Utility scripts**: Python

## Quick Start

### Requirements

- PHP 7.4+ (with SQLite3 extension enabled)
- Web server (Apache / Nginx / PHP built-in server)

### Local Development

```bash
# Clone the repository
git clone https://github.com/JularDepick/WebMedia-MicroChannel.git
cd WebMedia-MicroChannel

# Use PHP built-in server
php -S localhost:17891 -t src
```

Open `http://localhost:17891` in your browser.

### Channel Configuration

Edit the `CHANNEL_CONFIGS` array in `src/main.js`:

```js
{
  id: 'channel-id',
  name: 'Channel Name',
  nickname: 'Page Title',
  announcement: 'Channel announcement (HTML supported)',
  backend: 'api/',              // API path
  dbPath: 'sqlitedb/path/',     // Database directory
  dbName: 'database.db',       // Database filename
  tableName: 'media_data',     // Table name
  resourceUrl: 'images/',      // Resource URL
  mediaPrefix: 'img-',         // Filename prefix
  mediaIdLength: 4,            // Zero-padded ID length
  mediaIdMin: 1,               // Minimum ID
  mediaIdMax: 100,             // Maximum ID
  mediaExt: '.jpg',            // File extension
  mediaType: 'img'             // Media type: img / video / audio
}
```

## API

### GET Request

```
GET /api/data.php?db=xxx&min=1&max=100
```

Returns `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...], labels: [{id, labels: [...]},...] }`

### POST Request

```
POST /api/data.php
Content-Type: application/json

{ "db": "xxx", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats` (views/likes/favorites) / `extra` (downloads/shares/blocks)
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block` / `getLabels` / `setLabels`

## Admin Panel

The admin panel (`src/mgr/`) is a backend for viewing channel data statistics and managing tags.

### Generate Password

1. Open `src/mgr/pwd.html` in a browser
2. Enter the salt, username, and password, then click "Generate"
3. Paste the hash into the corresponding account in `src/mgr/api/account.php`

### Access the Admin Panel

The admin panel starts with the main server, accessible via the `/mgr/` path:

```
http://localhost:17891/mgr/
```

### Usage

1. **Login**: Enter credentials configured in `account.php`
2. **Select Data Source**: Choose between "Server Config" (read channel config from main.js) and "Local Database" (scan database directory)
3. **Select Channel**: Click a channel card to enter the detail page
4. **Data Statistics**: View views, likes, favorites, downloads, shares, blocks
5. **Label Management**:
   - Press Enter or comma to add a tag, Backspace to delete the last tag, click x to remove
   - Supports "Clear" (with confirmation) and "Save" operations
   - Max 10 labels per media, max 20 characters per label
6. The frontend automatically fetches and displays tags on card tops on the next data refresh

## License

This project is licensed under the [MIT License](./LICENSE/MIT).

Copyright &copy; 2026 [JularDepick](https://github.com/JularDepick/). See [COPYRIGHT](./COPYRIGHT) for details.
