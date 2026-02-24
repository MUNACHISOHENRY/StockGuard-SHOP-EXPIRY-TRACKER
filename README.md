# 🛡️ StockGuard — Shop Expiry Tracker

**Reduce waste, maximize profits.** StockGuard is a smart inventory management platform designed specifically for retail shops to track product expiration dates using AI and real-time cloud synchronization.

<div align="center">
  <img src="./public/assets/logo.png" alt="StockGuard Logo" width="250" />
</div>

## ✨ Key Features

- **🤖 AI Smart Scan**: Upload a product photo to automatically detect product names, categories, and estimated shelf life using Google Gemini AI.
- **☁️ Firebase Real-time Sync**: Your inventory is always up-to-date across all devices with Firestore integration.
- **📦 Offline Persistence**: Keeps working even without an internet connection using local storage fallback.
- **📊 Interactive Dashboard**: Visual insights into total stock value, expiring items, and inventory distribution.
- **🔔 Smart Alerts**: Visual notifications and badges for items expiring within 3 days or already expired.
- **📱 Responsive Design**: Fully optimized for mobile, tablet, and desktop viewports.
- **📄 CSV Export**: Export your entire inventory to CSV for accounting or external management.

## 🚀 Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend/Database**: Firebase Firestore
- **AI Engine**: Google Gemini Pro Vision (via `@google/genai`)

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- A Google AI Studio API Key (for Smart Scan)
- A Firebase Project (for cloud sync)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MUNACHISOHENRY/StockGuard-SHOP-EXPIRY-TRACKER.git
   cd StockGuard-SHOP-EXPIRY-TRACKER
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your credentials:
   ```env
   GEMINI_API_KEY=your_gemini_key_here
   
   # Firebase Config
   FIREBASE_API_KEY=your_key
   FIREBASE_AUTH_DOMAIN=your_domain
   FIREBASE_PROJECT_ID=your_id
   FIREBASE_STORAGE_BUCKET=your_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📸 Screenshots

*The app features a modern, indigo-themed interface with glassmorphism effects and staggered entrance animations.*

---

Developed with ❤️ for smart retailers.
