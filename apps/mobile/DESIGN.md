# Zygo Mobile — Stitch Neon Dark

Design tokens used across all screens (except Sign in / Sign up).

## Colors
- Background `#000000`
- Primary `#A855F7` / Bright `#BF5AF2`
- Lavender `#D8B4FE`
- Glass card `rgba(20, 16, 32, 0.72)` + violet border

## Spacing (8pt grid)
- Screen gutter: **20px** horizontal
- Section gap: **16px** between blocks
- Card gap: **12px** between cards
- Safe area: applied via `useAppInsets` / `ScreenShell`

## Layout components
- `AppScreen` — tab roots with mesh background + header
- `StackScroll` — stack screens with native header
- `PageHeader` — title + subtitle
- `GlassCard` / `Card` — content surfaces

## Stitch MCP
To regenerate screens from Stitch in Cursor, enable MCP:
```json
"stitch": { "command": "npx", "args": ["-y", "@_davideast/stitch-mcp", "proxy"] }
```
