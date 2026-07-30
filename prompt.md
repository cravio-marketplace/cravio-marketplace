🤖 Claude Prompt: Cravio Marketplace Full Review & Improvement
Project Overview
You are helping me build Cravio Marketplace – a food ordering platform for Nigerian university campuses. Think of it as a campus-focused food delivery system where:

Vendors (restaurant owners) manage their menu, orders, stock, and promotions.

Students (future phase) browse restaurants, order food, and get real-time updates.

Admins (manual for now) approve vendors, manage featured items, and handle disputes.

The backend is deployed on Render, the frontend on Vercel, and the database is Supabase (PostgreSQL).

Current tech stack:

Frontend: React + Vite + Tailwind CSS

Backend: Node.js + Express

Database: Supabase (PostgreSQL)

Auth: Supabase Auth (email/password, phone OTP later)

Storage: Supabase Storage (public buckets for logos/covers)

Hosting: Render (backend) + Vercel (frontend)

Deployment: GitHub connected to both

🎨 Part 1: UI/UX Improvements
1.1 Vendor Dashboard
Current issues:

Feels like an admin panel, not a modern operating system

Too much blue, not enough brand identity (brand color: orange #FF6B00)

Weak visual hierarchy and inconsistent spacing

Empty states are lifeless and lack guidance

No real-time "alive" feel

Requirements:

Make it feel like a food platform, not a school portal.

Use orange as the primary action color.

Redesign the header:

Left: Logo + vendor name + status badge (Accepting/Out of stock/Closed)

Center: Search bar for orders/menu

Right: Notifications bell + profile avatar with dropdown (Settings, Logout)

Redesign the 4-column order view:

Each column should show: status icon + count + preview (first 3 orders)

Add a "View All" link for each status

Use subtle animations for new orders (pulse, slide-in)

Add quick stats cards:

Today's revenue

Total orders

Pending actions

Active orders count

Fix spacing: Use consistent 8px grid (8, 12, 16, 24, 32, 48).

1.2 Menu Management
Current issues:

Table design is too basic and feels 2017

No visual representation of items (food images needed)

No filtering or sorting

Requirements:

Convert table to card-hybrid grid:

Each item card: small thumbnail (placeholder if no image), name, price, category tags, stock indicator

Quick actions: Edit, Toggle Availability, Delete

Status indicators: Available (green dot) / Unavailable (gray) / Low Stock (orange warning)

Add sorting/filtering:

Filter by category

Sort by name, price, stock, meal time

Improve item editor modal:

Add image upload for each item

Show preview of how it will appear on student app

Variation editor should be more intuitive (inline editing)

1.3 Profile & Settings
Current issues:

Profile page is flat and doesn't feel like a restaurant identity

Settings page has placeholders

Requirements:

Profile page:

Cover image at top (like a restaurant hero)

Logo + business name overlaid

Show verification badge

Tabbed sections: Info, Menu, Reviews (future), Orders

Settings page:

Real sections: Profile Info, Password, Notifications, Payout (coming soon), Danger Zone (delete account)

1.4 Empty States
Requirements:

Replace all generic "No items" messages with:

Illustrations or icons

Helpful description

Clear call-to-action button

Example: "No menu yet 🍽️ → Add your first dish to start receiving orders."

1.5 Mobile Responsiveness
Requirements:

The dashboard must be fully usable on tablets and large phones

Sidebar collapses to bottom navigation on mobile

Cards stack vertically

Touch-friendly targets (minimum 44px)

⚙️ Part 2: Feature Completion & Additions
2.1 Vendor Onboarding & Verification
Current state: Sign-up exists but verification is manual.
Requirements:

Sign-up flow should be complete:

Collect: business name, email, phone, password, description, address, opening hours

Optionally upload CAC (business registration) document

Create Supabase user with email_confirm = false

Insert into vendors with verification_status = 'pending'

Send admin notification via Formspree

Admin approval (manual for MVP):

Build a simple "Pending Vendors" view in the dashboard (or use Supabase UI)

Admin can Approve (set verification_status = 'open') or Reject (with reason)

When approved, send welcome email (future)

Login logic:

If verification_status = 'pending' → show "Awaiting admin approval" message

If verification_status = 'rejected' → show rejection reason

If verification_status = 'open' → full access

2.2 Order Management
Current issues:

Stock doesn't auto-decrease when orders complete

No notifications for low stock

No order history export

Requirements:

Auto-decrease stock:

When order is marked "completed", reduce stock of item/variant by quantity

Show a warning toast if stock becomes low

Low stock alerts:

When stock <= low_stock_threshold, show orange badge in menu

In the orders view, show a "Low stock items" banner

Order history:

Add date range filter

Export orders (CSV) for accounting

Order details:

Show customer name, items, total, status, pickup code, timestamps

2.3 Stock Management
Current issues:

Stock can be set but no tracking of usage

No ability to restock (add to existing stock)

Requirements:

Add stock adjustment feature:

In menu editor, add "Add stock" button: vendor enters quantity to add

Log stock changes in a stock_logs table (for auditing)

Show stock history:

When was stock last updated? By whom? (system = auto)

2.4 Featured Items (Promotions)
Current state: Request exists, but no display on student side yet.
Requirements:

Vendor can select items to feature:

Choose priority (1-10)

Set expiry date (duration: 3, 7, 14, 30 days)

Payment info: "Coming soon: ₦5,000/week"

Submit request → featured_items table → status 'pending'

Admin approval (future):

Admin dashboard to approve featured requests

Could be integrated with payment gateway (Paystack) later

2.5 Support System
Current state: Tickets stored, vendor can view history.
Requirements:

Add ticket categories:

Technical Issue, Order Problem, Menu Help, Billing, Other

Auto-reply:

Send confirmation email to vendor when ticket submitted

Status indicators:

Open, In Progress, Resolved, Closed

🗂️ Part 3: Code Structure Improvements
3.1 Frontend Structure
Current issues:

Components are in a flat folder structure

No separation of concerns (business logic mixed with UI)

Required structure:

text
frontend/src/
├── api/               # API calls (organized by resource)
│   ├── auth.js
│   ├── orders.js
│   ├── menu.js
│   └── vendor.js
├── components/        # Reusable UI components
│   ├── common/        # Buttons, inputs, modals, toast
│   ├── vendor/        # Vendor-specific components (sidebar, header)
│   └── forms/         # Form components with validation
├── hooks/             # Custom React hooks
│   ├── useAuth.js
│   ├── useOrders.js
│   └── useMenu.js
├── pages/             # Page-level components
│   ├── Dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── OrdersView.jsx
│   │   └── MenuView.jsx
│   ├── Login/
│   ├── SignUp/
│   └── Profile/
├── contexts/          # React Context providers
│   └── AuthContext.jsx
├── utils/             # Utility functions
│   ├── formatters.js  # currency, date
│   └── validators.js
└── styles/            # Global styles & theme config
3.2 Backend Structure
Current issues:

All routes in a single index.js (hard to maintain)

Required structure:

text
backend/
├── src/
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   ├── auth.js      # verifyVendor
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── vendor.js
│   │   ├── orders.js
│   │   ├── menu.js
│   │   ├── categories.js
│   │   ├── keywords.js
│   │   ├── featured.js
│   │   └── support.js
│   ├── controllers/
│   │   └── (logic for each route)
│   ├── services/
│   │   └── (business logic: stock, email, etc.)
│   └── index.js         # App entry
├── package.json
└── .env
3.3 Type Safety (Optional but recommended)
Add TypeScript to both frontend and backend

Define shared types in a types/ folder (e.g., Vendor, Order, MenuItem)

📚 Part 4: README & Change Tracking
4.1 README.md Template
Create a comprehensive README.md at the root of the project with these sections:

markdown
# 🍽️ Cravio Marketplace

**Cravio** is a food ordering platform built for Nigerian university campuses. It connects students with campus vendors, allowing them to order food ahead, skip the queue, and get real-time updates.

**Links:**  
- **Live App:** [https://cravio-marketplace.vercel.app](https://cravio-marketplace.vercel.app)  
- **Backend API:** [https://cravio-marketplace.onrender.com](https://cravio-marketplace.onrender.com)  
- **Supabase Studio:** [Link to your project]  
- **GitHub:** [https://github.com/fataiadams04/Cravio-marketplace](https://github.com/fataiadams04/Cravio-marketplace)

---

## 🚀 Features

### Vendor Dashboard
- [x] Login & Sign-up with admin approval flow
- [x] Real-time order management (accept, ready, complete)
- [x] Menu management with stock, categories, variations
- [x] Order statistics & activity feed
- [x] Bulk menu upload (CSV)
- [x] Auto-categorisation (keyword rules)
- [x] Featured item requests
- [x] Support tickets with history

### Student App (Coming Soon)
- [ ] Browse restaurants by category & meal time
- [ ] View menu with stock & variations
- [ ] Place orders with real-time pickup codes
- [ ] Order history & tracking

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Deployment | Render (backend) + Vercel (frontend) |
| Email/SMS | Formspree + Twilio (future) |

---

## 🏗️ Project Structure
cravio-marketplace/
├── backend/ # Node.js/Express API
│ ├── src/
│ │ ├── config/ # Supabase client
│ │ ├── middleware/ # Auth, error handling
│ │ ├── routes/ # API endpoints
│ │ ├── controllers/ # Business logic
│ │ └── services/ # Reusable services
│ ├── .env
│ └── package.json
├── frontend/ # React/Vite app
│ ├── src/
│ │ ├── api/ # API calls
│ │ ├── components/ # Reusable UI
│ │ ├── hooks/ # Custom hooks
│ │ ├── pages/ # Page components
│ │ └── utils/ # Helpers
│ └── .env
├── supabase/ # Database migrations
│ └── migrations/
├── README.md
└── CHANGELOG.md

text

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v20+)
- PostgreSQL (or Supabase account)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/fataiadams04/Cravio-marketplace.git
cd Cravio-marketplace
2. Backend setup
bash
cd backend
npm install
cp .env.example .env
# Fill in your Supabase keys, Formspree ID, etc.
npm run dev
3. Frontend setup
bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_API_URL, VITE_SUPABASE_URL, etc.
npm run dev
4. Database setup
Run migrations in Supabase SQL Editor or use the supabase/ folder.

5. Environment variables
Backend (.env)
text
PORT=5000
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FORMSPREE_ID=your_formspree_id
JWT_SECRET=your_jwt_secret
Frontend (.env)
text
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
🚀 Deployment
Backend (Render)
Push to GitHub.

Connect your repo on Render.

Set Build Command: cd backend && npm install

Set Start Command: cd backend && npm start

Add environment variables.

Deploy.

Frontend (Vercel)
Push to GitHub.

Connect your repo on Vercel.

Set environment variables (see above).

Deploy.

📊 Database Schema
See supabase/migrations/20250617000000_init.sql for the complete schema.

Key tables:

vendors – Restaurant accounts

menu_items – Food items with stock & categories

item_variants – Variations (Small, Large, etc.)

orders – Customer orders

vendor_categories – Custom categories per vendor

keyword_mappings – Auto-categorisation rules

featured_items – Promotion requests

support_tickets – Vendor support

🤝 Contributing
Fork the repository.

Create your feature branch: git checkout -b feature/amazing-feature

Commit your changes: git commit -m 'Add amazing feature'

Push: git push origin feature/amazing-feature

Open a Pull Request.

📝 Changelog
See CHANGELOG.md for version history.

📄 License
MIT © Cravio Marketplace

📬 Contact
Creator: Fatai Adams

Email: [your email]

Twitter: [your handle]

GitHub: fataiadams04

text

---

### 4.2 CHANGELOG.md Template

Create a `CHANGELOG.md` to track changes:

```markdown
# Changelog

All notable changes to the Cravio Marketplace project will be documented in this file.

## [Unreleased]

### Added
- [ ] Student side (browse restaurants, order food)

### Changed
- [ ] Refactor backend to modular structure

### Fixed
- [ ] Login flow for pending vendors

---

## [v2.0.0] - 2025-06-17

### Added
- Vendor sign-up with admin approval
- Stock management with low stock alerts
- Item variations (Small, Large)
- Auto-categorisation via keyword rules
- Featured items requests
- Support tickets system
- Bulk CSV menu upload
- Real-time order updates

### Changed
- Complete UI redesign (orange theme)
- Sidebar navigation with Profile, Categories, Featured
- Improved empty states with illustrations

### Fixed
- CORS errors on deployed environment
- Environment variable handling
- RLS policies for all tables

---

## [v1.0.0] - 2025-05-20

### Added
- Initial vendor dashboard
- Basic CRUD for menu
- Order management (accept, ready, complete)
- Supabase database integration
- Render & Vercel deployment

---

## Format Guide

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.
4.3 .env.example Files
Backend .env.example
env
PORT=5000
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FORMSPREE_ID=your_formspree_id
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-vercel-app.vercel.app
NODE_ENV=development
Frontend .env.example
env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
✅ Deliverable Checklist
After implementing this, you should have:

☑ README.md with full project documentation
☑ CHANGELOG.md for version tracking
☑ .env.example files for both backend and frontend
☑ Modular backend structure (routes/controllers/services)
☑ Modular frontend structure (components/hooks/pages)
☑ UI redesigned with orange theme and better hierarchy
☑ All features completed: vendor onboarding, stock management, featured items, support
☑ Empty states improved
☑ Mobile responsiveness
☑ Code documentation (JSDoc comments in key files)
