# Zomato Dashboard

Custom analytics dashboard for Zomato delivery data.
Built with Next.js + Supabase + Vercel. **Total cost: ₹0/month.**

---

## Stack

| Layer    | Tool            | Cost          |
|----------|-----------------|---------------|
| Database | Supabase Postgres | Free (500MB) |
| Backend  | Next.js API routes | Free        |
| Frontend | React (Next.js) | Free          |
| Hosting  | Vercel          | Free          |

---

## One-time setup (30 minutes total)

### Step 1 — Supabase (5 min)

1. Go to https://supabase.com → sign up → **New project**
2. Choose a name (e.g. `zomato-data`), set a strong password, pick region **South Asia (Mumbai)**
3. Wait ~2 min for the project to start
4. Go to **Settings → Database** → copy the **Connection string (URI)**
5. Go to **Settings → API** → copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2 — Migrate your data (5 min)

1. Put `unpivoted_output.csv` and `orders_exploded.csv` in the same folder as `migrate_to_supabase.py`
2. Open `migrate_to_supabase.py` and fill in:
   ```
   SUPABASE_HOST     = "db.xxxx.supabase.co"   ← from connection string
   SUPABASE_PASSWORD = "your_password"
   ```
3. Run:
   ```bash
   pip install pandas psycopg2-binary sqlalchemy
   python migrate_to_supabase.py
   ```
4. You should see: `✅ Migration complete!`

### Step 3 — Run locally to test (5 min)

```bash
cd zomato-dashboard
cp .env.example .env.local
# Edit .env.local and paste your Supabase URL and anon key

npm install
npm run dev
```

Open http://localhost:3000 — your dashboard should load with data.

### Step 4 — Deploy to Vercel (10 min)

1. Push this folder to a **GitHub repo** (can be private)
   ```bash
   git init
   git add .
   git commit -m "initial dashboard"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/zomato-dashboard.git
   git push -u origin main
   ```

2. Go to https://vercel.com → sign up with GitHub → **New Project** → import your repo

3. In Vercel's environment variables section, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
   ```

4. Click **Deploy** — done in ~2 minutes

5. Vercel gives you a URL like `https://zomato-dashboard-abc.vercel.app` — share this with anyone

---

## Adding new data

When you have a new month of data:

```bash
# 1. Run your ETL scripts to generate fresh CSVs
python zomato_etl_automation.py --input "new_report.csv" --output unpivoted_output.csv
python zomato_orders_etl.py --input "new_orders.csv" --output orders_exploded.csv

# 2. Re-run migration (clears old data and reloads)
python migrate_to_supabase.py
```

The live dashboard updates automatically — no redeploy needed.

---

## Adding Swiggy data later

1. Your Swiggy ETL (`process_swiggy.py`) already produces a clean CSV
2. We add a `swiggy_orders` table to Supabase
3. Update `lib/data.js` to query both tables and merge metrics
4. The dashboard filters will automatically include Swiggy brands

---

## Adding more tabs (Sales, Discounts, Ads, Operations, Menu)

In `pages/index.js`, find the section:
```js
{activeTab !== 'brand_details' && (
  <div>🚧 Coming soon</div>
)}
```

Replace with your tab component — same pattern as `BrandDetailsTab`.
Each tab uses the same filters (brand, date range, compare period).

---

## File structure

```
zomato-dashboard/
├── lib/
│   ├── supabase.js      ← Supabase client
│   └── data.js          ← All metric queries and calculations
├── pages/
│   ├── _app.js
│   └── index.js         ← Main dashboard UI
├── styles/
│   └── globals.css
├── migrate_to_supabase.py  ← Run once to load data
├── .env.example            ← Copy to .env.local and fill in
├── package.json
└── README.md
```
