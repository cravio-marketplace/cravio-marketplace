# 🍽️ Cravio Marketplace

**Cravio** is a food ordering platform built for Nigerian university campuses.
It connects students with campus vendors, letting them order food ahead, skip
the queue, and get real-time updates.

**Links**
- **Live App:** https://cravio-marketplace.vercel.app
- **Backend API:** https://cravio-marketplace.onrender.com
- **Supabase Studio:** (your project URL)
- **GitHub:** https://github.com/fataiadams04/Cravio-marketplace

---

## 🚀 Features

### Vendor Dashboard
- [x] Login & sign-up with admin approval flow
- [x] Real-time order management (accept → ready → complete)
- [x] Menu management with stock, categories, variations
- [x] Hero stats: today's revenue, total orders, pending actions, active orders
- [x] Bulk menu upload (CSV)
- [x] Auto-categorisation via keyword rules
- [x] Featured item requests (priority 1-10, expiry 3-30 days)
- [x] Support tickets with categories + status flow
- [x] Stock auto-decrement + low-stock alerts + restock + audit log
- [x] Order history with date/status filter and CSV export
- [x] Restaurant profile with cover, logo, verification badge, tabbed sections
- [x] Settings (Profile, Password, Notifications, Payout placeholder, Danger zone)

### Student App (Coming Soon)
- [ ] Browse restaurants by category & meal time
- [ ] View menu with stock & variations
- [ ] Place orders with real-time pickup codes
- [ ] Order history & tracking

---

## 📦 Tech Stack

| Layer       | Technology                           |
|-------------|--------------------------------------|
| Frontend    | React + Vite + Tailwind CSS          |
| Backend     | Node.js + Express                    |
| Database    | Supabase (PostgreSQL)                |
| Auth        | Supabase Auth                        |
| Storage     | Supabase Storage                     |
| Realtime    | Supabase Realtime (postgres_changes) |
| Deployment  | Render (backend) + Vercel (frontend) |
| Email       | Formspree (admin notifications)      |

---

## 🏗️ Project Structure

```
cravio-marketplace/
├── backend/                       # Node.js / Express API
│   ├── src/
│   │   ├── config/                # Supabase client
│   │   ├── middleware/            # auth (verifyVendor), error handler
│   │   ├── routes/                # one file per resource
│   │   ├── controllers/           # request handlers, one per resource
│   │   ├── services/              # business logic (stock, notifications, categories)
│   │   └── index.js               # app entry
│   ├── .env.example
│   └── package.json
├── frontend/                      # React / Vite app
│   ├── src/
│   │   ├── api/                   # API client + per-resource modules
│   │   ├── components/
│   │   │   ├── common/            # Button, Input, Modal, Card, Badge, etc.
│   │   │   └── vendor/            # Sidebar, Header, OrdersView, MenuGrid, …
│   │   ├── contexts/              # AuthContext
│   │   ├── hooks/                 # useOrders, useMenu
│   │   ├── pages/                 # Login, SignUp, VerifyPending, Dashboard/
│   │   ├── utils/                 # formatters, validators, constants
│   │   ├── App.jsx
│   │   └── index.css
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 20250617000000_init.sql
├── README.md
└── CHANGELOG.md
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v20+)
- A Supabase project (free tier is fine)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/fataiadams04/Cravio-marketplace.git
cd Cravio-marketplace
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

### 4. Database setup
Open `supabase/migrations/20250617000000_init.sql` in the Supabase SQL
Editor and run it. The script creates the tables, RLS policies, realtime
publication, and the `handle_new_vendor` trigger.

### 5. Environment variables

**Backend (`backend/.env`)**
```env
PORT=5000
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FORMSPREE_ID=your_formspree_id
FRONTEND_URL=http://localhost:5173
JWT_SECRET=any_long_random_string
NODE_ENV=development
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🚀 Deployment

### Backend (Render)
1. Push your repo to GitHub.
2. Create a new Web Service on Render pointing at the `backend/` folder.
3. Build command: `cd backend && npm install`
4. Start command: `cd backend && npm start`
5. Add the environment variables listed above.
6. Deploy.

### Frontend (Vercel)
1. Import the repo into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Add `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`
   in the project settings.
4. Deploy.

---

## 📊 Database Schema

See `supabase/migrations/20250617000000_init.sql` for the full schema.

**Key tables**
- `vendors` – Restaurant accounts (status, verification, hours, images)
- `menu_items` – Food items with stock, low-stock threshold, meal times
- `item_variants` – Variations (Small / Large / etc.)
- `orders` – Customer orders
- `vendor_categories` – Custom categories per vendor
- `keyword_mappings` – Auto-categorisation rules
- `featured_items` – Promotion requests
- `support_tickets` – Vendor support with category + status
- `stock_logs` – Audit trail of stock changes (manual + auto)

---

## 🧪 Admin Tasks (manual for now)

Until we ship an admin web UI, admin work happens in the Supabase Studio:

- **Approve a vendor:** set `vendors.verification_status = 'open'`
- **Reject a vendor:** set `verification_status = 'rejected'` and add the
  reason in `rejected_reason`
- **Approve a featured request:** set `featured_items.status = 'approved'`

---

## 🤝 Contributing

1. Fork the repository.
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request.

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

---

## 📄 License

MIT © Cravio Marketplace

---

## 📬 Contact

Creator: Fatai Adams
GitHub: [@fataiadams04](https://github.com/fataiadams04)
