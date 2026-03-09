# 🛡️ StockGuard — Shop Expiry Tracker

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](#-pwa-support)

**Reduce waste, maximize profits.** StockGuard is a smart inventory management app for retail shops to track product expiration dates, get alerts for expiring items, and optionally use AI to scan products.

<div align="center">
  <img src="./public/assets/logo.png" alt="StockGuard Logo" width="200" />
</div>

---

## ✨ Features

- 📊 **Interactive Dashboard** — Visual insights into total stock value, expiring items, and inventory distribution with animated charts
- 🔔 **Smart Alerts** — Real-time notifications for items expiring within 3 days or already expired
- 📦 **Full CRUD Inventory** — Add, edit, delete, and search products with a multi-step form wizard
- 🤖 **AI Smart Scan** *(optional)* — Upload a product photo to auto-detect name, category, and shelf life using Google Gemini AI
- 💾 **localStorage Persistence** — All data persists in the browser. No database setup required
- 📱 **Fully Responsive** — Optimized for mobile, tablet, and desktop with a collapsible sidebar
- 📲 **PWA Installable** — Install on your phone or desktop for an app-like experience
- 🎨 **Premium UI** — Modern indigo-themed interface with glassmorphism, smooth animations, and toast notifications

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/MUNACHISOHENRY/StockGuard-SHOP-EXPIRY-TRACKER.git
cd StockGuard-SHOP-EXPIRY-TRACKER

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app loads with **10 sample products** ready to explore. No accounts, no configuration needed.

## 🤖 AI Smart Scan (Optional)

The AI-powered product scanner requires a separate backend server with a Google Gemini API key.

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Install backend dependencies
npm install

# 3. Create a .env file with your API key
echo GEMINI_API_KEY=your_key_here > .env

# 4. Start the backend
node server.js
```

When the backend is running, the "AI Smart Scan" panel in the Add Item form automatically activates. When offline, it shows a helpful disabled state instead of errors.

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS (CDN), Custom animations |
| **State** | React Query (TanStack), localStorage |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **AI Backend** | Node.js, Express, Google Gemini |
| **Testing** | Vitest (unit), Playwright (E2E) |

## 📁 Project Structure

```
stockguard/
├── components/          # React UI components
│   ├── AddItem.tsx      # Multi-step product form with AI scan
│   ├── Dashboard.tsx    # Overview charts and stats
│   ├── InventoryList.tsx # Virtualized product list
│   ├── ProductDetails.tsx # Product detail view
│   └── layouts/
│       └── MainLayout.tsx # Sidebar, header, toast system
├── pages/               # Route-level page components
├── hooks/               # Custom React hooks
│   ├── useProducts.ts   # Product data fetching (localStorage)
│   └── useMutateProducts.ts # CRUD mutations
├── services/
│   └── geminiService.ts # AI backend API client
├── schemas/             # Zod validation schemas
├── backend/             # Express + Gemini AI server
├── tests/               # Playwright E2E tests
├── mockData.ts          # Sample inventory data
├── types.ts             # TypeScript interfaces
└── App.tsx              # Route definitions
```

## 📸 Screenshots

*Coming soon — the app features a modern indigo-themed interface with glassmorphism effects, animated charts, and a multi-step product wizard.*

---

Built with ❤️ for smart retailers.
