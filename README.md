# Better Dynamo Administration

**Better Dynamo Administration (BDA)** is a Tampermonkey userscript that dramatically improves the Oracle ATG Dynamo Administration experience with a modern UI, smarter search, and productivity tools.

## Install

> Requires [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari).

**One-click install:**
[https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js](https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js)

Open the link above in your browser with Tampermonkey installed — it will prompt you to install automatically.
Updates are applied automatically when a new version is published.

## Features

### v3.1 — Repository, Search & UX
- **Repository cards** — descriptor results rendered as independent cards in a responsive 2-column grid with minimize/close controls
- **Per-card property search** — filter rows by formatted name or raw key instantly
- **Inline item popover** — clicking a linked item ID shows a compact "Add / Add & Apply" popover instead of a blocking modal
- **Smart query editor** — always appends with a blank-line separator; clicking a property appends instead of overwriting
- **R / D / E badges** — read-only, derived, exportable markers on each property
- **Raw XML viewer** — collapsible per-item sections with search by ID
- **Case-insensitive component search** — "itaushop" finds ItauShopAdapter, ItauShopClient, etc.
- **Navbar autocomplete** — type 3+ chars, wait 2s, get case-insensitive suggestions with direct navigation
- **Scheduler redesign** — card layout, clean date formatting, vis.js timeline, bulk delete
- **Sticky navbar** — fixed at top of page on scroll

### v3.0 — UI Overhaul
- Redesigned sticky navbar with brand, search, and action buttons
- Dark mode toggle (persisted across sessions)
- Keyboard shortcuts framework (press `?` to see all)
- Component breadcrumb navigation
- Favorites as cards with color bar and tag pills
- Component history pills below the navbar
- Actor REST endpoint caller

### v2.1 (original)
- Repository item tree view
- Default property values in result tables
- Query editor autocomplete for GSA tags
- Dash auto-save

## Development

```bash
npm install
npm run dev    # dev server with hot reload
npm run build  # produces dist/better-dyn-admin.user.js
```

Built with TypeScript 5, Vite 5, and [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey).

## Contributing

Issues and PRs welcome at [github.com/GustavoPickler/BetterDynAdmin](https://github.com/GustavoPickler/BetterDynAdmin/issues).

---

*Originally created by [jc7447](https://github.com/jc7447/BetterDynAdmin). Maintained and extended by [GustavoPickler](https://github.com/GustavoPickler).*
