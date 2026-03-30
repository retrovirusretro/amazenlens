# AmazenLens — Amazon Research Platform

> All-in-one SaaS research platform for Amazon sellers — keyword analysis, niche scoring, stock tracking, trend radar, and more.

**Live:** [amazenlens.com](https://amazenlens.com) &nbsp;|&nbsp; **API:** [amazenlens-production.up.railway.app](https://amazenlens-production.up.railway.app/docs)

---

## What is AmazenLens?

AmazenLens combines the best features of Helium 10, Jungle Scout, and SmartScout into one affordable platform — with a unique focus on Turkish-language support and Trendyol arbitrage opportunities.

### Key Features

| Feature | Description |
|---------|-------------|
| **Product Search** | Keyword-based Amazon product search with instant results |
| **Niche Score** | 100-point algorithm measuring demand, competition, and opportunity |
| **Keyword Analyzer** | Search volume, difficulty score, multi-market analysis (US/DE/FR/TR/ES) |
| **Trend Radar** | Google Trends integration with seasonal forecasting |
| **Stock Scanner** | Track out-of-stock ASINs and catch restock opportunities |
| **Global Arbitrage** | Cross-market price gap discovery |
| **Supplier Sourcing** | Alibaba & Turkish supplier research |
| **Bulk Import** | CSV/Excel ASIN batch analysis |
| **Rank Tracker** | Monitor ASIN keyword ranking over time |
| **AI Love/Hate** | Claude-powered review sentiment analysis |
| **Chrome Extension** | Niche score overlay directly on Amazon.com |

### Why AmazenLens?

| | AmazenLens | Helium 10 | Jungle Scout |
|--|--|--|--|
| **Price** | $19/mo | $97/mo | $49/mo |
| **Turkish Language** | ✅ | ❌ | ❌ |
| **Trendyol Arbitrage** | ✅ | ❌ | ❌ |
| **5 Languages** | ✅ TR/EN/DE/FR/ES | ❌ | ❌ |
| **Chrome Extension** | ✅ | ✅ | ✅ |
| **AI Analysis** | ✅ Claude API | Basic | Basic |

---

## Pricing

| Plan | Price | Searches/Month |
|------|-------|----------------|
| Free | $0 | 5 |
| Starter | $19/mo | 50 |
| Pro | $49/mo | 200 |
| Agency | $99/mo | Unlimited |

7-day free trial — no credit card required.

---

## Tech Stack

- **Backend:** Python 3.11 + FastAPI — Railway
- **Frontend:** React 19 + Vite + i18next — Vercel
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth + Google/GitHub OAuth
- **Payments:** Stripe (subscriptions + webhooks)
- **AI:** Anthropic Claude API
- **Data:** Keepa API + ScraperAPI
- **Extension:** Chrome MV3 (WXT framework)

---

## Project Structure

```
amazenlens/
├── backend/          # Python FastAPI — routers, services
├── frontend/         # React + Vite — pages, components
├── extension/        # Chrome MV3 extension (WXT)
└── playwright-worker/ # Trendyol scraping worker
```

---

## Local Development

### Prerequisites
- Python 3.11
- Node.js 18+
- Supabase account
- Stripe account (test mode)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in your keys
py main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Chrome Extension
```bash
cd extension
npm install
npm run build
# Load .output/chrome-mv3 in Chrome Extensions (Developer Mode)
```

---

## Environment Variables

See `backend/.env` (not committed). Required keys:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
KEEPA_API_KEY
SCRAPERAPI_KEY
FRONTEND_URL
```

Frontend (Vercel):
```
VITE_API_URL=https://amazenlens-production.up.railway.app
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Investment Targets

- TÜBİTAK BiGG: 900K TL
- KOSGEB: 375K TL
- EIC Accelerator: €2.5M
- Y Combinator: $500K

---

## License

Proprietary — All rights reserved.
