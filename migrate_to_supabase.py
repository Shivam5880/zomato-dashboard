import pandas as pd
import numpy as np
import math
from supabase import create_client

SUPABASE_URL = "https://rzqjpwfajoxjnersjhwt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cWpwd2Zham94am5lcnNqaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODYxNDEsImV4cCI6MjA5Nzc2MjE0MX0.KTluz80HVcJNtqQcg7umcZ2gnK1Nw7JKfMII3hUVe4w"

METRICS_CSV = "C:/Users/Admin/Desktop/Extrawork/Command_Code_Zomato_detailed_report/unpivoted_output.csv"
ORDERS_CSV  = "C:/Users/Admin/Desktop/Extrawork/Command_Code_Zomato_Order_Data/orders_exploded.csv"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_records(df):
    """Remove all NaN, inf, -inf values from dataframe"""
    df = df.replace([np.inf, -np.inf], None)
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient="records")
    for i, rec in enumerate(records):
        for k, v in rec.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                records[i][k] = None
    return records

print("=" * 55)
print("  Zomato Dashboard — Supabase Migration")
print("=" * 55)

# ── 1. Metrics ──────────────────────────────────────────
print("\n[1/2] Loading metrics CSV...")
df = pd.read_csv(METRICS_CSV)
df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
df.columns = [c.lower().replace(" ", "_").replace("(", "").replace(")", "") for c in df.columns]
print("  Columns:", list(df.columns))
records = clean_records(df)
print(f"  ✓ {len(records):,} rows cleaned")

print("  Pushing to Supabase...")
batch = 500
for i in range(0, len(records), batch):
    supabase.table("zomato_metrics").upsert(records[i:i+batch]).execute()
    print(f"    Uploaded {min(i+batch, len(records)):,} / {len(records):,} rows")
print("  ✓ zomato_metrics done!")

# ── 2. Orders ───────────────────────────────────────────
print("\n[2/2] Loading orders CSV...")
df2 = pd.read_csv(ORDERS_CSV)
df2["Order Placed At"] = pd.to_datetime(df2["Order Placed At"]).dt.strftime("%Y-%m-%d %H:%M:%S")
df2.columns = [
    c.lower().replace(" ", "_").replace("(", "").replace(")", "")
     .replace("/", "_").replace("-", "_").replace("+", "plus")
     .replace("%", "pct").replace(",", "").replace("&", "and")
    for c in df2.columns
]
print("  Columns:", list(df2.columns))
records2 = clean_records(df2)
print(f"  ✓ {len(records2):,} rows cleaned")

print("  Pushing to Supabase...")
for i in range(0, len(records2), batch):
    supabase.table("zomato_orders").upsert(records2[i:i+batch]).execute()
    print(f"    Uploaded {min(i+batch, len(records2)):,} / {len(records2):,} rows")
print("  ✓ zomato_orders done!")

print("\n✅ Migration complete!")