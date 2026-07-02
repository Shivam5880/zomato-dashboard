"""
migrate_to_supabase.py
======================
Pushes your two processed CSVs into Supabase Postgres.
Run this ONCE. Re-run whenever you have fresh data (it clears and reloads).

Usage:
    pip install pandas psycopg2-binary sqlalchemy
    python migrate_to_supabase.py

Fill in your Supabase credentials below (from Supabase → Settings → Database → URI).
"""

import pandas as pd
from sqlalchemy import create_engine, text

# ─────────────────────────────────────────
# YOUR SUPABASE CONNECTION — fill these in
# ─────────────────────────────────────────
SUPABASE_HOST     = "db.xxxxxxxxxxxx.supabase.co"   # from Supabase → Settings → Database
SUPABASE_PORT     = "5432"
SUPABASE_DB       = "postgres"
SUPABASE_USER     = "postgres"
SUPABASE_PASSWORD = "your_password_here"             # your Supabase DB password

# ─────────────────────────────────────────
# CSV PATHS — adjust if files are elsewhere
# ─────────────────────────────────────────
METRICS_CSV = "unpivoted_output.csv"
ORDERS_CSV  = "orders_exploded.csv"

# ─────────────────────────────────────────────────────────
# DO NOT EDIT BELOW THIS LINE
# ─────────────────────────────────────────────────────────

conn_str = (
    f"postgresql://{SUPABASE_USER}:{SUPABASE_PASSWORD}"
    f"@{SUPABASE_HOST}:{SUPABASE_PORT}/{SUPABASE_DB}"
)

print("=" * 55)
print("  Zomato Dashboard — Supabase Migration")
print("=" * 55)

engine = create_engine(conn_str)

# ── 1. Metrics table ──────────────────────────────────────
print("\n[1/2] Loading metrics CSV...")
df_metrics = pd.read_csv(METRICS_CSV)
df_metrics["Date"] = pd.to_datetime(df_metrics["Date"])
df_metrics.columns = [c.lower().replace(" ", "_").replace("(", "").replace(")", "") for c in df_metrics.columns]
print(f"  ✓ {len(df_metrics):,} rows loaded")

print("  Pushing to Supabase table: zomato_metrics ...")
with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS zomato_metrics CASCADE"))
df_metrics.to_sql("zomato_metrics", engine, if_exists="replace", index=False)
print(f"  ✓ zomato_metrics created ({len(df_metrics):,} rows)")

# ── 2. Orders table ───────────────────────────────────────
print("\n[2/2] Loading orders CSV...")
df_orders = pd.read_csv(ORDERS_CSV)
df_orders["Order Placed At"] = pd.to_datetime(df_orders["Order Placed At"])
df_orders.columns = [
    c.lower()
     .replace(" ", "_")
     .replace("(", "")
     .replace(")", "")
     .replace("/", "_")
     .replace("-", "_")
     .replace("+", "plus")
     .replace("%", "pct")
     .replace(",", "")
    for c in df_orders.columns
]
print(f"  ✓ {len(df_orders):,} rows loaded")

print("  Pushing to Supabase table: zomato_orders ...")
with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS zomato_orders CASCADE"))
df_orders.to_sql("zomato_orders", engine, if_exists="replace", index=False)
print(f"  ✓ zomato_orders created ({len(df_orders):,} rows)")

# ── 3. Verify ─────────────────────────────────────────────
print("\n[Verify] Row counts in Supabase:")
with engine.connect() as conn:
    r1 = conn.execute(text("SELECT COUNT(*) FROM zomato_metrics")).scalar()
    r2 = conn.execute(text("SELECT COUNT(*) FROM zomato_orders")).scalar()
    brands = conn.execute(text("SELECT DISTINCT restaurant_name FROM zomato_metrics ORDER BY 1")).fetchall()

print(f"  zomato_metrics : {r1:,} rows")
print(f"  zomato_orders  : {r2:,} rows")
print(f"  Brands found   : {[b[0] for b in brands]}")
print("\n✅ Migration complete! You can now start the dashboard.")
