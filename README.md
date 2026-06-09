<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-1.1-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v1.1)
[![MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE/MIT)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

A minimalist, lightweight online media browsing platform that anonymously helps popularize your favorite content. Use a lightweight PHP backend to store interaction data.

## Features

- **Multi-channel support**: Switch between channels via the top-left button, each with independent resource URL, database, announcement, etc.
- **Category browsing**: Favorites, Explore, Home, Recommend, Hot, Top Liked, Featured, Best, Shared, Sensitive tabs
- **Adaptive grid layout**: 1-5 columns freely switchable, 12 card viewport ratio options (original, 16:9, 4:3, 1:1, etc.)
- **Bookmark system**: Sidebar for adding/jumping/clearing bookmarks to quickly locate content
- **Interaction stats**: Views, likes, favorites, downloads, shares, blocks — persisted to SQLite
- **Lazy loading**: On-demand image and video loading with infinite scroll
- **Fullscreen view**: Click media to enter fullscreen with zoom and 1:1 original size support
- **Theme switching**: Multiple built-in themes, one-click switch in settings panel
- **Auto data refresh**: Configurable refresh interval (10/30/60 minutes), with manual immediate update
- **Long-press dropdown menu**: Overflow navigation buttons auto-collapsed into a "More" dropdown control, long-press to expand
- **Mobile-friendly**: Touch event compatible, responsive layout
- **Cross-origin media support**: `crossOrigin = 'anonymous'`, compatible with OSS and other third-party resource services

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
│   │   └── db.php          # SQLite database initialization
│   ├── images/             # Media resources (gitignored)
│   └── videos/             # Video resources (gitignored)
├── scripts/
│   ├── 图片人工审核.py       # Manual review tool
│   ├── 批量自定义重命名.py   # Batch rename tool
│   ├── 文件列表生成.py       # File list generator
│   └── 文件列表同步.py       # File list sync
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
php -S localhost:8080 -t src
```

Open `http://localhost:8080` in your browser.

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

Returns `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...] }`

### POST Request

```
POST /api/data.php
Content-Type: application/json

{ "db": "xxx", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats` (views/likes/favorites) / `extra` (downloads/shares/blocks)
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block`

## License

This project is licensed under the [MIT License](./LICENSE/MIT).

Copyright &copy; 2026 [JularDepick](https://github.com/JularDepick/). See [COPYRIGHT](./COPYRIGHT) for details.
