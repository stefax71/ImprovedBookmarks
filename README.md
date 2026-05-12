# Improved Bookmarks

A Chrome / Edge browser extension that brings back the **Collections** feature removed from Microsoft Edge starting with version 145. It lives in the side panel and lets you group saved pages into named collections, complete with screenshots, titles, notes, and nested sub-collections.

## Features

- **Collections** — create, rename, delete, and reorder collections via drag-and-drop
- **Sub-collections** — nest collections inside other collections, to any depth
- **Page items** — save the current tab with an automatic screenshot, title, and an optional note
- **Screenshot capture** — uses `captureVisibleTab` on Chrome; falls back to `html2canvas` on Edge
- **YouTube thumbnails** — automatically uses the video thumbnail instead of a screenshot
- **Recapture** — update the screenshot of a saved item at any time
- **Filter** — real-time search across titles, URLs, and notes within a collection
- **Drag-and-drop reordering** — for both collections and items
- **Export / Import** — back up all your collections to a JSON file and restore them later

## Installation

There is no build step. All files are plain ES modules served directly by the browser runtime.

1. Clone or download this repository.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the repository folder.
5. Open the side panel with **Alt+Shift+Y** or click the extension icon in the toolbar.

After editing any file, click the refresh icon on the extensions page and reopen the side panel to pick up the changes.

## Usage

| Action | How |
|---|---|
| Create a collection | Click **+ New Collection** in the toolbar |
| Open a collection | Click on any collection card |
| Add the current page | Open a collection, then click **+ Add current page** |
| Create a sub-collection | Open a collection, then click **+ New** in the Sub-collections section |
| Rename / delete | Hover a collection card to reveal the action buttons |
| Reorder | Drag a card by its handle (⠿) and drop it in the new position |
| Filter items | Type in the filter box at the top of the collection view |
| Export all data | Menu (⋮) → **Export** |
| Import a backup | Menu (⋮) → **Import** |

## Architecture

The UI is a single side panel (`sidebar.html` + `sidebar.css`). All logic is split into ES modules loaded via `<script type="module">`.

| File | Responsibility |
|---|---|
| `sidebar.js` | Entry point — wires up toolbar buttons and bootstraps the initial render |
| `storage.js` | Thin wrapper around `chrome.storage.local`; exposes `getCollections`, `saveCollections`, and `findCollectionById` (recursive tree search) |
| `collections.js` | Creates and renders collection cards; handles rename, delete, and drag-and-drop reordering |
| `navigation.js` | Stack-based navigation between the collections list and individual collection views; `openCollection` pushes onto the stack, `goBack` pops it |
| `items.js` | Renders page items, handles filtering, owns the add/edit item modal and screenshot capture flow |
| `types.js` | JSDoc `@typedef` declarations for `Collection` and `Item` — no runtime code |
| `background-service-worker.js` | MV3 service worker; opens the side panel and captures screenshots via `captureVisibleTab` (with `html2canvas` fallback) |

## Data model

Everything is stored in `chrome.storage.local` under the key `collections` as a `Collection[]` array. Collections are a recursive tree: each `Collection` may contain both `items` (saved pages) and `subcollections` (nested collections). Both have an `order` field used for display sorting.

```
Collection
├── id: string
├── name: string
├── order: number
├── items: Item[]
│   └── { id, title, url, note, screenshot, order, addedAt }
└── subcollections: Collection[]        ← recursive, any depth
```

## Screenshot capture flow

The service worker captures the visible tab the moment the side panel opens (before the user navigates away) and stores it in `chrome.storage.session` as `latest_screenshot`. When the user clicks **+ Add current page**, `items.js` sends a `captureScreenshot` message to the service worker, which responds with the stored data URL. `vendor/html2canvas.min.js` is injected as a content-script fallback when `captureVisibleTab` is unavailable (Edge behaviour).

## License

MIT