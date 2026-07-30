# Changelog

All notable changes to the Cravio Marketplace project will be documented in
this file. Dates are absolute (YYYY-MM-DD).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- (planned) Student app (browse vendors, place orders)

## [v2.1.0] - 2026-07-25

### Added
- Modular backend layout (`src/{config,middleware,routes,controllers,services}`)
- Frontend `api/`, `components/common/`, `components/vendor/`, `hooks/`,
  `contexts/`, `utils/` split
- Auth context with persistent session (`AuthContext`)
- `useOrders` hook with Supabase realtime subscription
- `useMenu` hook with CRUD + availability + restock helpers
- Orange-themed design system: `Button`, `Input`, `Select`, `Textarea`,
  `Card`, `Modal`, `Badge`, `Toggle`, `StatCard`, `EmptyState`,
  `ConfirmDialog`
- 4-column kanban order view with status icons, counts, and pulse animation
  for new pending orders
- Menu card-hybrid grid with image upload, sort/filter, stock badge
- Stock auto-decrement on order complete + low-stock alerts + restock modal
- `stock_logs` table and `addStock` / `decrementStockForOrder` services
- Stock history endpoint
- Order history with date + status filter and CSV export
- `GET /api/vendor/dashboard` aggregated stats
- Support ticket categories and `category` column
- Mobile bottom navigation
- Empty-state component with variants for menu / orders / featured / support /
  search
- `verifyPending` copy refresh and rejection-reason flow

### Changed
- Header: brand + status badge + search + bell + profile menu
- Profile page: cover hero, logo overlay, verification badge, tabbed sections
- Settings page: real sections (Profile, Password, Notifications, Payout
  placeholder, Danger zone) and password change modal
- Login: validates `verification_status` and routes to the right screen
- CORS: accepts comma-separated `FRONTEND_URL` for multi-origin dev
- Backend now boots from `src/index.js` (package.json scripts updated)
- Color tokens centralised in `tailwind.config.js` under `brand.orange`
- Toast theme uses brand orange

### Fixed
- `/api/menu` select typo on variants join
- Stock not auto-decrementing on order completion
- CORS on deployed env
- RLS-aware Supabase client (service-role for server, anon for client)

## [v2.0.0] - 2025-06-17

### Added
- Vendor sign-up with admin approval workflow
- Stock management with low-stock alerts
- Item variations (Small / Large)
- Auto-categorisation via keyword rules
- Featured items requests
- Support tickets system
- Bulk CSV menu upload
- Real-time order updates

### Changed
- Initial UI redesign (orange theme)
- Sidebar navigation with Profile / Categories / Featured
- Improved empty states with illustrations

### Fixed
- CORS errors on deployed environment
- Environment variable handling
- RLS policies for all tables

## [v1.0.0] - 2025-05-20

### Added
- Initial vendor dashboard
- Basic CRUD for menu
- Order management (accept / ready / complete)
- Supabase database integration
- Render & Vercel deployment

---

## Format guide

- **Added** – new features.
- **Changed** – changes in existing functionality.
- **Deprecated** – soon-to-be removed features.
- **Removed** – now-removed features.
- **Fixed** – any bug fixes.
- **Security** – vulnerability fixes.
