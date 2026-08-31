# Sprint 2 — Change Log

This document records every change made during Sprint 2, grouped by feature.
Each entry follows the format:

> **Why** — what problem this solves
> **What** — what was changed
> **Files** — affected files
> **Test** — how to verify

---

## Feature 1 — Image Upload (Supabase Storage) ✅

### Why

The original `EditItemModal` uploaded images inline with raw `supabase.storage` calls, silently swallowed errors with `if (error) return`, and used a folder convention that didn't match the storage RLS policies. Vendors saw broken thumbnails with no feedback. The vendor profile modal uploaded to a non-existent bucket called `vendor-images`. Logo/cover uploads never persisted.

### What

- Added the missing Supabase Storage bucket + RLS policies in a new migration so uploads are accepted by the storage layer.
- Centralised all image upload logic in `frontend/src/api/uploads.js` with:
  - 5 MB size cap (Supabase default is 50 MB)
  - Friendly error messages
  - Folder convention that matches the RLS policies (`menu/<timestamp>` for menu photos, `vendors/<uuid>/logo|cover-<ts>` for vendor assets)
- Rewired `EditItemModal` to use the helper and surface real errors via toast.
- Rewrote `EditProfileModal` to:
  - Upload logo + cover to the right bucket, under the right folder
  - Use the shared `HoursEditor` instead of a free-text field
  - Convert opening hours to the canonical CSV on save
  - Show clear "uploading" state and toasts on success/failure

### Files

- `supabase/migrations/20260809000000_menu_images_bucket.sql` (new) — bucket + 7 storage policies
- `frontend/src/api/uploads.js` (new)
- `frontend/src/components/vendor/EditItemModal.jsx` — uses `uploadMenuImage`
- `frontend/src/components/vendor/EditProfileModal.jsx` — uses `uploadVendorAsset`, drops free-text hours

### Test

1. Apply the migration in Supabase SQL editor.
2. Sign in, open **Menu → Add item**, upload a JPG — image preview appears, save the item, refresh — thumbnail shows on the menu card.
3. Try uploading a > 5 MB file — toast says "Image is too large (max 5 MB)".
4. Open **Settings → Edit profile**, upload a cover and a logo — both appear in the modal and persist after refresh.

---

## Feature 2 — Vendor Dashboard ✅

### Why

The previous dashboard rendered the orders tab without context, had no loading/error states for first paint, and didn't surface actionable signals (pending orders, low stock, quick add). Vendors had to click around to find what needed attention.

### What

- Added three "Quick Actions" tiles above the kanban: pending count, low-stock count, and a one-click "Add menu item" shortcut.
- Added an amber low-stock banner at the top of the orders tab when any item is at or below its threshold. Powered by `dashboard` endpoint's `low_stock` payload.
- Wired `useOrders` to expose `error` and `loading`. Dashboard renders `ErrorState` with retry for both stats and orders, and `LoadingState` while the first paint is in flight.
- Refactored orders content into an `OrdersScreen` component so the Dashboard shell stays compact and each region owns its own loading / error states.
- Header now mutates `vendor` through the auth context (`updateVendor`) instead of writing directly to a prop, so the toggle-pause action reflects everywhere immediately.
- Fixed broken Tailwind classes (`bg-brand-orange` → `bg-brand-orange-500`, `text-brand-orange` → `text-brand-orange-500`) on every live component (Sidebar, Header, MenuCard, OrderColumn, OrderHistory, FeaturedView, AnalyticsView).

### Files

- `frontend/src/pages/Dashboard/Dashboard.jsx` — added QuickActions + OrdersScreen, error/loading wiring
- `frontend/src/components/vendor/Header.jsx` — uses `updateVendor` from auth context
- `frontend/src/components/vendor/Sidebar.jsx` — Tailwind shade fix
- `frontend/src/components/vendor/OrderColumn.jsx` — Tailwind shade fix
- `frontend/src/components/vendor/OrderHistory.jsx` — Tailwind shade fix
- `frontend/src/components/vendor/MenuCard.jsx` — Tailwind shade fix
- `frontend/src/pages/FeaturedView.jsx` — Tailwind shade fix
- `frontend/src/pages/AnalyticsView.jsx` — Tailwind shade fix
- `frontend/src/hooks/useOrders.js` — exposes `error`
- `frontend/src/components/vendor/OrdersView.jsx` — accepts `loading` prop

### Test

1. Sign in — first paint shows `LoadingState` briefly, then the dashboard.
2. Pull the network cable or block `/api/vendor/dashboard` — `ErrorState` with a "Try again" button appears for stats; the rest of the page still renders.
3. With an item whose `quantity ≤ low_stock_threshold`, refresh — amber banner appears at the top.
4. Click **Pause** in the header — header badge flips to "Paused" immediately (no stale "Accepting orders").

---

## Feature 3 — Notifications ✅

### Why

The header bell was a static decoration: it showed a dot but no count, no dropdown, and no realtime hook. Vendors had to refresh the page to see if a new order arrived.

### What

- New `NotificationBell` component with:
  - Live count badge over the bell (pending orders)
  - Dropdown with the most recent 5 pending orders, each clickable
  - Realtime subscription on `INSERT` to the vendor's `orders` table that fires a custom toast the moment a student places an order
- Header now consumes `pendingOrders` from the Dashboard instead of fetching its own data.
- Clicking an item in the dropdown navigates to the orders tab and scrolls the row into view.

### Files

- `frontend/src/components/vendor/NotificationBell.jsx` (new)
- `frontend/src/components/vendor/Header.jsx` — replaced static bell with `NotificationBell`, accepts `pendingOrders`
- `frontend/src/pages/Dashboard/Dashboard.jsx` — passes `orders` as `pendingOrders`

### Test

1. With at least one pending order, click the bell — dropdown shows the order(s) with student name, total, and relative time.
2. Open a second browser, sign in as no one, and place a test order against the vendor — the bell badge increments and a toast pops in the vendor's window within ~1s.
3. Click the toast / dropdown item — page jumps to the orders tab and highlights the row.

---

## Feature 4 — Performance ✅

### Why

The Dashboard re-rendered the entire view on every realtime order update because `useEffect` triggered a full `loadDashboard()` whenever `orders.length` changed, and the inline handler closures forced child trees to re-render too. With a busy vendor this caused jank and unnecessary network round-trips.

### What

- Stats refetch now keys on `pendingCount` (memoised) instead of `orders.length`. A completed order no longer triggers a second `fetchDashboard()` call.
- All Dashboard handlers (`handleSaveItem`, `handleDelete`, `handleToggleAvailability`, `handleRestock`, `loadDashboard`) are wrapped in `useCallback` so child memoised components don't lose referential equality on every parent render.
- `OrdersScreen` is wrapped in `React.memo` so the orders tab content skips re-render when only the header or sidebar props change.

### Files

- `frontend/src/pages/Dashboard/Dashboard.jsx`

### Test

1. Open DevTools → Network → filter on `dashboard`. Place 5 test orders — the request fires once at first paint, then only when a new *pending* order arrives. Completed/rejected orders do not trigger a refetch.
2. Profile React DevTools — `OrdersScreen` should report "props did not change" on most realtime events.

---