<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-2.0.0-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v2.0.0)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](./LICENSE)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

A minimal, lightweight online media browsing platform that promotes the content you love anonymously. The frontend and backend are both implemented with Nuxt.

## Features

- **Multi-channel support**: switch channels from the top-left button; each channel owns its resource address, database and announcement. Switching aborts the pending media requests of the previous channel immediately
- **Label system**: labels float above each card as a banner (can be disabled); label data lives in the channel database and is maintained from the admin panel
- **Label filtering**: the "标签" tab filters media by labels with exact or partial matching, multiple labels intersect, results follow the recommendation formula
- **Category browsing**: favorites, explore, home, recommend, hot, top-liked, featured, best, shared, sensitive
- **Adaptive grid**: 1 to 5 columns, twelve card aspect ratios including original size
- **Bookmarks**: add, jump and clear bookmarks from the left sidebar
- **Interaction stats**: views, likes, favorites, downloads, shares and blocks, persisted in SQLite
- **Lazy loading**: images, videos and audios load on demand with infinite scrolling
- **Fullscreen viewer**: fullscreen media viewing with zoom and 1:1 original size
- **Audio player**: play and pause, progress bar, volume control and playback speed
- **Video player**: playback control, progress bar, volume and speed settings
- **In-card playback controls**: play button, progress bar and mute button without entering fullscreen
- **Theme switching**: multiple built-in themes selectable from the settings panel
- **Automatic data refresh**: configurable refresh cycle of 10, 30 or 60 minutes plus a manual refresh
- **Overflow dropdown**: overflowing navigation buttons collapse into a "more" dropdown with long-press support
- **Mobile support**: touch event compatibility and responsive layout
- **First visit guide**: operation hints shown on the first visit

## Tech Stack

- **Framework**: Nuxt 4, frontend and backend unified
- **Frontend**: Vue 3 with TypeScript and the Composition API
- **Server**: Nitro file-based routes
- **Database**: SQLite through the built-in `node:sqlite` module
- **Tooling scripts**: Python 3

## Getting Started

### Requirements

- Node.js 22.5 or later with built-in `node:sqlite`

### Development

```bash
git clone https://github.com/JularDepick/WebMedia-MicroChannel.git
cd WebMedia-MicroChannel/src
npm install
npm run dev
```

Open `http://localhost:3000` in the browser.

### Build and deploy

```bash
cd src
npm run build
node ../dist/server/index.mjs
```

Build output goes to `dist/` at the project root and contains both the Node server and static assets.

### Channel configuration

Edit the `CHANNEL_CONFIGS` array in `src/shared/constants/channels.ts`:

```ts
{
  id: 'channel-id',
  name: 'Channel name',
  nickname: 'Page title',
  announcement: 'Channel announcement (HTML allowed)',
  backend: '/api/',            // API prefix, may point to a remote Nuxt backend
  dbPath: 'cait/',             // database directory relative to data/sqlitedb at project root
  dbName: 'channel.db',        // database file name
  tableName: 'media_data',     // table name
  resourceUrl: 'images/',      // resource URL
  mediaPrefix: 'img-',         // file name prefix
  mediaIdLength: 4,            // zero padding length
  mediaIdMin: 1,               // minimum id
  mediaIdMax: 100,             // maximum id
  mediaExt: '.jpg',            // file extension
  mediaType: 'img'             // media type: img / video / audio
}
```

`backend` accepts either a same-origin relative path or the absolute address of a remote Nuxt backend. Cross-origin access requires the origin to be listed in the runtime option `corsOrigins`.

## Data API

### Read

```
GET /api/data?db=cait20260609-0.db&dbPath=cait/&min=1&max=100
```

Returns `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...], labels: [{id, labels: [...]},...] }`.

### Write interactions

```
POST /api/data
Content-Type: application/json

{ "db": "cait20260609-0.db", "dbPath": "cait/", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats` for views, likes and favorites, `extra` for downloads, shares and blocks
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block` / `getData` / `getLabels` / `setLabels`

## Admin Panel

The admin panel is served from the same origin at `/mgr`.

### Generate a password

1. Open `/mgr/pwd` in the browser
2. Enter the salt, user name and password, then click generate
3. Put the resulting hash into `ADMIN_ACCOUNTS` in `src/server/config/site.ts`

### Workflow

1. **Sign in** with an account configured in `ADMIN_ACCOUNTS`
2. **Choose the data source**: either from the channel configuration or by scanning the same-origin database directory
3. **Pick a channel** from the channel cards
4. **Statistics**: inspect views, likes, favorites, downloads, shares and blocks
5. **Label management**: press Enter or comma to add a label, Backspace to remove the last one, click the cross to remove a specific label; up to 10 labels with at most 20 characters each
6. The main site picks the labels up on its next data refresh

## License

Released under the [Apache License 2.0](./LICENSE).

Copyright &copy; 2026 [JularDepick](https://github.com/JularDepick). See [COPYRIGHT](./COPYRIGHT) for details.
