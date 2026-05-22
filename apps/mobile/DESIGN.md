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
Configured in `.cursor/mcp.json` (Google Stitch). Project **Zygo Neon Dark** (`10644426581744815413`).

Driver Trip tab (captain): idle + active trip UI on `DriverTripScreen`. Customer tracking stays on Home → `RideTrack` and Orders → ride detail.

Delivery Trip tab (food rider): `DeliveryTripScreen` — same Stitch pattern as captain (`DeliveryTripIdleView` / `DeliveryTripActiveView`, `DeliveryStatusPills`).

Customer **Orders** tab: `OrderListCard` glass rows, status chips (completed / cancelled / active), `AppScreen` header — Stitch Zygo Neon Dark.

Customer **Restaurants** (food): `RestaurantListCard` + `StackBackHeader`, glass list from Home → Food delivery — Stitch Zygo Neon Dark.

**Profile** tab (all roles): `RoleProfileScreen` — Stitch-style header card (avatar, name, phone, rating for partners) + glass menu list. Items are role-specific (`profileMenu.ts`). Customer: food, rides, orders, addresses; captain: earnings, wallet, history; delivery: same; shop: orders, menu, insights.
